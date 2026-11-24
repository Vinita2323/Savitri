import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import BulkImport from '../models/BulkImport.model.js';
import BulkImportRow from '../models/BulkImportRow.model.js';
import Seller from '../models/Seller.model.js';
import { hasRegistrationFeeCleared, isSellerApproved } from '../utils/sellerEligibility.js';
import { getScopedSellerIds } from '../middleware/scopeMiddleware.js';
import { COLUMNS, LIMITS, TEMP_ROOT } from '../services/bulkProducts/constants.js';
import { buildCsvTemplate, buildXlsxTemplate, loadTemplateLists, safeCsvCell } from '../services/bulkProducts/template.js';
import { runImport, runValidation } from '../services/bulkProducts/runner.js';

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const rmDir = (dir) => (dir ? fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}) : Promise.resolve());

/** Only an approved seller who has cleared the registration fee may publish. The id always comes from the login token. */
const loadActiveSeller = async (req, res) => {
  const seller = await Seller.findById(req.user.id).select('businessName ownerName brandId status accountStatus registrationFeeStatus').lean();
  if (!seller) { fail(res, 404, 'Seller not found'); return null; }
  if (!isSellerApproved(seller)) { fail(res, 403, 'Your seller account is not approved and active, so bulk upload is not available.'); return null; }
  if (!hasRegistrationFeeCleared(seller)) { fail(res, 403, 'Complete your registration fee before uploading products.'); return null; }
  return seller;
};

// ═════════════════ template ═════════════════

export const downloadTemplate = async (req, res) => {
  try {
    const lists = await loadTemplateLists(req.user.id);
    if (String(req.query.format).toLowerCase() === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="product-bulk-upload-template.csv"');
      return res.send(buildCsvTemplate(lists));
    }
    const buf = await buildXlsxTemplate(lists);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-bulk-upload-template.xlsx"');
    return res.send(Buffer.from(buf));
  } catch (err) {
    console.error('[BulkProducts] template failed:', err);
    return fail(res, 500, 'Could not build the template.');
  }
};

// ═════════════════ upload + validate ═════════════════

/** multer destination: every upload gets its own staging folder outside the public uploads directory. */
export const stagingDestination = (req, file, cb) => {
  try {
    if (!req.stagingDir) {
      req.stagingDir = path.join(TEMP_ROOT, crypto.randomBytes(12).toString('hex'));
      fs.mkdirSync(req.stagingDir, { recursive: true });
    }
    cb(null, req.stagingDir);
  } catch (e) { cb(e); }
};
export const stagingFilename = (req, file, cb) => cb(null, file.fieldname === 'images' ? 'images.zip' : `data${path.extname(file.originalname || '').toLowerCase()}`);

const startsWith = async (file, bytes) => {
  const fh = await fs.promises.open(file, 'r');
  try { const b = Buffer.alloc(bytes.length); await fh.read(b, 0, bytes.length, 0); return b.equals(Buffer.from(bytes)); } finally { await fh.close(); }
};
const looksLikeText = async (file) => {
  const fh = await fs.promises.open(file, 'r');
  try { const b = Buffer.alloc(4096); const { bytesRead } = await fh.read(b, 0, 4096, 0); return !b.subarray(0, bytesRead).includes(0); } finally { await fh.close(); }
};

export const uploadBulk = async (req, res) => {
  const dir = req.stagingDir;
  const abort = async (status, message, extra) => { await rmDir(dir); return fail(res, status, message, extra); };
  try {
    const seller = await loadActiveSeller(req, res);
    if (!seller) return rmDir(dir);
    const dataFile = req.files?.file?.[0];
    const zipFile = req.files?.images?.[0];
    if (!dataFile) return abort(400, 'Choose an Excel (.xlsx) or CSV file to upload.');

    const ext = path.extname(dataFile.originalname || '').toLowerCase();
    if (!['.xlsx', '.csv'].includes(ext)) return abort(400, 'The product file must be .xlsx or .csv. Download the template to start.');
    if (dataFile.size > LIMITS.maxSheetBytes) return abort(400, 'The product file is larger than 10 MB. Split it into smaller files.');
    if (ext === '.xlsx' && !(await startsWith(dataFile.path, [0x50, 0x4b, 0x03, 0x04]))) return abort(400, 'This is not a valid .xlsx file.');
    if (ext === '.csv' && !(await looksLikeText(dataFile.path))) return abort(400, 'This is not a valid CSV file.');
    if (zipFile) {
      if (path.extname(zipFile.originalname || '').toLowerCase() !== '.zip' || !(await startsWith(zipFile.path, [0x50, 0x4b, 0x03, 0x04]))) return abort(400, 'The images file must be a .zip archive.');
    }

    const mode = String(req.body?.mode || 'CREATE').toUpperCase() === 'UPDATE' ? 'UPDATE' : 'CREATE';

    // one upload at a time per seller
    const running = await BulkImport.findOne({ seller: seller._id, status: { $in: ['validating', 'importing'] } }).select('_id').lean();
    if (running) return abort(409, 'You already have an upload in progress. Wait for it to finish.', { importId: String(running._id) });

    // the same file imported again is almost always a double click
    const fileHash = crypto.createHash('sha256').update(await fs.promises.readFile(dataFile.path)).update(zipFile ? String(zipFile.size) : '').digest('hex');
    const dup = await BulkImport.findOne({
      seller: seller._id, fileHash, mode, status: { $in: ['validated', 'importing', 'completed', 'completed_with_errors'] }, createdAt: { $gt: new Date(Date.now() - 24 * 3600 * 1000) },
    }).select('_id status').lean();
    if (dup) return abort(409, 'This exact file was already uploaded in the last 24 hours. Open it from the upload history, or change the file to upload it again.', { importId: String(dup._id), duplicate: true });

    const imp = await BulkImport.create({
      seller: seller._id, sellerName: seller.businessName || '', brandId: seller.brandId || '', fileName: String(dataFile.originalname || '').slice(0, 200),
      imagesZipName: zipFile ? String(zipFile.originalname || '').slice(0, 200) : '', fileHash, mode, status: 'validating', phase: 'validating', startedAt: new Date(), tempDir: dir,
    });
    // respond now; the work continues in the background
    res.status(202).json({ success: true, message: 'File received. Validating…', importId: String(imp._id) });
    setImmediate(() => {
      runValidation(imp._id, { dataFile: dataFile.path, ext, zipFile: zipFile ? zipFile.path : null }).catch((e) => console.error('[BulkProducts] validation runner:', e));
    });
    return undefined;
  } catch (err) {
    console.error('[BulkProducts] upload failed:', err);
    await rmDir(dir);
    if (!res.headersSent) return fail(res, 500, 'The upload could not be processed.');
    return undefined;
  }
};

// ═════════════════ progress, preview, import ═════════════════

const ownImport = async (req, res) => {
  if (!isId(req.params.id)) { fail(res, 404, 'Upload not found'); return null; }
  // the seller id in the filter comes from the token: another seller's upload simply does not exist
  const imp = await BulkImport.findOne({ _id: req.params.id, seller: req.user.id }).lean();
  if (!imp) { fail(res, 404, 'Upload not found'); return null; }
  return imp;
};

const shapeImport = (i) => ({
  _id: i._id, fileName: i.fileName, imagesZipName: i.imagesZipName, mode: i.mode, status: i.status, phase: i.phase,
  totalRows: i.totalRows, validRows: i.validRows, invalidRows: i.invalidRows, successRows: i.successRows, failedRows: i.failedRows,
  skippedRows: i.skippedRows, publishedRows: i.publishedRows, createdRows: i.createdRows, updatedRows: i.updatedRows,
  processed: i.processed, errorSummary: i.errorSummary, startedAt: i.startedAt, finishedAt: i.finishedAt, createdAt: i.createdAt, expiresAt: i.expiresAt,
  sellerName: i.sellerName, seller: i.seller,
});

export const getImportStatus = async (req, res) => {
  const imp = await ownImport(req, res);
  if (!imp) return undefined;
  return res.json({ success: true, import: shapeImport(imp) });
};

const ROW_STATUS = ['valid', 'invalid', 'skipped', 'imported', 'failed'];
export const getImportRows = async (req, res) => {
  const imp = await ownImport(req, res);
  if (!imp) return undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const filter = { importId: imp._id };
  const st = String(req.query.status || '');
  if (st === 'problems') filter.status = { $in: ['invalid', 'failed'] };
  else if (ROW_STATUS.includes(st)) filter.status = st;
  const [total, rows] = await Promise.all([
    BulkImportRow.countDocuments(filter),
    BulkImportRow.find(filter).select('rowNumber raw action status problems warnings productId published').sort({ rowNumber: 1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  return res.json({ success: true, total, page, pages: Math.ceil(total / limit), rows: rows.map(({ problems, ...r }) => ({ ...r, errors: problems || [] })) });
};

export const startImport = async (req, res) => {
  try {
    const seller = await loadActiveSeller(req, res);
    if (!seller) return undefined;
    const imp = await ownImport(req, res);
    if (!imp) return undefined;
    // atomic claim: pressing Import twice (or from two tabs) can never start two runs
    const claimed = await BulkImport.findOneAndUpdate(
      { _id: imp._id, seller: seller._id, $or: [{ status: 'validated' }, { status: 'failed', failedPhase: 'importing' }] },
      { $set: { status: 'importing', phase: 'importing', processed: 0, errorSummary: '', finishedAt: null } },
      { returnDocument: 'after' }
    );
    if (!claimed) return fail(res, 409, imp.status === 'importing' ? 'This upload is already being imported.' : 'This upload cannot be imported (it is not validated, it failed while being checked, or it was already imported).');
    const pending = await BulkImportRow.countDocuments({ importId: imp._id, status: 'valid' });
    if (pending === 0) {
      await BulkImport.updateOne({ _id: imp._id }, { $set: { status: imp.invalidRows ? 'completed_with_errors' : 'completed', phase: 'idle', finishedAt: new Date() } });
      return fail(res, 400, 'There are no valid rows to import. Fix the errors and upload the file again.');
    }
    res.status(202).json({ success: true, message: 'Import started.', importId: String(imp._id), pending });
    setImmediate(() => runImport(imp._id).catch((e) => console.error('[BulkProducts] import runner:', e)));
    return undefined;
  } catch (err) {
    console.error('[BulkProducts] start import failed:', err);
    return fail(res, 500, 'Could not start the import.');
  }
};

export const listMyImports = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
  const filter = { seller: req.user.id, status: { $ne: 'discarded' } };
  const [total, items] = await Promise.all([BulkImport.countDocuments(filter), BulkImport.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
  return res.json({ success: true, total, page, pages: Math.ceil(total / limit), imports: items.map(shapeImport) });
};

export const discardImport = async (req, res) => {
  const imp = await ownImport(req, res);
  if (!imp) return undefined;
  if (imp.status === 'importing' || imp.status === 'validating') return fail(res, 409, 'Wait for the running step to finish first.');
  if (!['validated', 'failed'].includes(imp.status)) return fail(res, 409, 'Only a validated or failed upload can be discarded.');
  await BulkImport.updateOne({ _id: imp._id }, { $set: { status: 'discarded', phase: 'idle', finishedAt: new Date() } });
  await BulkImportRow.deleteMany({ importId: imp._id });
  await rmDir(imp.tempDir);
  return res.json({ success: true });
};

// ═════════════════ reports ═════════════════

const reportColumns = (rows) => (rows.some((r) => r.raw && r.raw.productId) ? [...COLUMNS, 'productId'] : COLUMNS);

/** Failed rows: the original columns plus an `error` column. The same file can be uploaded again after fixing it. */
const sendRows = async (res, rows, { format, fileBase, withStatus }) => {
  const cols = reportColumns(rows);
  const header = [...(withStatus ? ['row', 'result'] : []), ...cols, 'error'];
  const line = (r) => [...(withStatus ? [r.rowNumber, r.status] : []), ...cols.map((c) => (r.raw ? r.raw[c] ?? '' : '')), [...(r.problems || [])].join('; ')];
  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Products');
    ws.addRow(header);
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(line(r).map((v) => (v === null || v === undefined ? '' : String(v)))));
    ws.columns.forEach((c) => { c.width = 22; });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.xlsx"`);
    return res.send(Buffer.from(await wb.xlsx.writeBuffer()));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.csv"`);
  return res.send(`﻿${[header.map(safeCsvCell).join(','), ...rows.map((r) => line(r).map(safeCsvCell).join(','))].join('\r\n')}`);
};

const reportRows = (imp, all) => BulkImportRow.find({ importId: imp._id, ...(all ? {} : { status: { $in: ['invalid', 'failed'] } }) }).sort({ rowNumber: 1 }).limit(20000).lean();

export const downloadFailedRows = async (req, res) => {
  const imp = await ownImport(req, res);
  if (!imp) return undefined;
  const rows = await reportRows(imp, false);
  if (rows.length === 0) return fail(res, 404, 'This upload has no failed rows.');
  return sendRows(res, rows, { format: String(req.query.format).toLowerCase() === 'xlsx' ? 'xlsx' : 'csv', fileBase: `failed-rows-${String(imp._id).slice(-6)}`, withStatus: false });
};

// ═════════════════ admin ═════════════════

const adminScopeFilter = async (req) => {
  const ids = await getScopedSellerIds(req.scope); // null = every seller
  return ids === null ? {} : { seller: { $in: ids } };
};

export const adminListImports = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = { ...(await adminScopeFilter(req)) };
  if (isId(req.query.sellerId)) filter.seller = isId(filter.seller?.$in?.[0]) ? { $in: filter.seller.$in.filter((x) => String(x) === String(req.query.sellerId)) } : new mongoose.Types.ObjectId(req.query.sellerId);
  if (req.query.status && req.query.status !== 'ALL') filter.status = String(req.query.status);
  if (req.query.search) filter.$or = [{ sellerName: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i') }, { fileName: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i') }];
  if (req.query.from) filter.createdAt = { ...(filter.createdAt || {}), $gte: new Date(String(req.query.from)) };
  if (req.query.to) filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(`${String(req.query.to)}T23:59:59.999Z`) };
  const [total, items] = await Promise.all([BulkImport.countDocuments(filter), BulkImport.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
  return res.json({ success: true, total, page, pages: Math.ceil(total / limit), imports: items.map(shapeImport) });
};

const adminImport = async (req, res) => {
  if (!isId(req.params.id)) { fail(res, 404, 'Upload not found'); return null; }
  const imp = await BulkImport.findOne({ _id: req.params.id, ...(await adminScopeFilter(req)) }).lean();
  if (!imp) { fail(res, 404, 'Upload not found'); return null; }
  return imp;
};

export const adminGetImport = async (req, res) => {
  const imp = await adminImport(req, res);
  if (!imp) return undefined;
  const rows = await BulkImportRow.find({ importId: imp._id, status: { $in: ['invalid', 'failed'] } }).select('rowNumber raw problems status').sort({ rowNumber: 1 }).limit(100).lean();
  return res.json({ success: true, import: shapeImport(imp), problemRows: rows.map(({ problems, ...r }) => ({ ...r, errors: problems || [] })) });
};

export const adminDownloadReport = async (req, res) => {
  const imp = await adminImport(req, res);
  if (!imp) return undefined;
  const rows = await reportRows(imp, true);
  return sendRows(res, rows, { format: String(req.query.format).toLowerCase() === 'xlsx' ? 'xlsx' : 'csv', fileBase: `import-report-${String(imp._id).slice(-6)}`, withStatus: true });
};

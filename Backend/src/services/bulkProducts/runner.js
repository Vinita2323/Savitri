import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import BulkImport from '../../models/BulkImport.model.js';
import BulkImportRow from '../../models/BulkImportRow.model.js';
import Category from '../../models/Category.model.js';
import Product from '../../models/Product.model.js';
import Seller from '../../models/Seller.model.js';
import { isSellerApproved } from '../../utils/sellerEligibility.js';
import { invalidateProductsCache } from '../../controllers/productController.js';
import { LIMITS } from './constants.js';
import { parseUpload, UploadFileError } from './parser.js';
import { validateRows } from './validator.js';
import { downloadImage, openImagesZip, storeAsWebp, zipEntryData } from './images.js';

const CI = { locale: 'en', strength: 2 }; // case-insensitive SKU matching
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const rmDir = async (dir) => { if (dir) await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}); };

const REQUIRED_CREATE = ['productName', 'SKU', 'category', 'MRP', 'sellingPrice', 'stock'];

/** Runs `worker` over `items` with at most `limit` in flight. */
const pool = async (items, limit, worker) => {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i; i += 1;
      // eslint-disable-next-line no-await-in-loop
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
};

// ═════════════════ 1. VALIDATION (background) ═════════════════

export const runValidation = async (importId, { dataFile, ext, zipFile }) => {
  const imp = await BulkImport.findById(importId);
  if (!imp) return;
  const sellerId = imp.seller;
  try {
    const buffer = await fs.promises.readFile(dataFile);
    const parsed = await parseUpload(buffer, ext);
    const have = new Set(parsed.headers);
    if (imp.mode === 'CREATE') {
      const missing = REQUIRED_CREATE.filter((c) => !have.has(c));
      if (missing.length) throw new UploadFileError(`The file is missing required column(s): ${missing.join(', ')}`);
    } else if (!have.has('SKU') && !have.has('productId')) {
      throw new UploadFileError('UPDATE needs a SKU (or productId) column to find your products');
    }
    if (parsed.rows.length === 0) throw new UploadFileError('The file has no product rows.');

    // categories (a subcategory name is accepted and mapped to its parent)
    const cats = await Category.find({ status: 'Active' }).select('name parent').lean();
    const byId = new Map(cats.map((c) => [String(c._id), c]));
    const categoryMap = new Map();
    for (const c of cats) {
      const parent = c.parent ? byId.get(String(c.parent)) : null;
      categoryMap.set(String(c.name).trim().toLowerCase().replace(/\s+/g, ' '), { name: c.name, parentName: parent ? parent.name : null });
    }

    // this seller's existing products for the SKUs / ids in the file (never anyone else's)
    const skus = [...new Set(parsed.rows.map((r) => r.values.SKU).filter(Boolean).map((s) => s.trim()))];
    const ids = [...new Set(parsed.rows.map((r) => r.values.productId).filter((x) => /^[0-9a-fA-F]{24}$/.test(x || '')))];
    const bySku = new Map();
    const byIdMap = new Map();
    const sel = '_id sku mrp salePrice stock hasVariants isReturnable returnWindow returnPolicy';
    for (let i = 0; i < skus.length; i += 500) {
      // eslint-disable-next-line no-await-in-loop
      const found = await Product.find({ sellerId, sku: { $in: skus.slice(i, i + 500) } }).collation(CI).select(sel).lean();
      found.forEach((p) => bySku.set(String(p.sku).toLowerCase(), p));
    }
    if (ids.length) {
      const found = await Product.find({ sellerId, _id: { $in: ids.map(oid) } }).select(sel).lean();
      found.forEach((p) => { byIdMap.set(String(p._id), p); bySku.set(String(p.sku || '').toLowerCase(), bySku.get(String(p.sku || '').toLowerCase()) || p); });
    }

    let zipByName = null;
    if (zipFile) zipByName = openImagesZip(zipFile).byName;
    const sheetSkus = new Set(skus.map((s) => s.toLowerCase()));

    const results = validateRows(parsed.rows, { mode: imp.mode, headers: parsed.headers, categoryMap, bySku, byId: byIdMap, zipByName, sheetSkus });

    let valid = 0; let invalid = 0; let skipped = 0;
    for (let i = 0; i < results.length; i += 500) {
      const chunk = results.slice(i, i + 500);
      // eslint-disable-next-line no-await-in-loop
      await BulkImportRow.insertMany(chunk.map((r) => ({ importId: imp._id, rowNumber: r.rowNumber, raw: r.raw, data: r.data, action: r.action, status: r.status, problems: r.errors, warnings: r.warnings })), { ordered: true });
      chunk.forEach((r) => { if (r.status === 'valid') valid += 1; else if (r.status === 'skipped') skipped += 1; else invalid += 1; });
      // eslint-disable-next-line no-await-in-loop
      await BulkImport.updateOne({ _id: imp._id }, { $set: { processed: Math.min(results.length, i + 500) } });
    }
    await BulkImport.updateOne({ _id: imp._id }, {
      $set: { status: 'validated', phase: 'idle', totalRows: results.length, validRows: valid, invalidRows: invalid, skippedRows: skipped, processed: results.length, expiresAt: new Date(Date.now() + LIMITS.validatedUploadTtlMs) },
    });
  } catch (err) {
    const message = err instanceof UploadFileError || /images ZIP/i.test(err.message) ? err.message : 'The file could not be processed. Check it against the template and try again.';
    if (!(err instanceof UploadFileError)) console.error('[BulkImport] validation failed:', err);
    await BulkImportRow.deleteMany({ importId: imp._id }).catch(() => {});
    await BulkImport.updateOne({ _id: imp._id }, { $set: { status: 'failed', failedPhase: 'validating', phase: 'idle', errorSummary: message, finishedAt: new Date() } });
    await rmDir(imp.tempDir);
  } finally {
    // the uploaded spreadsheet is no longer needed (rows are stored); the ZIP stays until the import finishes
    await fs.promises.rm(dataFile, { force: true }).catch(() => {});
  }
};

// ═════════════════ 2. IMPORT (background) ═════════════════

const publishFields = (stock, inactive) => (inactive
  ? { status: 'Draft', isPublished: false, listingStatus: 'inactive' }
  : { status: 'Published', isPublished: true, listingStatus: stock > 0 ? 'active' : 'out_of_stock' });

const resolveImages = async (refs, sellerId, zipHandle) => {
  const urls = [];
  for (const ref of refs) {
    let buf;
    if (ref.kind === 'zip') {
      if (!zipHandle) throw new Error('The images ZIP is no longer available. Upload the file again');
      buf = zipEntryData(zipHandle, ref.value);
    } else {
      try { buf = await downloadImage(ref.value); } catch (e) { throw new Error(`Image link failed (${ref.value.slice(0, 70)}): ${e.message}`); }
    }
    try { urls.push(await storeAsWebp(buf, sellerId)); } catch (e) { throw new Error(`Image "${ref.value.slice(0, 70)}": ${e.message}`); }
  }
  return urls;
};

export const runImport = async (importId) => {
  const imp = await BulkImport.findById(importId);
  if (!imp) return;
  const sellerId = imp.seller;
  let zipHandle = null;
  try {
    const seller = await Seller.findById(sellerId).select('businessName status accountStatus').lean();
    if (!seller || !isSellerApproved(seller)) {
      await BulkImport.updateOne({ _id: imp._id }, { $set: { status: 'failed', failedPhase: 'importing', phase: 'idle', errorSummary: 'Your seller account is not approved and active, so nothing was published.', finishedAt: new Date() } });
      return;
    }
    const zipPath = imp.tempDir ? path.join(imp.tempDir, 'images.zip') : null;
    if (zipPath && fs.existsSync(zipPath)) zipHandle = openImagesZip(zipPath);

    let imported = 0; let failed = 0; let published = 0; let created = 0; let updated = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const rows = await BulkImportRow.find({ importId: imp._id, status: 'valid' }).sort({ rowNumber: 1 }).limit(LIMITS.batchSize).lean();
      if (rows.length === 0) break;
      const done = new Map(); // rowId -> { ok, productId?, published?, error? }

      // images first (network/CPU), a few at a time; a row whose image cannot be processed fails on its own
      const imageUrls = new Map();
      // eslint-disable-next-line no-await-in-loop
      await pool(rows.filter((r) => r.data?.imageRefs?.length), LIMITS.urlDownloadConcurrency, async (r) => {
        try { imageUrls.set(String(r._id), await resolveImages(r.data.imageRefs, sellerId, zipHandle)); } catch (e) { done.set(String(r._id), { ok: false, error: e.message }); }
      });

      const todo = rows.filter((r) => !done.has(String(r._id)));
      const createRows = todo.filter((r) => r.action === 'create');
      const updateRows = todo.filter((r) => r.action === 'update');

      // CREATE: another upload or a manual add may have taken a SKU since validation
      if (createRows.length) {
        // eslint-disable-next-line no-await-in-loop
        const taken = await Product.find({ sellerId, sku: { $in: createRows.map((r) => r.data.set.sku) } }).collation(CI).select('sku').lean();
        const takenSet = new Set(taken.map((p) => String(p.sku).toLowerCase()));
        const ops = [];
        const idByRow = new Map();
        const now = new Date();
        for (const r of createRows) {
          const s = r.data.set;
          if (takenSet.has(String(s.sku).toLowerCase())) { done.set(String(r._id), { ok: false, error: 'SKU already exists in your catalogue' }); continue; }
          const imgs = imageUrls.get(String(r._id)) || [];
          const inactive = r.data.desiredStatus === 'inactive';
          const _id = new mongoose.Types.ObjectId();
          idByRow.set(String(r._id), _id);
          ops.push({
            insertOne: {
              document: {
                _id, name: s.name, category: s.category, subCategory: s.subCategory || '', brand: s.brand || '',
                unitValue: s.unitValue, unitType: s.unitType, unit: s.unit, seller: seller.businessName || '', sellerId,
                description: s.description || '', mrp: s.mrp, salePrice: s.salePrice, purchasePrice: s.purchasePrice || 0,
                taxRate: s.taxRate || '5%', stock: s.stock, sku: s.sku, barcode: s.barcode || '', weight: s.weight || '',
                mainImage: imgs[0] || '', galleryImages: imgs.slice(1), homeSections: [], hasVariants: false, variants: [],
                // return fields only when the sheet gave them; otherwise the model defaults (returnable, 7 days) apply
                ...(s.isReturnable !== undefined ? { isReturnable: s.isReturnable } : {}),
                ...(s.returnWindow !== undefined ? { returnWindow: s.returnWindow } : {}),
                ...(s.returnPolicy !== undefined ? { returnPolicy: s.returnPolicy } : {}),
                ...publishFields(s.stock, inactive), publishedAt: inactive ? null : now, source: 'bulk', importId: imp._id,
              },
            },
          });
        }
        if (ops.length) {
          try { // eslint-disable-next-line no-await-in-loop
            await Product.bulkWrite(ops, { ordered: false });
          } catch (e) { console.warn('[BulkImport] bulk insert reported errors:', e.message); }
          // trust the database, not the error shape: a row succeeded if its product now exists
          // eslint-disable-next-line no-await-in-loop
          const existing = await Product.find({ _id: { $in: [...idByRow.values()] }, sellerId }).select('_id isPublished adminBlocked').lean();
          const exMap = new Map(existing.map((p) => [String(p._id), p]));
          for (const r of createRows) {
            if (done.has(String(r._id))) continue;
            const pid = idByRow.get(String(r._id));
            const ex = exMap.get(String(pid));
            done.set(String(r._id), ex ? { ok: true, productId: pid, published: Boolean(ex.isPublished) && !ex.adminBlocked, action: 'create' } : { ok: false, error: 'The product could not be saved' });
          }
        }
      }

      // UPDATE: ownership is part of the filter, so another seller's product can never match
      if (updateRows.length) {
        // eslint-disable-next-line no-await-in-loop
        const current = await Product.find({ sellerId, _id: { $in: updateRows.map((r) => oid(r.data.productId)) } }).select('stock status isPublished listingStatus adminBlocked').lean();
        const curMap = new Map(current.map((p) => [String(p._id), p]));
        const ops = [];
        const idsForRow = new Map();
        for (const r of updateRows) {
          const cur = curMap.get(String(r.data.productId));
          if (!cur) { done.set(String(r._id), { ok: false, error: 'Product not found in your catalogue' }); continue; }
          const s = r.data.set;
          const $set = {};
          for (const k of ['name', 'barcode', 'category', 'subCategory', 'brand', 'description', 'weight', 'mrp', 'salePrice', 'purchasePrice', 'stock', 'unitValue', 'unitType', 'unit', 'taxRate', 'sku', 'isReturnable', 'returnWindow', 'returnPolicy']) {
            if (s[k] !== undefined) $set[k] = s[k];
          }
          const imgs = imageUrls.get(String(r._id));
          if (imgs && imgs.length) { $set.mainImage = imgs[0]; $set.galleryImages = imgs.slice(1); }
          const newStock = s.stock !== undefined ? s.stock : cur.stock;
          if (r.data.statusProvided && r.data.desiredStatus === 'inactive') Object.assign($set, publishFields(newStock, true));
          else if (r.data.statusProvided && r.data.desiredStatus === 'active') Object.assign($set, publishFields(newStock, false), cur.isPublished ? {} : { publishedAt: new Date() });
          else if (r.data.statusProvided) Object.assign($set, publishFields(newStock, cur.listingStatus === 'inactive'));
          else if (s.stock !== undefined && cur.listingStatus !== 'inactive') $set.listingStatus = newStock > 0 ? 'active' : 'out_of_stock';
          const willPublish = $set.isPublished !== undefined ? $set.isPublished : cur.isPublished !== false;
          idsForRow.set(String(r._id), { id: cur._id, publish: willPublish && !cur.adminBlocked });
          ops.push({ updateOne: { filter: { _id: cur._id, sellerId }, update: { $set } } });
        }
        if (ops.length) {
          const failedIdx = new Set();
          try { // eslint-disable-next-line no-await-in-loop
            await Product.bulkWrite(ops, { ordered: false });
          } catch (e) { (e.writeErrors || []).forEach((we) => failedIdx.add(we.index)); if (!e.writeErrors) ops.forEach((_, i) => failedIdx.add(i)); }
          let opIdx = 0;
          for (const r of updateRows) {
            if (done.has(String(r._id))) continue;
            const meta = idsForRow.get(String(r._id));
            done.set(String(r._id), failedIdx.has(opIdx) ? { ok: false, error: 'The product could not be updated' } : { ok: true, productId: meta.id, published: meta.publish, action: 'update' });
            opIdx += 1;
          }
        }
      }

      // record the outcome of this batch (every row leaves the 'valid' state, so the loop always ends)
      const rowOps = rows.map((r) => {
        const d = done.get(String(r._id)) || { ok: false, error: 'Not processed' };
        if (d.ok) { imported += 1; if (d.published) published += 1; if (d.action === 'create') created += 1; else updated += 1; } else failed += 1;
        return { updateOne: { filter: { _id: r._id }, update: { $set: d.ok ? { status: 'imported', productId: d.productId, published: Boolean(d.published) } : { status: 'failed', problems: [d.error] } } } };
      });
      // eslint-disable-next-line no-await-in-loop
      await BulkImportRow.bulkWrite(rowOps, { ordered: false });
      // eslint-disable-next-line no-await-in-loop
      await BulkImport.updateOne({ _id: imp._id }, { $set: { processed: imported + failed, successRows: imported, publishedRows: published, createdRows: created, updatedRows: updated } });
    }

    const fresh = await BulkImport.findById(imp._id).select('invalidRows skippedRows').lean();
    const runtimeFailed = await BulkImportRow.countDocuments({ importId: imp._id, status: 'failed' });
    const totalFailed = (fresh?.invalidRows || 0) + runtimeFailed;
    await BulkImport.updateOne({ _id: imp._id }, {
      $set: { status: totalFailed > 0 ? 'completed_with_errors' : 'completed', phase: 'idle', failedRows: totalFailed, finishedAt: new Date(), expiresAt: null },
    });
    invalidateProductsCache();
  } catch (err) {
    console.error('[BulkImport] import crashed:', err);
    await BulkImport.updateOne({ _id: imp._id }, { $set: { status: 'failed', failedPhase: 'importing', phase: 'idle', errorSummary: 'The import stopped unexpectedly. Rows already saved are kept; press Import again to continue with the rest.', finishedAt: new Date() } });
  } finally {
    zipHandle = null;
    const after = await BulkImport.findById(imp._id).select('status').lean();
    if (after && after.status !== 'failed') await rmDir(imp.tempDir);
  }
};

// ═════════════════ 3. MAINTENANCE ═════════════════

/** After a restart nothing is really running: mark runs that were in flight as failed (importing is resumable). */
export const recoverInterruptedImports = async () => {
  const a = await BulkImport.updateMany(
    { status: 'validating' },
    { $set: { status: 'failed', failedPhase: 'validating', phase: 'idle', errorSummary: 'The server restarted while your file was being checked. Please upload it again.', finishedAt: new Date() } }
  );
  const b = await BulkImport.updateMany(
    { status: 'importing' },
    { $set: { status: 'failed', failedPhase: 'importing', phase: 'idle', errorSummary: 'The server restarted during the import. Rows already saved are kept; press Import again to continue with the rest.', finishedAt: new Date() } }
  );
  return (a.modifiedCount || 0) + (b.modifiedCount || 0);
};

/** Discards un-imported validated uploads after 24h and deletes their staged files. */
export const discardExpiredImports = async () => {
  const expired = await BulkImport.find({ status: 'validated', expiresAt: { $lt: new Date() } }).select('_id tempDir').lean();
  for (const imp of expired) {
    // eslint-disable-next-line no-await-in-loop
    await BulkImport.updateOne({ _id: imp._id }, { $set: { status: 'discarded', phase: 'idle', finishedAt: new Date() } });
    // eslint-disable-next-line no-await-in-loop
    await BulkImportRow.deleteMany({ importId: imp._id });
    // eslint-disable-next-line no-await-in-loop
    await rmDir(imp.tempDir);
  }
  return expired.length;
};

export const startBulkImportMaintenance = () => {
  recoverInterruptedImports().then((n) => n && console.log(`[BulkImport] marked ${n} interrupted upload(s) as failed`)).catch(() => {});
  const run = () => discardExpiredImports().catch((e) => console.warn('[BulkImport] cleanup failed:', e.message));
  setTimeout(run, 60_000).unref?.();
  setInterval(run, 30 * 60 * 1000).unref?.();
};

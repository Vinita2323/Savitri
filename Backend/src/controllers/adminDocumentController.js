import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import multer from 'multer';
import AdminDocument, { ADMIN_DOC_CATEGORIES } from '../models/AdminDocument.model.js';

/**
 * "Your documents": personal documents of the signed-in admin / super admin, kept for emergencies.
 * - Private to the owner: every query is filtered by req.user.id, another admin gets 404 (even a Super Admin).
 * - Stored outside the public uploads folder and only streamed through an authenticated endpoint.
 * - The type is decided from the file's own bytes (PDF / JPG / PNG / WEBP), never from its name or the browser's claim.
 */
export const ADMIN_DOC_ROOT = path.resolve(process.env.ADMIN_DOC_STORAGE_DIR || path.join(process.cwd(), 'private_uploads', 'admin_documents'));
export const MAX_DOC_BYTES = 5 * 1024 * 1024;
export const MAX_DOCS_PER_ADMIN = 30;

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });

const sniff = (b) => {
  if (!Buffer.isBuffer(b) || b.length < 12) return null;
  if (b.slice(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_DOC_BYTES, files: 1 } }).single('file');
/** multer errors (too big, unexpected field) become clear 4xx answers */
export const uploadMiddleware = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return fail(res, 413, 'The file is larger than 5 MB.');
    return fail(res, 400, 'The file could not be read. Send one PDF, JPG, PNG or WEBP file.');
  });

const safeName = (n) => String(n || 'document').replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 80) || 'document';
const keyFor = (owner, ext) => path.posix.join(String(owner), `${crypto.randomBytes(16).toString('hex')}.${ext}`);
const fullPath = (key) => {
  const full = path.resolve(ADMIN_DOC_ROOT, key);
  return full.startsWith(ADMIN_DOC_ROOT + path.sep) ? full : null; // never leave the private folder
};
const removeFile = async (key) => { const f = fullPath(key); if (f) await fs.promises.unlink(f).catch(() => {}); };

const shape = (d) => ({
  id: String(d._id), title: d.title, category: d.category, documentNumber: d.documentNumber, expiryDate: d.expiryDate, notes: d.notes,
  fileName: d.fileName, mime: d.mime, size: d.size, uploadedAt: d.createdAt, updatedAt: d.updatedAt,
});

const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

const readFields = (b, { creating }) => {
  const out = {};
  if (b.title !== undefined || creating) {
    out.title = String(b.title || '').trim();
    if (!out.title) return { error: 'Give the document a title (for example "Passport").' };
    if (out.title.length > 120) return { error: 'The title is too long (120 characters at most).' };
  }
  if (b.category !== undefined || creating) {
    out.category = b.category || 'Other';
    if (!ADMIN_DOC_CATEGORIES.includes(out.category)) return { error: 'Choose a valid document type.' };
  }
  if (b.documentNumber !== undefined) out.documentNumber = String(b.documentNumber).trim().slice(0, 60);
  if (b.notes !== undefined) out.notes = String(b.notes).trim().slice(0, 500);
  if (b.expiryDate !== undefined) {
    const v = String(b.expiryDate || '').trim();
    if (v && !isDay(v)) return { error: 'The expiry date is not valid.' };
    out.expiryDate = v;
  }
  return { fields: out };
};

const own = (req) => ({ owner: req.user.id });
const oid = (id) => mongoose.Types.ObjectId.isValid(id);

export const listMyDocuments = async (req, res) => {
  try {
    const docs = await AdminDocument.find(own(req)).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, documents: docs.map(shape), categories: ADMIN_DOC_CATEGORIES, max: MAX_DOCS_PER_ADMIN, maxBytes: MAX_DOC_BYTES, today: today() });
  } catch (err) {
    console.error('[AdminDocuments] list', err);
    return fail(res, 500, 'Could not load your documents.');
  }
};

export const addMyDocument = async (req, res) => {
  try {
    const { fields, error } = readFields(req.body || {}, { creating: true });
    if (error) return fail(res, 400, error);
    if (!req.file) return fail(res, 400, 'Choose a file to upload (PDF, JPG, PNG or WEBP, up to 5 MB).');
    const type = sniff(req.file.buffer);
    if (!type) return fail(res, 400, 'Only PDF, JPG, PNG or WEBP files are accepted. This file is not one of them.');
    if ((await AdminDocument.countDocuments(own(req))) >= MAX_DOCS_PER_ADMIN) return fail(res, 409, `You can keep up to ${MAX_DOCS_PER_ADMIN} documents. Delete one you no longer need first.`);
    const key = keyFor(req.user.id, type.ext);
    const full = fullPath(key);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, req.file.buffer, { flag: 'wx' });
    let doc;
    try {
      doc = await AdminDocument.create({ owner: req.user.id, ...fields, fileKey: key, fileName: safeName(req.file.originalname), mime: type.mime, size: req.file.size, hash: crypto.createHash('sha256').update(req.file.buffer).digest('hex') });
    } catch (err) {
      await removeFile(key);
      throw err;
    }
    return res.status(201).json({ success: true, document: shape(doc) });
  } catch (err) {
    console.error('[AdminDocuments] add', err);
    return fail(res, 500, 'Could not save the document. Please try again.');
  }
};

export const updateMyDocument = async (req, res) => {
  try {
    if (!oid(req.params.id)) return fail(res, 404, 'Document not found.');
    const doc = await AdminDocument.findOne({ _id: req.params.id, ...own(req) });
    if (!doc) return fail(res, 404, 'Document not found.');
    const { fields, error } = readFields(req.body || {}, { creating: false });
    if (error) return fail(res, 400, error);
    let newKey = null;
    let oldKey = null;
    if (req.file) {
      const type = sniff(req.file.buffer);
      if (!type) return fail(res, 400, 'Only PDF, JPG, PNG or WEBP files are accepted. This file is not one of them.');
      newKey = keyFor(req.user.id, type.ext);
      await fs.promises.mkdir(path.dirname(fullPath(newKey)), { recursive: true });
      await fs.promises.writeFile(fullPath(newKey), req.file.buffer, { flag: 'wx' });
      oldKey = doc.fileKey;
      Object.assign(doc, { fileKey: newKey, fileName: safeName(req.file.originalname), mime: type.mime, size: req.file.size, hash: crypto.createHash('sha256').update(req.file.buffer).digest('hex') });
    }
    Object.assign(doc, fields);
    try { await doc.save(); } catch (err) { if (newKey) await removeFile(newKey); throw err; }
    if (oldKey) await removeFile(oldKey);
    return res.json({ success: true, document: shape(doc) });
  } catch (err) {
    console.error('[AdminDocuments] update', err);
    return fail(res, 500, 'Could not update the document.');
  }
};

export const deleteMyDocument = async (req, res) => {
  try {
    if (!oid(req.params.id)) return fail(res, 404, 'Document not found.');
    const doc = await AdminDocument.findOneAndDelete({ _id: req.params.id, ...own(req) });
    if (!doc) return fail(res, 404, 'Document not found.');
    await removeFile(doc.fileKey);
    return res.json({ success: true });
  } catch (err) {
    console.error('[AdminDocuments] delete', err);
    return fail(res, 500, 'Could not delete the document.');
  }
};

export const downloadMyDocument = async (req, res) => {
  try {
    if (!oid(req.params.id)) return fail(res, 404, 'Document not found.');
    const doc = await AdminDocument.findOne({ _id: req.params.id, ...own(req) }).lean();
    if (!doc) return fail(res, 404, 'Document not found.');
    const full = fullPath(doc.fileKey);
    if (!full || !fs.existsSync(full)) return fail(res, 410, 'The stored file is missing. Please upload this document again.');
    const asDownload = req.query.download === '1';
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Content-Disposition', `${asDownload ? 'attachment' : 'inline'}; filename="${doc.fileName.replace(/"/g, '')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    return fs.createReadStream(full).pipe(res);
  } catch (err) {
    console.error('[AdminDocuments] file', err);
    return fail(res, 500, 'Could not open the document.');
  }
};

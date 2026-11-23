import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import multer from 'multer';
import Product from '../models/Product.model.js';
import Seller from '../models/Seller.model.js';
import SellerPurchase from '../models/SellerPurchase.model.js';
import AdminPurchase, { PAY_METHODS, PAY_STATUSES } from '../models/AdminPurchase.model.js';
import StockMovement from '../models/StockMovement.model.js';
import { canAccessAllBrands } from '../middleware/scopeMiddleware.js';
import { scopedSellerIds } from './sellerPurchaseController.js';
import { invalidateProductsCache } from './productController.js';
import { emitToRoom } from '../socket/socket.js';
import { toPaise, ratio, MoneyError } from '../utils/payrollMoney.js';
import { istStart, istEnd, isValidDay, rollUp, PERIODS } from '../utils/reportPeriods.js';

/**
 * Admin purchases (stock bought for the Admin's own store) and READ-ONLY visibility of the purchases of associated sellers.
 *
 * Identity: the admin id, role and brand scope always come from the verified JWT / database (req.user, req.scope).
 * Nothing about "who" is ever read from the request body or query.
 *
 * Stock: Product.stock (and variants[].stock) is the inventory. A stock change is applied with ONE atomic update that also records
 * a key in Product.stockRefs, so the same change can never be applied twice, with or without database transactions.
 */

let indexesReady = null;
/** The app disables mongoose autoIndex; the unique keys below are what make duplicate prevention safe, so make sure they exist first. */
export const ensurePurchaseIndexes = () => {
  if (!indexesReady) indexesReady = Promise.all([AdminPurchase.createIndexes(), StockMovement.createIndexes()]).catch((e) => { indexesReady = null; throw e; });
  return indexesReady;
};

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isSuper = (req) => String(req.user?.role || '').replace(/-/g, '_') === 'super_admin';
const actorOf = (req) => ({ id: req.user.id, name: req.user.name || req.user.email || '', role: String(req.user.role || '') });
const pageOf = (q) => ({ page: Math.max(1, Number(q.page) || 1), limit: Math.min(100, Math.max(1, Number(q.limit) || 20)) });
const day = (v, end = false) => (isValidDay(v) ? (end ? istEnd(v) : istStart(v)) : null);
const PLATFORM_STORE = 'Savitri Official Store';

const notify = (adminId) => {
  emitToRoom('finance', 'purchase:changed', {});
  if (adminId) emitToRoom(`admin:${String(adminId)}`, 'purchase:changed', {});
};
const newPurchaseId = () => {
  const d = new Date(Date.now() + 330 * 60000);
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `APU-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

// ───────────────────────── private invoice storage ─────────────────────────

export const ADMIN_INVOICE_ROOT = path.resolve(process.env.ADMIN_INVOICE_STORAGE_DIR || path.join(process.cwd(), 'private_uploads', 'admin_purchase_invoices'));
export const INVOICE_MAX = 5 * 1024 * 1024;
const sniff = (b) => {
  if (!Buffer.isBuffer(b) || b.length < 12) return null;
  if (b.slice(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
};
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: INVOICE_MAX, files: 1 } }).single('file');
export const invoiceUploadMiddleware = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    return err.code === 'LIMIT_FILE_SIZE' ? fail(res, 413, 'The file is larger than 5 MB.') : fail(res, 400, 'The file could not be read. Send one PDF, JPG, PNG or WEBP file.');
  });
const invoicePath = (key) => { const f = path.resolve(ADMIN_INVOICE_ROOT, key); return f.startsWith(ADMIN_INVOICE_ROOT + path.sep) ? f : null; };

/** POST /invoice: stores the bill privately and returns a reference to send with the purchase. Only for the uploader. */
export const uploadInvoice = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'Choose an invoice file (PDF, JPG, PNG or WEBP, up to 5 MB).');
    const type = sniff(req.file.buffer);
    if (!type) return fail(res, 400, 'Only PDF, JPG, PNG or WEBP files are accepted. This file is not one of them.');
    const key = path.posix.join(String(req.user.id), `${crypto.randomBytes(16).toString('hex')}.${type.ext}`);
    await fs.promises.mkdir(path.dirname(invoicePath(key)), { recursive: true });
    await fs.promises.writeFile(invoicePath(key), req.file.buffer, { flag: 'wx' });
    return res.status(201).json({ success: true, invoiceFile: { key, name: String(req.file.originalname || 'invoice').replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 80), mime: type.mime, size: req.file.size } });
  } catch (err) {
    console.error('[AdminPurchase] invoice upload', err);
    return fail(res, 500, 'Could not save the file.');
  }
};

// ───────────────────────── product eligibility ─────────────────────────

/**
 * Which products can an admin buy stock for? Only products of the admin's OWN store:
 *  - products owned by this admin (ownerAdminId), or
 *  - platform-owned products (no seller, no owner) for users with all-brand access.
 * A seller's product is never eligible, so an admin purchase can not change a seller's inventory.
 */
export const eligibleFilter = async (req) => {
  const mine = { sellerId: { $in: [null, undefined] }, ownerAdminId: new mongoose.Types.ObjectId(String(req.user.id)) };
  if (isSuper(req) || (await canAccessAllBrands(req.user))) {
    return { $or: [mine, { sellerId: { $in: [null, undefined] }, ownerAdminId: { $in: [null, undefined] } }] };
  }
  return mine;
};
const productEligible = async (req, product) => {
  if (!product || product.sellerId) return false;
  if (product.ownerAdminId) return String(product.ownerAdminId) === String(req.user.id);
  return isSuper(req) || (await canAccessAllBrands(req.user));
};
const ownerOf = (req, product) => (product.ownerAdminId ? { kind: 'ADMIN', adminId: product.ownerAdminId } : { kind: 'PLATFORM', adminId: null });

export const listEligibleProducts = async (req, res) => {
  try {
    const q = String(req.query.search || '').trim().slice(0, 80);
    const filter = { $and: [await eligibleFilter(req)] };
    if (q) filter.$and.push({ $or: [{ name: new RegExp(esc(q), 'i') }, { sku: new RegExp(esc(q), 'i') }] });
    const rows = await Product.find(filter).select('name sku unit unitType unitValue category stock taxRate hasVariants variants ownerAdminId purchasePrice').sort({ name: 1 }).limit(100).lean();
    return res.json({
      success: true,
      products: rows.map((p) => ({
        id: String(p._id), name: p.name, sku: p.sku || '', unit: p.unitType || p.unit || '', category: p.category, stock: p.stock || 0, taxRate: p.taxRate || '', purchasePrice: p.purchasePrice || 0,
        ownStore: Boolean(p.ownerAdminId), hasVariants: Boolean(p.hasVariants),
        variants: (p.variants || []).filter((v) => v && v.active !== false).map((v) => ({ sku: v.sku, title: v.title, stock: v.stock || 0 })),
      })),
    });
  } catch (err) {
    console.error('[AdminPurchase] products', err);
    return fail(res, 500, 'Could not load products.');
  }
};

/** A minimal own-store product so a brand-restricted admin has something to buy stock for. Unpublished until finished in the normal product page. */
export const quickAddProduct = async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name || name.length > 150) return fail(res, 400, 'Enter the product name (up to 150 characters).');
    const sku = String(b.sku || '').trim().slice(0, 60);
    if (sku && (await Product.exists({ ownerAdminId: req.user.id, sku }))) return fail(res, 409, 'You already have a product with this SKU.');
    const p = await Product.create({ name, sku, category: String(b.category || 'Groceries').trim().slice(0, 80) || 'Groceries', unitType: String(b.unit || '').trim().slice(0, 20), stock: 0, ownerAdminId: req.user.id, isPublished: false, status: 'Draft', listingStatus: 'inactive', seller: `${req.user.name || 'Admin'} Store` });
    return res.status(201).json({ success: true, product: { id: String(p._id), name: p.name, sku: p.sku, unit: p.unitType || '', stock: 0, ownStore: true, hasVariants: false, variants: [] } });
  } catch (err) {
    console.error('[AdminPurchase] quick add', err);
    return fail(res, 500, 'Could not add the product.');
  }
};

// ───────────────────────── stock changes (exactly once) ─────────────────────────

const stockQuery = (product, variantSku, refKey, minStock = null) => {
  const nin = { $ne: refKey };
  const base = variantSku ? { _id: product, 'variants.sku': variantSku, stockRefs: nin } : { _id: product, stockRefs: nin };
  if (minStock !== null) {
    base.stock = { $gte: minStock };
    if (variantSku) base.variants = { $elemMatch: { sku: variantSku, stock: { $gte: minStock } } };
  }
  return base;
};
const readStock = (doc, variantSku) => (variantSku ? Number(doc.variants.find((v) => v.sku === variantSku)?.stock ?? 0) : Number(doc.stock ?? 0));

/**
 * Add `delta` (positive or negative) to a product / variant stock, once for this refKey.
 * Returns { applied: true, previous, next } or { applied: false, already: true } when this refKey was applied before,
 * or { applied: false, short: true } when a decrease would make stock negative.
 */
const applyStock = async ({ product, variantSku, delta, refKey }) => {
  const inc = variantSku ? { 'variants.$.stock': delta, stock: delta } : { stock: delta };
  const after = await Product.findOneAndUpdate(
    stockQuery(product, variantSku, refKey, delta < 0 ? -delta : null),
    { $inc: inc, $push: { stockRefs: { $each: [refKey], $slice: -500 } } },
    { new: true, projection: { stock: 1, variants: 1 } }
  );
  if (after) {
    const next = readStock(after, variantSku);
    return { applied: true, previous: next - delta, next };
  }
  const has = await Product.exists({ _id: product, stockRefs: refKey });
  if (has) return { applied: false, already: true };
  const exists = await Product.exists(variantSku ? { _id: product, 'variants.sku': variantSku } : { _id: product });
  if (!exists) return { applied: false, missing: true };
  return { applied: false, short: true };
};

const record = async (p, line, i, owner, type, change, r, actor, refKey, note = '') => {
  try {
    await StockMovement.create({
      refKey, product: line.product, productName: line.productName, sku: line.sku, variantSku: line.variantSku, owner, type, change,
      previousStock: r.previous ?? null, newStock: r.next ?? null, referenceId: p.purchaseId, lineIndex: i, unitCostPaise: line.unitPricePaise, note, actor, recovered: Boolean(r.already),
    });
  } catch (err) {
    if (err?.code !== 11000) throw err; // already recorded: that is the point of the unique key
  }
};

// ───────────────────────── create ─────────────────────────

const toX100 = (v, label) => {
  if (v === undefined || v === null || v === '') return 0;
  const s = String(v).replace('%', '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new MoneyError(`${label} must be a number with at most 2 decimals.`);
  const [a, bb = ''] = s.split('.');
  const n = Number(a) * 100 + Number(bb.padEnd(2, '0'));
  if (n > 10000) throw new MoneyError(`${label} can not be more than 100%.`);
  return n;
};
const paise = (v, label, { allowZero = true, optional = false } = {}) => {
  if (optional && (v === undefined || v === null || v === '')) return 0;
  try { return toPaise(v, { allowZero, max: 10000000 }); } catch (e) { throw new MoneyError(`${label}: ${e.message}`); }
};

/** Validate the body and compute every amount in exact paise. Returns { error } or { data }. */
const buildPurchase = async (req) => {
  const b = req.body || {};
  const supplierName = String(b.supplierName || '').trim();
  if (!supplierName) return { error: 'Supplier name is required.' };
  if (supplierName.length > 120) return { error: 'Supplier name is too long (120 characters at most).' };
  const supplierEmail = String(b.supplierEmail || '').trim().slice(0, 120);
  if (supplierEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmail)) return { error: 'The supplier email is not valid.' };
  const supplierPhone = String(b.supplierPhone || '').trim();
  if (supplierPhone && !/^[0-9+\-() ]{6,20}$/.test(supplierPhone)) return { error: 'The supplier phone number is not valid.' };
  const purchaseDate = b.purchaseDate ? new Date(`${String(b.purchaseDate).slice(0, 10)}T12:00:00+05:30`) : new Date();
  if (Number.isNaN(purchaseDate.getTime())) return { error: 'Purchase date is not valid.' };
  if (purchaseDate.getTime() > Date.now() + 24 * 3600 * 1000) return { error: 'Purchase date can not be in the future.' };
  if (purchaseDate.getTime() < Date.now() - 5 * 365 * 24 * 3600 * 1000) return { error: 'Purchase date is too old (more than 5 years).' };

  const raw = Array.isArray(b.items) ? b.items : [];
  if (raw.length < 1) return { error: 'Add at least one product to the purchase.' };
  if (raw.length > 50) return { error: 'A purchase can have at most 50 products.' };
  const lines = [];
  const seen = new Set();
  for (let i = 0; i < raw.length; i += 1) {
    const it = raw[i] || {};
    const n = i + 1;
    if (!isId(it.productId)) return { error: `Line ${n}: choose a product.` };
    const quantity = Number(it.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) return { error: `Line ${n}: quantity must be a whole number between 1 and 1,000,000.` };
    let unitPricePaise; let gstPercentX100;
    try { unitPricePaise = paise(it.unitPrice, `Line ${n} price`); gstPercentX100 = toX100(it.gstPercent, `Line ${n} GST`); } catch (e) { return { error: e.message }; }
    const product = await Product.findById(it.productId).select('name sku unit unitType hasVariants variants sellerId ownerAdminId');
    if (!(await productEligible(req, product))) return { error: `Line ${n}: this product is not part of your store.` };
    const active = (product.variants || []).filter((v) => v && v.active !== false);
    let variant = null;
    if (product.hasVariants && active.length > 0) {
      const vs = String(it.variantSku || '').trim();
      if (!vs) return { error: `Line ${n}: "${product.name}" has variants. Choose which variant you bought.` };
      variant = active.find((v) => String(v.sku) === vs);
      if (!variant) return { error: `Line ${n}: the selected variant was not found.` };
    }
    const key = `${product._id}|${variant ? variant.sku : ''}`;
    if (seen.has(key)) return { error: `Line ${n}: "${product.name}" is already in this purchase. Increase its quantity instead.` };
    seen.add(key);
    const subtotalPaise = unitPricePaise * quantity;
    if (!Number.isSafeInteger(subtotalPaise)) return { error: `Line ${n}: the amount is too large.` };
    lines.push({
      product: product._id, productName: product.name, sku: variant ? String(variant.sku) : String(product.sku || ''), variantSku: variant ? String(variant.sku) : '', variantTitle: variant ? String(variant.title || '') : '',
      unit: String(product.unitType || product.unit || ''), quantity, unitPricePaise, gstPercentX100, subtotalPaise, gstPaise: ratio([subtotalPaise, gstPercentX100], [10000]),
      _owner: ownerOf(req, product),
    });
  }
  let additionalExpensesPaise; let discountPaise;
  try { additionalExpensesPaise = paise(b.additionalExpenses, 'Additional expenses', { optional: true }); discountPaise = paise(b.discount, 'Discount', { optional: true }); } catch (e) { return { error: e.message }; }
  const subtotalPaise = lines.reduce((t, l) => t + l.subtotalPaise, 0);
  const gstPaise = lines.reduce((t, l) => t + l.gstPaise, 0);
  const gross = subtotalPaise + gstPaise + additionalExpensesPaise;
  if (discountPaise > gross) return { error: 'The discount can not be more than the purchase total.' };
  const finalPaise = gross - discountPaise;

  const paymentStatus = String(b.paymentStatus || 'UNPAID').toUpperCase();
  if (!PAY_STATUSES.includes(paymentStatus)) return { error: 'Choose a payment status: Paid, Unpaid or Partial.' };
  let paidPaise = 0;
  let paymentMethod = '';
  if (paymentStatus !== 'UNPAID') {
    paymentMethod = String(b.paymentMethod || '').toUpperCase();
    if (!PAY_METHODS.includes(paymentMethod)) return { error: 'Choose how it was paid.' };
    if (paymentStatus === 'PAID') paidPaise = finalPaise;
    else {
      try { paidPaise = paise(b.paidAmount, 'Amount paid', { allowZero: false }); } catch (e) { return { error: e.message }; }
      if (paidPaise >= finalPaise) return { error: 'For a partial payment the amount paid must be less than the final amount. Choose Paid instead.' };
    }
  } else if (b.paymentMethod) paymentMethod = PAY_METHODS.includes(String(b.paymentMethod).toUpperCase()) ? String(b.paymentMethod).toUpperCase() : '';

  let invoiceFile = { key: '', name: '', mime: '', size: 0 };
  if (b.invoiceFile && b.invoiceFile.key) {
    const key = String(b.invoiceFile.key);
    const mine = key.startsWith(`${req.user.id}/`) && /^[a-f0-9]{24}\/[a-f0-9]{32}\.(pdf|jpg|png|webp)$/.test(key); // a bill another admin uploaded can not be attached
    const f = mine ? invoicePath(key) : null;
    if (!f || !fs.existsSync(f)) return { error: 'The invoice file could not be found. Please upload it again.' };
    invoiceFile = { key, name: String(b.invoiceFile.name || 'invoice').slice(0, 80), mime: String(b.invoiceFile.mime || '').slice(0, 60), size: Number(b.invoiceFile.size) || 0 };
  }
  return {
    data: {
      supplierName, supplierPhone, supplierEmail, supplierAddress: String(b.supplierAddress || '').trim().slice(0, 250), purchaseDate,
      invoiceNumber: String(b.invoiceNumber || '').trim().slice(0, 60), notes: String(b.notes || '').trim().slice(0, 500),
      lines, totalQuantity: lines.reduce((t, l) => t + l.quantity, 0), subtotalPaise, gstPaise, additionalExpensesPaise, discountPaise, finalPaise,
      paymentStatus, paidPaise, paymentMethod, invoiceFile, updateCostPrice: b.updateCostPrice !== false && b.updateCostPrice !== 'false',
    },
  };
};

const fingerprintOf = (adminId, d) =>
  crypto.createHash('sha256').update(JSON.stringify([String(adminId), d.supplierName.toLowerCase(), d.purchaseDate.toISOString().slice(0, 10), d.invoiceNumber, d.finalPaise, d.lines.map((l) => [String(l.product), l.variantSku, l.quantity, l.unitPricePaise])])).digest('hex');

export const shape = (p, { full = true } = {}) => {
  const o = p.toObject ? p.toObject() : p;
  const base = {
    id: String(o._id), purchaseId: o.purchaseId, adminId: String(o.adminId), adminName: o.adminName, storeName: o.storeName, brandId: o.brandId, supplierName: o.supplierName, supplierPhone: o.supplierPhone,
    purchaseDate: o.purchaseDate, invoiceNumber: o.invoiceNumber, status: o.status, totalQuantity: o.totalQuantity, lineCount: (o.lines || []).length,
    subtotalPaise: o.subtotalPaise, gstPaise: o.gstPaise, additionalExpensesPaise: o.additionalExpensesPaise, discountPaise: o.discountPaise, finalPaise: o.finalPaise,
    paymentStatus: o.paymentStatus, paidPaise: o.paidPaise, balancePaise: Math.max(0, o.finalPaise - o.paidPaise), paymentMethod: o.paymentMethod, hasInvoice: Boolean(o.invoiceFile?.key), createdAt: o.createdAt,
    productsText: (o.lines || []).map((l) => l.productName).join(', ').slice(0, 160),
  };
  if (!full) return base;
  return {
    ...base, supplierEmail: o.supplierEmail, supplierAddress: o.supplierAddress, notes: o.notes, invoiceFile: o.invoiceFile?.key ? { name: o.invoiceFile.name, mime: o.invoiceFile.mime, size: o.invoiceFile.size } : null,
    lines: (o.lines || []).map((l) => ({ product: String(l.product), productName: l.productName, sku: l.sku, variantSku: l.variantSku, variantTitle: l.variantTitle, unit: l.unit, quantity: l.quantity, unitPricePaise: l.unitPricePaise, gstPercentX100: l.gstPercentX100, subtotalPaise: l.subtotalPaise, gstPaise: l.gstPaise, previousStock: l.previousStock, newStock: l.newStock, stockApplied: l.stockApplied })),
    cancelledAt: o.cancelledAt, cancelledBy: o.cancelledBy?.name || '', cancelReason: o.cancelReason, history: o.history,
  };
};

/** Undo the lines already applied (used when a later line can not be applied). */
const rollbackLines = async (p, upTo, actor) => {
  for (let i = 0; i < upTo; i += 1) {
    const l = p.lines[i];
    if (!l.stockApplied) continue;
    // eslint-disable-next-line no-await-in-loop
    const r = await applyStock({ product: l.product, variantSku: l.variantSku, delta: -l.quantity, refKey: `${p.purchaseId}:${i}:undo` });
    // eslint-disable-next-line no-await-in-loop
    await record(p, l, i, p._owners[i], 'PURCHASE_ROLLBACK', -l.quantity, r, actor, `${p.purchaseId}:${i}:undo`, 'Purchase could not be completed');
  }
};

export const createAdminPurchase = async (req, res) => {
  try {
    const built = await buildPurchase(req);
    if (built.error) return fail(res, 400, built.error);
    const d = built.data;
    const adminId = req.user.id;
    const idempotencyKey = req.body?.idempotencyKey ? String(req.body.idempotencyKey).slice(0, 80) : undefined;

    // 1) the same request sent again: answer with the purchase that already exists, never a second one
    if (idempotencyKey) {
      const same = await AdminPurchase.findOne({ adminId, idempotencyKey });
      if (same) {
        if (same.status === 'PROCESSING') return fail(res, 409, 'This purchase is still being saved. Please wait a moment.');
        return res.status(200).json({ success: true, duplicate: true, message: 'This purchase was already recorded.', purchase: shape(same) });
      }
    }
    const fingerprint = fingerprintOf(adminId, d);
    const recent = await AdminPurchase.findOne({ adminId, fingerprint, status: { $in: ['PROCESSING', 'RECORDED'] }, createdAt: { $gte: new Date(Date.now() - 2 * 60000) } }).select('purchaseId');
    if (recent && req.body?.confirmDuplicate !== true) {
      return fail(res, 409, `An identical purchase (${recent.purchaseId}) was recorded a moment ago. If this is really a second purchase, confirm it.`, { code: 'POSSIBLE_DUPLICATE', purchaseId: recent.purchaseId });
    }

    const storeName = d.lines.every((l) => l._owner.kind === 'PLATFORM') ? PLATFORM_STORE : `${req.user.name || 'Admin'} Store`;
    const owners = d.lines.map((l) => l._owner);
    const lines = d.lines.map(({ _owner, ...rest }) => rest);
    const base = {
      adminId, adminName: req.user.name || req.user.email || '', adminRole: String(req.user.role || ''), brandId: req.scope && !req.scope.isAll ? req.scope.brandId : '', storeName, idempotencyKey, fingerprint,
      supplierName: d.supplierName, supplierPhone: d.supplierPhone, supplierEmail: d.supplierEmail, supplierAddress: d.supplierAddress, purchaseDate: d.purchaseDate, invoiceNumber: d.invoiceNumber, notes: d.notes,
      lines, totalQuantity: d.totalQuantity, subtotalPaise: d.subtotalPaise, gstPaise: d.gstPaise, additionalExpensesPaise: d.additionalExpensesPaise, discountPaise: d.discountPaise, finalPaise: d.finalPaise,
      paymentStatus: d.paymentStatus, paidPaise: d.paidPaise, paymentMethod: d.paymentMethod, invoiceFile: d.invoiceFile, status: 'PROCESSING', history: [{ action: 'CREATED', by: req.user.name || '', note: 'Purchase received' }],
    };

    // 2) the purchase record first (unique idempotency key = only one request can get past this point)
    let p = null;
    for (let attempt = 0; attempt < 4 && !p; attempt += 1) {
      try {
        p = await AdminPurchase.create({ ...base, purchaseId: newPurchaseId() });
      } catch (err) {
        if (err?.code === 11000 && /idempotencyKey/.test(JSON.stringify(err.keyPattern || err.message))) {
          const same = await AdminPurchase.findOne({ adminId, idempotencyKey });
          return res.status(200).json({ success: true, duplicate: true, message: 'This purchase was already recorded.', purchase: same ? shape(same) : null });
        }
        if (err?.code !== 11000 || attempt === 3) throw err;
      }
    }
    p._owners = owners;
    const actor = actorOf(req);

    // 3) stock, line by line, each exactly once
    for (let i = 0; i < p.lines.length; i += 1) {
      const l = p.lines[i];
      const refKey = `${p.purchaseId}:${i}:in`;
      // eslint-disable-next-line no-await-in-loop
      const r = await applyStock({ product: l.product, variantSku: l.variantSku, delta: l.quantity, refKey });
      if (!r.applied && !r.already) {
        await rollbackLines(p, i, actor);
        p.status = 'FAILED'; p.failReason = r.missing ? `"${l.productName}" no longer exists.` : 'Stock could not be updated.';
        p.history.push({ action: 'FAILED', by: 'system', note: p.failReason });
        await p.save();
        return fail(res, 409, `The purchase was not saved: ${p.failReason} No stock was changed.`);
      }
      l.previousStock = r.previous ?? null; l.newStock = r.next ?? null; l.stockApplied = true;
      // eslint-disable-next-line no-await-in-loop
      await record(p, l, i, owners[i], 'PURCHASE', l.quantity, r, actor, refKey);
    }
    p.status = 'RECORDED';
    p.history.push({ action: 'RECORDED', by: req.user.name || '', note: 'Stock added' });
    await p.save();

    // 4) latest purchase price on the product (cost field only)
    if (d.updateCostPrice) {
      await Promise.all(p.lines.map((l) => Product.updateOne({ _id: l.product }, { $set: { purchasePrice: l.unitPricePaise / 100 } })));
    }
    invalidateProductsCache();
    notify(adminId);
    return res.status(201).json({ success: true, message: 'Purchase recorded and stock updated.', purchase: shape(p) });
  } catch (err) {
    console.error('[AdminPurchase] create', err);
    return fail(res, 500, 'Could not save the purchase. Nothing was changed; please try again.');
  }
};

// ───────────────────────── cancel / reverse ─────────────────────────

export const cancelAdminPurchase = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Purchase not found.');
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    if (!reason) return fail(res, 400, 'Give a reason for cancelling. It is kept in the history.');
    const found = await AdminPurchase.findOne({ _id: req.params.id, adminId: req.user.id });
    if (!found) return fail(res, 404, 'Purchase not found.');
    if (found.status === 'CANCELLED') return fail(res, 409, 'This purchase is already cancelled.');
    // only one request can start the reversal
    const p = await AdminPurchase.findOneAndUpdate({ _id: found._id, adminId: req.user.id, status: 'RECORDED' }, { $set: { status: 'CANCELLING' } }, { new: true });
    if (!p) return fail(res, 409, 'This purchase can not be cancelled right now.');
    const actor = actorOf(req);
    const products = await Product.find({ _id: { $in: p.lines.map((l) => l.product) } }).select('ownerAdminId sellerId').lean();
    const ownerFor = (id) => { const pr = products.find((x) => String(x._id) === String(id)); return pr?.ownerAdminId ? { kind: 'ADMIN', adminId: pr.ownerAdminId } : { kind: 'PLATFORM', adminId: null }; };
    const done = [];
    const attempt = p.history.filter((h) => h.action === 'CANCEL_REFUSED').length; // a retried cancel uses fresh keys, so every attempt is recorded
    for (let i = 0; i < p.lines.length; i += 1) {
      const l = p.lines[i];
      if (!l.stockApplied) continue;
      // eslint-disable-next-line no-await-in-loop
      const r = await applyStock({ product: l.product, variantSku: l.variantSku, delta: -l.quantity, refKey: `${p.purchaseId}:${i}:rev${attempt}` });
      if (r.applied || r.already) { done.push(i); // eslint-disable-next-line no-await-in-loop
        await record(p, l, i, ownerFor(l.product), 'PURCHASE_REVERSAL', -l.quantity, r, actor, `${p.purchaseId}:${i}:rev${attempt}`, reason); continue; }
      // not enough stock left (part of it was sold or removed): put back what was already taken and stop
      for (const j of done) {
        const lj = p.lines[j];
        // eslint-disable-next-line no-await-in-loop
        const back = await applyStock({ product: lj.product, variantSku: lj.variantSku, delta: lj.quantity, refKey: `${p.purchaseId}:${j}:revundo${attempt}` });
        // eslint-disable-next-line no-await-in-loop
        await record(p, lj, j, ownerFor(lj.product), 'PURCHASE_ROLLBACK', lj.quantity, back, actor, `${p.purchaseId}:${j}:revundo${attempt}`, 'Cancellation stopped');
      }
      await AdminPurchase.updateOne({ _id: p._id }, { $set: { status: 'RECORDED' }, $push: { history: { action: 'CANCEL_REFUSED', by: req.user.name || '', note: `Not enough stock of "${l.productName}"` } } });
      return fail(res, 409, `This purchase can not be cancelled: part of the stock of "${l.productName}" has already been sold or removed. Adjust the stock manually instead.`);
    }
    p.status = 'CANCELLED'; p.cancelledAt = new Date(); p.cancelledBy = { id: req.user.id, name: req.user.name || '' }; p.cancelReason = reason;
    p.history.push({ action: 'CANCELLED', by: req.user.name || '', note: reason });
    await p.save();
    invalidateProductsCache();
    notify(req.user.id);
    return res.json({ success: true, message: 'Purchase cancelled and its stock reversed.', purchase: shape(p) });
  } catch (err) {
    console.error('[AdminPurchase] cancel', err);
    return fail(res, 500, 'Could not cancel the purchase. Please try again.');
  }
};

// ───────────────────────── my purchases ─────────────────────────

const myFilter = (req, extra = {}) => {
  const q = req.query || {};
  const f = { adminId: new mongoose.Types.ObjectId(String(req.user.id)), status: { $in: ['RECORDED', 'CANCELLED', 'CANCELLING', 'PROCESSING'] }, ...extra };
  if (q.status && q.status !== 'ALL') f.status = String(q.status).toUpperCase();
  if (q.paymentStatus && PAY_STATUSES.includes(String(q.paymentStatus).toUpperCase())) f.paymentStatus = String(q.paymentStatus).toUpperCase();
  const from = day(q.from); const to = day(q.to, true);
  if (from || to) f.purchaseDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const s = String(q.search || '').trim().slice(0, 80);
  if (s) { const rx = new RegExp(esc(s), 'i'); f.$or = [{ purchaseId: rx }, { supplierName: rx }, { invoiceNumber: rx }, { 'lines.productName': rx }, { 'lines.sku': rx }]; }
  return f;
};

export const listMyAdminPurchases = async (req, res) => {
  try {
    const filter = myFilter(req);
    const { page, limit } = pageOf(req.query);
    const [total, rows, agg] = await Promise.all([
      AdminPurchase.countDocuments(filter),
      AdminPurchase.find(filter).sort({ purchaseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AdminPurchase.aggregate([{ $match: { ...filter, status: 'RECORDED' } }, { $group: { _id: null, amount: { $sum: '$finalPaise' }, qty: { $sum: '$totalQuantity' }, n: { $sum: 1 }, paid: { $sum: '$paidPaise' } } }]),
    ]);
    const a = agg[0] || {};
    return res.json({ success: true, total, page, pages: Math.max(1, Math.ceil(total / limit)), summary: { purchases: a.n || 0, amountPaise: a.amount || 0, quantity: a.qty || 0, paidPaise: a.paid || 0, outstandingPaise: Math.max(0, (a.amount || 0) - (a.paid || 0)) }, purchases: rows.map((r) => shape(r, { full: false })) });
  } catch (err) {
    console.error('[AdminPurchase] list', err);
    return fail(res, 500, 'Could not load your purchases.');
  }
};

export const getAdminPurchase = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Purchase not found.');
    const p = await AdminPurchase.findOne({ _id: req.params.id, adminId: req.user.id }).lean();
    if (!p) return fail(res, 404, 'Purchase not found.');
    const movements = await StockMovement.find({ referenceId: p.purchaseId }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, purchase: shape(p), movements: movements.map(shapeMovement) });
  } catch (err) {
    console.error('[AdminPurchase] get', err);
    return fail(res, 500, 'Could not load the purchase.');
  }
};

/** The bill: only the admin who bought it, or a Super Admin. */
export const downloadInvoice = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Purchase not found.');
    const p = await AdminPurchase.findById(req.params.id).select('adminId invoiceFile').lean();
    if (!p || !p.invoiceFile?.key || (!isSuper(req) && String(p.adminId) !== String(req.user.id))) return fail(res, 404, 'Invoice not found.');
    const f = invoicePath(p.invoiceFile.key);
    if (!f || !fs.existsSync(f)) return fail(res, 410, 'The stored invoice file is missing.');
    res.setHeader('Content-Type', p.invoiceFile.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${String(p.invoiceFile.name || 'invoice').replace(/"/g, '')}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:");
    return fs.createReadStream(f).pipe(res);
  } catch (err) {
    console.error('[AdminPurchase] invoice', err);
    return fail(res, 500, 'Could not open the invoice.');
  }
};

// ───────────────────────── stock updates ─────────────────────────

const shapeMovement = (m) => ({ id: String(m._id), type: m.type, product: String(m.product), productName: m.productName, sku: m.sku, variantSku: m.variantSku, change: m.change, previousStock: m.previousStock, newStock: m.newStock, purchaseId: m.referenceId, unitCostPaise: m.unitCostPaise, note: m.note, by: m.actor?.name || '', at: m.createdAt, recovered: m.recovered, storeKind: m.owner?.kind });

export const listStockUpdates = async (req, res) => {
  try {
    const q = req.query || {};
    // my own-store stock changes + the changes made by my purchases on platform products
    const mine = await AdminPurchase.find({ adminId: req.user.id }).distinct('purchaseId');
    const f = { referenceId: { $in: mine } };
    if (q.type && ['PURCHASE', 'PURCHASE_REVERSAL', 'PURCHASE_ROLLBACK'].includes(String(q.type))) f.type = String(q.type);
    const from = day(q.from); const to = day(q.to, true);
    if (from || to) f.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const s = String(q.search || '').trim().slice(0, 80);
    if (s) { const rx = new RegExp(esc(s), 'i'); f.$or = [{ productName: rx }, { sku: rx }, { referenceId: rx }]; }
    const { page, limit } = pageOf(q);
    const [total, rows] = await Promise.all([StockMovement.countDocuments(f), StockMovement.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
    return res.json({ success: true, total, page, pages: Math.max(1, Math.ceil(total / limit)), movements: rows.map(shapeMovement) });
  } catch (err) {
    console.error('[AdminPurchase] stock updates', err);
    return fail(res, 500, 'Could not load stock updates.');
  }
};

// ───────────────────────── dashboard ─────────────────────────

const sellerFilterFor = async (req) => {
  const ids = await scopedSellerIds(req.scope); // null = all sellers (the user has all-brand access)
  return ids ? { sellerId: { $in: ids } } : {};
};
const rupeesToPaise = (n) => Math.round((Number(n) || 0) * 100);

export const adminPurchaseDashboard = async (req, res) => {
  try {
    const q = req.query || {};
    const period = PERIODS.includes(q.period) ? q.period : 'day';
    const from = day(q.from); const to = day(q.to, true);
    const range = from || to ? { purchaseDate: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {};
    const mineMatch = { adminId: new mongoose.Types.ObjectId(String(req.user.id)), status: 'RECORDED', ...range };
    const sellerBase = await sellerFilterFor(req);
    const sellerMatch = { ...sellerBase, status: 'RECORDED', ...range };

    const [mineAgg, mineDays, recentMine, sellerCount, sellerAgg, sellerDays, recentSeller] = await Promise.all([
      AdminPurchase.aggregate([{ $match: mineMatch }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$finalPaise' }, qty: { $sum: '$totalQuantity' }, paid: { $sum: '$paidPaise' } } }]),
      AdminPurchase.aggregate([{ $match: mineMatch }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate', timezone: 'Asia/Kolkata' } }, purchases: { $sum: 1 }, amount: { $sum: '$finalPaise' }, quantity: { $sum: '$totalQuantity' } } }]),
      AdminPurchase.find({ adminId: req.user.id, status: { $in: ['RECORDED', 'CANCELLED'] } }).sort({ createdAt: -1 }).limit(5).lean(),
      Seller.countDocuments(sellerBase.sellerId ? { _id: sellerBase.sellerId } : {}),
      SellerPurchase.aggregate([{ $match: sellerMatch }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$totalAmount' }, qty: { $sum: '$quantity' }, sellers: { $addToSet: '$sellerId' } } }]),
      SellerPurchase.aggregate([{ $match: sellerMatch }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate', timezone: 'Asia/Kolkata' } }, purchases: { $sum: 1 }, amount: { $sum: '$totalAmount' }, quantity: { $sum: '$quantity' } } }]),
      SellerPurchase.find({ ...sellerBase, status: { $in: ['RECORDED', 'CANCELLED'] } }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    const m = mineAgg[0] || {}; const s = sellerAgg[0] || {};
    const sellerNames = new Map((await Seller.find({ _id: { $in: recentSeller.map((r) => r.sellerId) } }).select('businessName ownerName').lean()).map((x) => [String(x._id), x.ownerName || x.businessName]));
    return res.json({
      success: true, period,
      // My store and the associated sellers are reported separately and never added together
      myStore: { purchases: m.n || 0, amountPaise: m.amount || 0, quantity: m.qty || 0, paidPaise: m.paid || 0, outstandingPaise: Math.max(0, (m.amount || 0) - (m.paid || 0)) },
      sellers: { associatedSellers: sellerCount, sellersWithPurchases: s.sellers?.length || 0, purchases: s.n || 0, amountPaise: rupeesToPaise(s.amount), quantity: s.qty || 0 },
      myStoreSeries: rollUp(mineDays.map((d) => ({ day: d._id, purchases: d.purchases, amount: d.amount, quantity: d.quantity })), period, ['purchases', 'amount', 'quantity']),
      sellerSeries: rollUp(sellerDays.map((d) => ({ day: d._id, purchases: d.purchases, amount: Math.round(d.amount * 100), quantity: d.quantity })), period, ['purchases', 'amount', 'quantity']),
      recentMine: recentMine.map((r) => shape(r, { full: false })),
      recentSellerPurchases: recentSeller.map((r) => ({ id: String(r._id), purchaseId: r.purchaseId, sellerName: sellerNames.get(String(r.sellerId)) || '', productName: r.productName, quantity: r.quantity, amountPaise: rupeesToPaise(r.totalAmount), purchaseDate: r.purchaseDate, status: r.status })),
    });
  } catch (err) {
    console.error('[AdminPurchase] dashboard', err);
    return fail(res, 500, 'Could not load the dashboard.');
  }
};

// ───────────────────────── associated sellers (READ ONLY) ─────────────────────────

const sellerShape = (s) => ({ id: String(s._id), name: s.ownerName || s.businessName || '', storeName: s.businessName || '', phone: s.phone || '' });

/** Filter for seller purchases: only sellers inside this admin's authorised brand scope, plus the user's own filters. */
const associatedFilter = async (req) => {
  const q = req.query || {};
  const ids = await scopedSellerIds(req.scope);
  const f = {};
  if (ids) f.sellerId = { $in: ids };
  if (q.sellerId) {
    if (!isId(q.sellerId)) return { filter: { sellerId: { $in: [] } }, ids };
    const want = new mongoose.Types.ObjectId(String(q.sellerId));
    // a seller outside this admin's scope behaves as if it did not exist
    if (ids && !ids.some((x) => String(x) === String(want))) return { filter: { sellerId: { $in: [] } }, ids };
    f.sellerId = want;
  }
  if (q.status && q.status !== 'ALL') f.status = String(q.status).toUpperCase();
  const from = day(q.from); const to = day(q.to, true);
  if (from || to) f.purchaseDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  // sellers record no payment status: every seller purchase counts as "NOT_RECORDED"
  const ps = String(q.paymentStatus || '').toUpperCase();
  if (ps && ps !== 'ALL' && ps !== 'NOT_RECORDED') f.sellerId = { $in: [] };
  const s = String(q.search || '').trim().slice(0, 80);
  if (s) {
    const rx = new RegExp(esc(s), 'i');
    const nameIds = await Seller.find({ ...(ids ? { _id: { $in: ids } } : {}), $or: [{ businessName: rx }, { ownerName: rx }] }).distinct('_id');
    f.$or = [{ purchaseId: rx }, { sellerId: { $in: nameIds } }];
  }
  return { filter: f, ids };
};

export const listAssociatedSellers = async (req, res) => {
  try {
    const ids = await scopedSellerIds(req.scope);
    const sellers = await Seller.find(ids ? { _id: { $in: ids } } : {}).select('businessName ownerName phone').sort({ businessName: 1 }).limit(500).lean();
    return res.json({ success: true, sellers: sellers.map(sellerShape) });
  } catch (err) {
    console.error('[AdminPurchase] sellers', err);
    return fail(res, 500, 'Could not load sellers.');
  }
};

export const listAssociatedSellerPurchases = async (req, res) => {
  try {
    const { filter } = await associatedFilter(req);
    const { page, limit } = pageOf(req.query);
    const [total, rows, agg] = await Promise.all([
      SellerPurchase.countDocuments(filter),
      SellerPurchase.find(filter).sort({ purchaseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SellerPurchase.aggregate([{ $match: { ...filter, status: 'RECORDED' } }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$totalAmount' }, qty: { $sum: '$quantity' }, sellers: { $addToSet: '$sellerId' } } }]),
    ]);
    const sellers = new Map((await Seller.find({ _id: { $in: [...new Set(rows.map((r) => String(r.sellerId)))] } }).select('businessName ownerName phone').lean()).map((s) => [String(s._id), s]));
    const a = agg[0] || {};
    return res.json({
      success: true, total, page, pages: Math.max(1, Math.ceil(total / limit)), readOnly: true,
      summary: { purchases: a.n || 0, amountPaise: rupeesToPaise(a.amount), quantity: a.qty || 0, sellers: a.sellers?.length || 0 },
      purchases: rows.map((r) => {
        const s = sellers.get(String(r.sellerId));
        return {
          id: String(r._id), purchaseId: r.purchaseId, sellerId: String(r.sellerId), sellerName: s ? s.ownerName || s.businessName : '', storeName: s?.businessName || '', productName: r.productName, sku: r.sku, supplierName: r.supplierName,
          purchaseDate: r.purchaseDate, quantity: r.quantity, amountPaise: rupeesToPaise(r.totalAmount), paymentStatus: 'NOT_RECORDED', status: r.status, hasInvoice: Boolean(r.invoiceFile?.url),
        };
      }),
    });
  } catch (err) {
    console.error('[AdminPurchase] seller purchases', err);
    return fail(res, 500, 'Could not load seller purchases.');
  }
};

export const getAssociatedSellerPurchase = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Purchase not found.');
    const ids = await scopedSellerIds(req.scope);
    const r = await SellerPurchase.findOne({ _id: req.params.id, ...(ids ? { sellerId: { $in: ids } } : {}) }).lean();
    if (!r) return fail(res, 404, 'Purchase not found.'); // outside this admin's sellers: indistinguishable from missing
    const s = await Seller.findById(r.sellerId).select('businessName ownerName phone').lean();
    return res.json({
      success: true, readOnly: true,
      purchase: {
        id: String(r._id), purchaseId: r.purchaseId, seller: s ? sellerShape(s) : { id: String(r.sellerId) }, supplierName: r.supplierName, supplierPhone: r.supplierPhone, invoiceNumber: r.invoiceNumber, notes: r.notes, purchaseDate: r.purchaseDate, status: r.status, cancelReason: r.cancelReason,
        paymentStatus: 'NOT_RECORDED', stockUpdated: r.stockUpdated, previousStock: r.previousStock, newStock: r.newStock,
        products: [{ productName: r.productName, sku: r.sku, variantTitle: r.variantTitle, unit: r.unit, quantity: r.quantity, unitPricePaise: rupeesToPaise(r.unitPrice), amountPaise: rupeesToPaise(r.totalAmount) }],
        totalAmountPaise: rupeesToPaise(r.totalAmount), invoice: r.invoiceFile?.url ? { url: r.invoiceFile.url, name: r.invoiceFile.name, mime: r.invoiceFile.mime, size: r.invoiceFile.size } : null,
      },
    });
  } catch (err) {
    console.error('[AdminPurchase] seller purchase detail', err);
    return fail(res, 500, 'Could not load the purchase.');
  }
};

/** Total purchases per seller (only this admin's sellers) */
export const sellerWiseSummary = async (req, res) => {
  try {
    const { filter } = await associatedFilter(req);
    const rows = await SellerPurchase.aggregate([
      { $match: { ...filter, status: 'RECORDED' } },
      { $group: { _id: '$sellerId', purchases: { $sum: 1 }, quantity: { $sum: '$quantity' }, amount: { $sum: '$totalAmount' }, last: { $max: '$purchaseDate' }, suppliers: { $addToSet: { $toLower: '$supplierName' } } } },
      { $sort: { amount: -1 } },
    ]);
    const sellers = new Map((await Seller.find({ _id: { $in: rows.map((r) => r._id) } }).select('businessName ownerName phone').lean()).map((s) => [String(s._id), s]));
    const out = rows.map((r) => ({ ...sellerShape(sellers.get(String(r._id)) || { _id: r._id }), purchases: r.purchases, quantity: r.quantity, amountPaise: rupeesToPaise(r.amount), lastPurchaseDate: r.last, suppliers: r.suppliers.length }));
    return res.json({ success: true, readOnly: true, sellers: out, totalAmountPaise: out.reduce((t, x) => t + x.amountPaise, 0) });
  } catch (err) {
    console.error('[AdminPurchase] seller summary', err);
    return fail(res, 500, 'Could not load the summary.');
  }
};

// ───────────────────────── Super Admin: every admin's purchases ─────────────────────────

export const superListAdminPurchases = async (req, res) => {
  try {
    if (!isSuper(req)) return fail(res, 403, 'Only a Super Admin can view all admin purchases.');
    const q = req.query || {};
    const f = { status: { $in: ['RECORDED', 'CANCELLED', 'CANCELLING', 'PROCESSING'] } };
    if (q.adminId && isId(q.adminId)) f.adminId = new mongoose.Types.ObjectId(String(q.adminId));
    if (req.scope && !req.scope.isAll) f.brandId = req.scope.brandId;
    if (q.status && q.status !== 'ALL') f.status = String(q.status).toUpperCase();
    if (q.paymentStatus && PAY_STATUSES.includes(String(q.paymentStatus).toUpperCase())) f.paymentStatus = String(q.paymentStatus).toUpperCase();
    const from = day(q.from); const to = day(q.to, true);
    if (from || to) f.purchaseDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const s = String(q.search || '').trim().slice(0, 80);
    if (s) { const rx = new RegExp(esc(s), 'i'); f.$or = [{ purchaseId: rx }, { adminName: rx }, { supplierName: rx }, { 'lines.productName': rx }]; }
    const { page, limit } = pageOf(q);
    const [total, rows, agg, admins] = await Promise.all([
      AdminPurchase.countDocuments(f),
      AdminPurchase.find(f).sort({ purchaseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AdminPurchase.aggregate([{ $match: { ...f, status: 'RECORDED' } }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$finalPaise' }, qty: { $sum: '$totalQuantity' }, admins: { $addToSet: '$adminId' } } }]),
      AdminPurchase.aggregate([{ $group: { _id: '$adminId', name: { $last: '$adminName' } } }]),
    ]);
    const a = agg[0] || {};
    return res.json({
      success: true, total, page, pages: Math.max(1, Math.ceil(total / limit)),
      summary: { purchases: a.n || 0, amountPaise: a.amount || 0, quantity: a.qty || 0, admins: a.admins?.length || 0 },
      admins: admins.map((x) => ({ id: String(x._id), name: x.name })), purchases: rows.map((r) => shape(r, { full: false })),
    });
  } catch (err) {
    console.error('[AdminPurchase] super list', err);
    return fail(res, 500, 'Could not load admin purchases.');
  }
};

export const superGetAdminPurchase = async (req, res) => {
  try {
    if (!isSuper(req)) return fail(res, 403, 'Only a Super Admin can view this.');
    if (!isId(req.params.id)) return fail(res, 404, 'Purchase not found.');
    const p = await AdminPurchase.findById(req.params.id).lean();
    if (!p) return fail(res, 404, 'Purchase not found.');
    const movements = await StockMovement.find({ referenceId: p.purchaseId }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, purchase: shape(p), movements: movements.map(shapeMovement) });
  } catch (err) {
    console.error('[AdminPurchase] super get', err);
    return fail(res, 500, 'Could not load the purchase.');
  }
};

export { PAY_METHODS, PAY_STATUSES };

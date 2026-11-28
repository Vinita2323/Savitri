import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../config/cloudinary.js';
import Product from '../models/Product.model.js';
import Seller from '../models/Seller.model.js';
import SellerPurchase from '../models/SellerPurchase.model.js';
import { emitToRoom } from '../socket/socket.js';
import { invalidateProductsCache } from './productController.js';
import { buildSupplierBook, SUPPLIER_BOOK_SCAN } from '../utils/supplierBook.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round2 = (n) => Number(Number(n).toFixed(2));
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

// Days are Indian calendar days (IST, UTC+05:30) so a purchase falls on the same day in the list, report and export.
const parseDay = (value, endOfDay = false) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null;
  const d = new Date(`${String(value).slice(0, 10)}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Content-free pings: pages refetch through the authorised REST API.
const notifyChanged = (sellerId) => {
  emitToRoom('finance', 'purchase:changed', {});
  if (sellerId) emitToRoom(`seller:${String(sellerId)}`, 'purchase:changed', {});
};

// ───────────────────────── Invoice attachment ─────────────────────────

export const INVOICE_DIR = path.join(process.cwd(), 'uploads', 'seller_invoices');
export const INVOICE_MAX_BYTES = 5 * 1024 * 1024;
export const INVOICE_EXT = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

// The real file content must match the claimed type (an .exe renamed to .pdf is rejected).
const sniffMime = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    if (buf.slice(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    return null;
  } finally {
    fs.closeSync(fd);
  }
};

const cloudinaryOn = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  return Boolean(name && name !== 'your_cloud_name_here');
};

// POST /api/seller-purchases/invoice  (multipart field "file"). Stores the file and returns a reference
// that can be sent with a purchase. Files are named with the seller id, so they cannot be attached by another seller.
export const uploadPurchaseInvoice = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ success: false, message: 'Choose an invoice file (PDF, JPG, PNG or WEBP, up to 5 MB).' });
    const realMime = sniffMime(file.path);
    const claimedExt = path.extname(file.filename).toLowerCase();
    if (!realMime || INVOICE_EXT[claimedExt] !== realMime) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ success: false, message: 'This file is not a valid PDF or image. Please attach the original invoice file.' });
    }
    const sellerId = String(req.user.id);
    const meta = { name: String(file.originalname || 'invoice').slice(0, 120), mime: realMime, size: file.size };

    if (cloudinaryOn()) {
      try {
        const up = await uploadToCloudinary(file.path, `seller_invoices/${sellerId}`);
        fs.unlink(file.path, () => {});
        return res.status(200).json({ success: true, invoiceFile: { url: up.secure_url, ...meta } });
      } catch (err) {
        console.warn('[sellerPurchase] Cloudinary upload failed, keeping the file locally:', err.message);
      }
    }
    return res.status(200).json({ success: true, invoiceFile: { url: `/uploads/seller_invoices/${file.filename}`, ...meta } });
  } catch (err) {
    if (file?.path) fs.unlink(file.path, () => {});
    next(err);
  }
};

// Only references produced by uploadPurchaseInvoice for THIS seller are accepted (no arbitrary links).
const normalizeInvoiceRef = (ref, sellerId) => {
  if (ref === null || ref === undefined || ref === '') return { ok: true, value: null };
  if (typeof ref !== 'object') return { ok: false, message: 'Invoice attachment is not valid.' };
  const url = String(ref.url || '').trim();
  const sid = String(sellerId);
  let ok = false;
  const local = url.match(/^\/uploads\/seller_invoices\/([a-f0-9]{24})-[a-f0-9]{24}\.(pdf|jpg|png|webp)$/);
  if (local) {
    ok = local[1] === sid && fs.existsSync(path.join(INVOICE_DIR, path.basename(url)));
  } else if (/^https:\/\/res\.cloudinary\.com\//.test(url) && cloudinaryOn()) {
    ok = url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`) && url.includes(`/savitri/seller_invoices/${sid}/`);
  }
  if (!ok) return { ok: false, message: 'The invoice file could not be found. Please upload it again.' };
  return { ok: true, value: { url, name: String(ref.name || 'invoice').slice(0, 120), mime: String(ref.mime || '').slice(0, 60), size: Number(ref.size) || 0 } };
};

const newPurchaseId = () => {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `PUR-${ymd}-${Math.floor(10000 + Math.random() * 90000)}`;
};

/** Filters shared by the seller list, the super admin list and the CSV export. */
const buildFilter = (q = {}, base = {}) => {
  const filter = { ...base };
  if (q.status && q.status !== 'ALL') filter.status = String(q.status).toUpperCase();
  if (q.supplier) filter.supplierName = new RegExp(`^${escapeRegex(String(q.supplier).trim())}$`, 'i');
  if (q.category) filter.category = new RegExp(`^${escapeRegex(String(q.category).trim())}$`, 'i');
  if (q.productId && isId(q.productId)) filter.product = new mongoose.Types.ObjectId(String(q.productId));
  const from = parseDay(q.from);
  const to = parseDay(q.to, true);
  if (from || to) filter.purchaseDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const search = String(q.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search.slice(0, 80)), 'i');
    filter.$or = [{ purchaseId: rx }, { productName: rx }, { sku: rx }, { supplierName: rx }, { invoiceNumber: rx }];
  }
  return filter;
};

const summarize = async (filter) => {
  const [agg] = await SellerPurchase.aggregate([
    { $match: { ...filter, status: 'RECORDED' } },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: '$totalAmount' },
        purchases: { $sum: 1 },
        units: { $sum: '$quantity' },
        sellers: { $addToSet: '$sellerId' },
        suppliers: { $addToSet: { $toLower: '$supplierName' } },
      },
    },
  ]);
  const cancelled = await SellerPurchase.countDocuments({ ...filter, status: 'CANCELLED' });
  return {
    totalSpend: round2(agg?.totalSpend || 0),
    purchases: agg?.purchases || 0,
    units: agg?.units || 0,
    sellers: agg?.sellers?.length || 0,
    suppliers: agg?.suppliers?.length || 0,
    cancelled,
  };
};

const pageParams = (q) => {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  return { page, limit };
};

// ───────────────────────── Seller ─────────────────────────

// POST /api/seller-purchases
export const createSellerPurchase = async (req, res, next) => {
  try {
    const sellerId = String(req.user.id);
    const b = req.body || {};

    if (!isId(b.productId)) return res.status(400).json({ success: false, message: 'Select the product you purchased.' });
    const quantity = Number(b.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      return res.status(400).json({ success: false, message: 'Quantity must be a whole number between 1 and 1,000,000.' });
    }
    const unitPrice = Number(b.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10_000_000) {
      return res.status(400).json({ success: false, message: 'Purchase price per unit must be a number between 0 and 1,00,00,000.' });
    }
    const supplierName = String(b.supplierName || '').trim();
    if (!supplierName) return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    if (supplierName.length > 120) return res.status(400).json({ success: false, message: 'Supplier name is too long (max 120 characters).' });

    let purchaseDate = b.purchaseDate ? new Date(b.purchaseDate) : new Date();
    if (Number.isNaN(purchaseDate.getTime())) return res.status(400).json({ success: false, message: 'Purchase date is not valid.' });
    if (purchaseDate.getTime() > Date.now() + 24 * 3600 * 1000) {
      return res.status(400).json({ success: false, message: 'Purchase date cannot be in the future.' });
    }
    if (purchaseDate.getTime() < Date.now() - 5 * 365 * 24 * 3600 * 1000) {
      return res.status(400).json({ success: false, message: 'Purchase date is too old (more than 5 years).' });
    }

    const invoice = normalizeInvoiceRef(b.invoiceFile, sellerId);
    if (!invoice.ok) return res.status(400).json({ success: false, message: invoice.message });

    const product = await Product.findById(b.productId);
    if (!product || String(product.sellerId) !== sellerId) {
      return res.status(404).json({ success: false, message: 'Product not found in your catalogue.' });
    }

    const addToStock = b.addToStock !== false && b.addToStock !== 'false';
    const updateCostPrice = b.updateCostPrice !== false && b.updateCostPrice !== 'false';
    const activeVariants = (product.variants || []).filter((v) => v && v.active !== false);
    const variantSku = String(b.variantSku || '').trim();
    let variant = null;
    if (product.hasVariants && activeVariants.length > 0) {
      if (variantSku) {
        variant = activeVariants.find((v) => String(v.sku) === variantSku);
        if (!variant) return res.status(400).json({ success: false, message: 'The selected variant was not found on this product.' });
      } else if (addToStock) {
        return res.status(400).json({ success: false, message: 'This product has variants. Choose which variant you purchased so its stock can be updated.' });
      }
    }

    // 1) Stock first (atomic), so a failure never leaves a purchase without its stock.
    let previousStock = null;
    let newStock = null;
    if (addToStock) {
      const inc = variant ? { 'variants.$.stock': quantity, stock: quantity } : { stock: quantity };
      const filter = variant ? { _id: product._id, 'variants.sku': variant.sku } : { _id: product._id };
      const after = await Product.findOneAndUpdate(filter, { $inc: inc }, { new: true });
      if (!after) return res.status(409).json({ success: false, message: 'Could not update stock. Please try again.' });
      newStock = variant ? Number(after.variants.find((v) => v.sku === variant.sku)?.stock ?? 0) : Number(after.stock ?? 0);
      previousStock = newStock - quantity;
    }

    // 2) Record the purchase
    const doc = {
      sellerId: product.sellerId,
      product: product._id,
      productName: product.name,
      sku: variant ? variant.sku : String(product.sku || ''),
      variantSku: variant ? String(variant.sku) : '',
      variantTitle: variant ? String(variant.title || '') : '',
      category: String(product.category || ''),
      unit: String(product.unit || ''),
      quantity,
      unitPrice: round2(unitPrice),
      totalAmount: round2(quantity * unitPrice),
      supplierName,
      supplierPhone: String(b.supplierPhone || '').trim().slice(0, 20),
      invoiceNumber: String(b.invoiceNumber || '').trim().slice(0, 60),
      notes: String(b.notes || '').trim().slice(0, 500),
      ...(invoice.value ? { invoiceFile: invoice.value } : {}),
      purchaseDate,
      stockUpdated: addToStock,
      previousStock,
      newStock,
      costPriceUpdated: updateCostPrice,
      status: 'RECORDED',
    };

    let purchase = null;
    for (let attempt = 0; attempt < 4 && !purchase; attempt += 1) {
      try {
        purchase = await SellerPurchase.create({ ...doc, purchaseId: newPurchaseId() });
      } catch (err) {
        if (err?.code !== 11000 || attempt === 3) {
          if (addToStock) {
            const dec = variant ? { 'variants.$.stock': -quantity, stock: -quantity } : { stock: -quantity };
            await Product.updateOne(variant ? { _id: product._id, 'variants.sku': variant.sku } : { _id: product._id }, { $inc: dec }).catch(() => {});
          }
          throw err;
        }
      }
    }

    // 3) Latest purchase cost on the product (only the cost field; nothing else is touched)
    if (updateCostPrice) {
      await Product.updateOne({ _id: product._id }, { $set: { purchasePrice: round2(unitPrice) } });
    }
    if (addToStock || updateCostPrice) invalidateProductsCache();
    notifyChanged(product.sellerId);

    return res.status(201).json({ success: true, message: 'Purchase recorded.', purchase });
  } catch (err) {
    next(err);
  }
};

// PUT /api/seller-purchases/:id/invoice   body: { invoiceFile } (from the upload endpoint) or { invoiceFile: null } to remove
export const setPurchaseInvoice = async (req, res, next) => {
  try {
    const sellerId = String(req.user.id);
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Purchase not found.' });
    const purchase = await SellerPurchase.findOne({ _id: req.params.id, sellerId });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
    const invoice = normalizeInvoiceRef(req.body?.invoiceFile, sellerId);
    if (!invoice.ok) return res.status(400).json({ success: false, message: invoice.message });
    purchase.invoiceFile = invoice.value || { url: '', name: '', mime: '', size: 0 };
    await purchase.save();
    notifyChanged(sellerId);
    return res.status(200).json({ success: true, message: invoice.value ? 'Invoice attached.' : 'Invoice removed.', purchase });
  } catch (err) {
    next(err);
  }
};

// GET /api/seller-purchases   (the signed-in seller's own purchases)
/** GET /seller-purchases/suppliers: the suppliers this seller has bought from, newest first, with their latest phone. */
export const listMySellerSuppliers = async (req, res, next) => {
  try {
    const sellerId = new mongoose.Types.ObjectId(String(req.user.id));
    const rows = await SellerPurchase.find({ sellerId }).sort({ purchaseDate: -1, createdAt: -1 }).limit(SUPPLIER_BOOK_SCAN)
      .select('supplierName supplierPhone purchaseDate createdAt').lean();
    const suppliers = buildSupplierBook(rows, ['supplierPhone']).map((s) => ({ name: s.name, phone: s.supplierPhone, lastPurchaseAt: s.lastPurchaseAt, purchases: s.purchases }));
    res.status(200).json({ success: true, suppliers });
  } catch (error) {
    next(error);
  }
};

export const listMySellerPurchases = async (req, res, next) => {
  try {
    const sellerId = new mongoose.Types.ObjectId(String(req.user.id));
    const filter = buildFilter(req.query, { sellerId });
    const { page, limit } = pageParams(req.query);

    const [total, purchases, summary, suppliers] = await Promise.all([
      SellerPurchase.countDocuments(filter),
      SellerPurchase.find(filter).sort({ purchaseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      summarize(filter),
      SellerPurchase.distinct('supplierName', { sellerId }),
    ]);

    res.status(200).json({ success: true, total, page, pages: Math.max(1, Math.ceil(total / limit)), summary, suppliers: suppliers.sort(), purchases });
  } catch (err) {
    next(err);
  }
};

// PUT /api/seller-purchases/:id/cancel
export const cancelSellerPurchase = async (req, res, next) => {
  try {
    const sellerId = String(req.user.id);
    if (!isId(req.params.id)) return res.status(404).json({ success: false, message: 'Purchase not found.' });
    const purchase = await SellerPurchase.findOne({ _id: req.params.id, sellerId });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found.' });
    if (purchase.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'This purchase is already cancelled.' });

    if (purchase.stockUpdated) {
      const qty = purchase.quantity;
      const variant = purchase.variantSku;
      const filter = variant
        ? { _id: purchase.product, stock: { $gte: qty }, variants: { $elemMatch: { sku: variant, stock: { $gte: qty } } } }
        : { _id: purchase.product, stock: { $gte: qty } };
      const dec = variant ? { 'variants.$.stock': -qty, stock: -qty } : { stock: -qty };
      const res2 = await Product.updateOne(filter, { $inc: dec });
      if (!res2.modifiedCount) {
        return res.status(409).json({
          success: false,
          message: 'This purchase cannot be cancelled because part of that stock has already been sold or removed. Adjust the stock manually instead.',
        });
      }
      invalidateProductsCache();
    }

    purchase.status = 'CANCELLED';
    purchase.cancelledAt = new Date();
    purchase.cancelReason = String(req.body?.reason || '').trim().slice(0, 300);
    await purchase.save();
    notifyChanged(sellerId);
    return res.status(200).json({ success: true, message: 'Purchase cancelled and its stock reversed.', purchase });
  } catch (err) {
    next(err);
  }
};

// ───────────────────────── Super admin ─────────────────────────

export const scopedSellerIds = async (scope) => {
  if (!scope || scope.isAll) return null; // null = no brand restriction
  const or = [{ brandId: scope.brandId }, ...(scope.brand?._id ? [{ brand: scope.brand._id }] : [])];
  return Seller.find({ $or: or }).distinct('_id');
};

const adminFilter = async (req, extra = {}, query = req.query) => {
  const ids = await scopedSellerIds(req.scope);
  const base = {};
  if (ids) base.sellerId = { $in: ids };
  if (query.sellerId && isId(query.sellerId)) {
    const wanted = new mongoose.Types.ObjectId(String(query.sellerId));
    if (ids && !ids.some((x) => String(x) === String(wanted))) base.sellerId = { $in: [] }; // outside the selected brand
    else base.sellerId = wanted;
  }
  return { filter: buildFilter(query, { ...base, ...extra }), ids };
};

// ───────────────────────── Weekly / monthly report ─────────────────────────

const DAY_MS = 86400000;
const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const utcDay = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => ymd(new Date(utcDay(s).getTime() + n * DAY_MS));
const mondayOf = (s) => addDays(s, -((utcDay(s).getUTCDay() + 6) % 7));
const todayIST = () => ymd(new Date(Date.now() + 330 * 60 * 1000));
const lastDayOfMonth = (y, m) => ymd(new Date(Date.UTC(y, m, 0))); // m is 1-12
// Same key as MongoDB's '%G-W%V'
const isoWeekKey = (s) => {
  const d = utcDay(s);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const week = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad2(week)}`;
};

const MAX_BUCKETS = { week: 104, month: 60 };
const DEFAULT_BUCKETS = { week: 12, month: 12 };

const makeBuckets = (period, fromStr, toStr) => {
  const out = [];
  if (period === 'week') {
    let start = mondayOf(fromStr);
    const last = mondayOf(toStr);
    while (start <= last && out.length <= MAX_BUCKETS.week) {
      out.push({ key: isoWeekKey(start), start, end: addDays(start, 6) });
      start = addDays(start, 7);
    }
  } else {
    let y = Number(fromStr.slice(0, 4));
    let m = Number(fromStr.slice(5, 7));
    const ly = Number(toStr.slice(0, 4));
    const lm = Number(toStr.slice(5, 7));
    while ((y < ly || (y === ly && m <= lm)) && out.length <= MAX_BUCKETS.month) {
      out.push({ key: `${y}-${pad2(m)}`, start: `${y}-${pad2(m)}-01`, end: lastDayOfMonth(y, m) });
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }
  return out;
};

// GET /api/super-admin/seller-purchases/report?period=week|month&from=YYYY-MM-DD&to=YYYY-MM-DD (+ seller / supplier / category / search)
export const getSuperAdminSellerPurchaseReport = async (req, res, next) => {
  try {
    const period = String(req.query.period || 'week').toLowerCase() === 'month' ? 'month' : 'week';
    const today = todayIST();
    const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
    const to = isDay(req.query.to) ? String(req.query.to) : today;
    // "last=N": the last N whole weeks / months ending with the one that contains `to` (default 12)
    const lastN = Math.min(MAX_BUCKETS[period], Math.max(1, Math.floor(Number(req.query.last)) || DEFAULT_BUCKETS[period]));
    let from;
    if (isDay(req.query.from)) from = String(req.query.from);
    else if (period === 'week') from = addDays(mondayOf(to), -7 * (lastN - 1));
    else {
      let y = Number(to.slice(0, 4));
      let m = Number(to.slice(5, 7)) - (lastN - 1);
      while (m < 1) { m += 12; y -= 1; }
      from = `${y}-${pad2(m)}-01`;
    }
    if (from > to) return res.status(400).json({ success: false, message: 'The start date must be before the end date.' });

    const buckets = makeBuckets(period, from, to);
    if (buckets.length > MAX_BUCKETS[period]) {
      return res.status(400).json({ success: false, message: period === 'week' ? 'Choose a range of at most 104 weeks.' : 'Choose a range of at most 60 months.' });
    }
    const rangeStart = parseDay(buckets[0].start);
    const rangeEnd = parseDay(buckets[buckets.length - 1].end, true);

    // Report always uses recorded (not cancelled) purchases over whole periods; the other filters (seller, supplier, ...) apply.
    const q = { ...req.query };
    delete q.from; delete q.to; delete q.status;
    const { filter } = await adminFilter(req, { status: 'RECORDED', purchaseDate: { $gte: rangeStart, $lte: rangeEnd } }, q);

    const fmt = period === 'week' ? '%G-W%V' : '%Y-%m';
    const stats = {
      totalSpend: { $sum: '$totalAmount' },
      purchases: { $sum: 1 },
      units: { $sum: '$quantity' },
    };
    const top = [{ $sort: { totalSpend: -1 } }, { $limit: 10 }];
    const [agg] = await SellerPurchase.aggregate([
      { $match: filter },
      {
        $facet: {
          buckets: [{ $group: { _id: { $dateToString: { format: fmt, date: '$purchaseDate', timezone: 'Asia/Kolkata' } }, ...stats, sellers: { $addToSet: '$sellerId' }, suppliers: { $addToSet: { $toLower: '$supplierName' } } } }],
          totals: [{ $group: { _id: null, ...stats, sellers: { $addToSet: '$sellerId' }, suppliers: { $addToSet: { $toLower: '$supplierName' } } } }],
          bySeller: [{ $group: { _id: '$sellerId', ...stats } }, ...top],
          bySupplier: [{ $group: { _id: { $toLower: '$supplierName' }, name: { $first: '$supplierName' }, ...stats } }, ...top],
          byCategory: [{ $group: { _id: '$category', ...stats } }, ...top],
          byProduct: [{ $group: { _id: '$product', name: { $first: '$productName' }, ...stats } }, ...top],
        },
      },
    ]);

    const byKey = new Map((agg?.buckets || []).map((b) => [b._id, b]));
    const rows = buckets.map((b) => {
      const hit = byKey.get(b.key);
      return {
        key: b.key,
        start: b.start,
        end: b.end,
        current: b.start <= today && today <= b.end,
        totalSpend: round2(hit?.totalSpend || 0),
        purchases: hit?.purchases || 0,
        units: hit?.units || 0,
        sellers: hit?.sellers?.length || 0,
        suppliers: hit?.suppliers?.length || 0,
      };
    });

    const t = agg?.totals?.[0];
    const sellerIds = (agg?.bySeller || []).map((x) => x._id).filter(Boolean);
    const sellerDocs = await Seller.find({ _id: { $in: sellerIds } }).select('businessName ownerName').lean();
    const nameOf = new Map(sellerDocs.map((s) => [String(s._id), s.businessName || s.ownerName || 'Seller']));
    const shape = (x, name) => ({ name: name || 'Unspecified', totalSpend: round2(x.totalSpend), purchases: x.purchases, units: x.units });

    res.status(200).json({
      success: true,
      scope: { isAll: Boolean(req.scope?.isAll), brandId: req.scope?.brandId || 'ALL', brandName: req.scope?.brand?.name || 'All Regions' },
      period,
      from: buckets[0].start,
      to: buckets[buckets.length - 1].end,
      today,
      buckets: rows,
      totals: {
        totalSpend: round2(t?.totalSpend || 0),
        purchases: t?.purchases || 0,
        units: t?.units || 0,
        sellers: t?.sellers?.length || 0,
        suppliers: t?.suppliers?.length || 0,
      },
      breakdown: {
        sellers: (agg?.bySeller || []).map((x) => ({ id: String(x._id), ...shape(x, nameOf.get(String(x._id))) })),
        suppliers: (agg?.bySupplier || []).map((x) => shape(x, x.name)),
        categories: (agg?.byCategory || []).map((x) => shape(x, x._id)),
        products: (agg?.byProduct || []).map((x) => shape(x, x.name)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/super-admin/seller-purchases
export const getSuperAdminSellerPurchases = async (req, res, next) => {
  try {
    const { filter, ids } = await adminFilter(req);
    const { page, limit } = pageParams(req.query);
    const scopeOnly = ids ? { sellerId: { $in: ids } } : {};

    const [total, rows, summary, supplierNames, categoryNames, sellerRows] = await Promise.all([
      SellerPurchase.countDocuments(filter),
      SellerPurchase.find(filter)
        .populate('sellerId', 'businessName ownerName phone city brandId')
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      summarize(filter),
      SellerPurchase.distinct('supplierName', scopeOnly),
      SellerPurchase.distinct('category', scopeOnly),
      SellerPurchase.distinct('sellerId', scopeOnly),
    ]);
    const sellerDocs = await Seller.find({ _id: { $in: sellerRows } }).select('businessName ownerName').lean();

    const purchases = rows.map((p) => {
      const s = p.sellerId && typeof p.sellerId === 'object' ? p.sellerId : null;
      return {
        ...p,
        sellerId: s ? String(s._id) : String(p.sellerId || ''),
        seller: s ? { id: String(s._id), name: s.businessName || s.ownerName || 'Seller', phone: s.phone || '', city: s.city || '' } : null,
      };
    });

    res.status(200).json({
      success: true,
      scope: { isAll: Boolean(req.scope?.isAll), brandId: req.scope?.brandId || 'ALL', brandName: req.scope?.brand?.name || 'All Regions' },
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      summary,
      facets: {
        suppliers: supplierNames.filter(Boolean).sort((a, b) => a.localeCompare(b)),
        categories: categoryNames.filter(Boolean).sort((a, b) => a.localeCompare(b)),
        sellers: sellerDocs.map((s) => ({ id: String(s._id), name: s.businessName || s.ownerName || 'Seller' })).sort((a, b) => a.name.localeCompare(b.name)),
      },
      purchases,
    });
  } catch (err) {
    next(err);
  }
};

const csvCell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /api/super-admin/seller-purchases/export
export const exportSuperAdminSellerPurchases = async (req, res, next) => {
  try {
    const { filter } = await adminFilter(req);
    const rows = await SellerPurchase.find(filter)
      .populate('sellerId', 'businessName ownerName')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(5000)
      .lean();
    const head = ['Purchase ID', 'Date', 'Seller', 'Product', 'SKU', 'Variant', 'Category', 'Quantity', 'Unit', 'Unit Price (INR)', 'Total (INR)', 'Supplier', 'Supplier Phone', 'Invoice No', 'Invoice File', 'Status', 'Stock Added', 'Notes'];
    const lines = [head.map(csvCell).join(',')];
    for (const p of rows) {
      const s = p.sellerId && typeof p.sellerId === 'object' ? p.sellerId : null;
      lines.push([
        p.purchaseId, new Date(p.purchaseDate).toISOString().slice(0, 10), s ? s.businessName || s.ownerName : '', p.productName, p.sku, p.variantTitle,
        p.category, p.quantity, p.unit, p.unitPrice, p.totalAmount, p.supplierName, p.supplierPhone, p.invoiceNumber, p.invoiceFile?.url ? 'Attached' : 'No', p.status, p.stockUpdated ? 'Yes' : 'No', p.notes,
      ].map(csvCell).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="seller-purchases-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send('﻿' + lines.join('\r\n'));
  } catch (err) {
    next(err);
  }
};

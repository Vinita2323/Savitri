import mongoose from 'mongoose';
import Seller from '../models/Seller.model.js';
import FinancialAuditLog from '../models/FinancialAuditLog.model.js';
import { sellerScopeFilter, sellerInScope } from '../middleware/scopeMiddleware.js';
import {
  getGlobalSellerCommission,
  parseCommissionPercent,
  resolveSellerCommissionRate,
  sellerHasCustomCommission,
} from '../utils/commissionRate.js';
import { invalidateSellersCache } from './adminController.js';

/**
 * Seller commission management - the ONLY workflow that changes a seller's commission.
 * Admin and Super Admin may both use it; the backend enforces:
 *   - role (route level: admin / super_admin),
 *   - brand scope (a seller outside the caller's brand is reported as 404),
 *   - strict 0-100 validation,
 *   - a mandatory audit record (admin id, real e-mail, role, brand, seller, previous/new rate, remark).
 */

const AUDIT_ACTIONS = ['COMMISSION_SET', 'COMMISSION_RESET', 'UPDATE_COMMISSION'];

const view = (seller, globalRate) => ({
  _id: seller._id,
  businessName: seller.businessName,
  ownerName: seller.ownerName,
  phone: seller.phone,
  email: seller.email,
  brandId: seller.brandId || '',
  status: seller.status,
  commissionPercentage: resolveSellerCommissionRate(seller, globalRate), // effective rate
  isCustomCommission: sellerHasCustomCommission(seller),
  globalCommissionPercentage: globalRate,
  totalEarnings: seller.totalEarnings || 0,
  totalCommissionDeducted: seller.totalCommissionDeducted || 0,
  walletBalance: seller.walletBalance || 0,
});

const sellerRef = (req) => String(req.params.sellerId || req.params.id || '');

const loadScopedSeller = async (req, res) => {
  const id = sellerRef(req);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ success: false, message: 'Seller not found' });
    return null;
  }
  const seller = await Seller.findById(id);
  // Out-of-scope sellers are indistinguishable from missing ones
  if (!seller || !sellerInScope(req.scope, seller)) {
    res.status(404).json({ success: false, message: 'Seller not found' });
    return null;
  }
  return seller;
};

/** Audit record for a commission change. Throws on failure so the caller can undo the change. */
const writeCommissionAudit = async (req, seller, { action, previous, next, remarks }) => {
  const actorEmail = req.user?.email;
  if (!actorEmail) throw new Error('Cannot audit a commission change without the acting admin\'s e-mail.');
  await FinancialAuditLog.create({
    logId: `AUD-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`,
    actorId: mongoose.Types.ObjectId.isValid(String(req.user?.id)) ? req.user.id : null,
    actorEmail,
    actorRole: req.user.role,
    action,
    targetEntity: 'Seller',
    targetId: String(seller._id),
    sellerId: String(seller._id),
    brandId: seller.brandId || req.scope?.brandId || '',
    previousValue: previous,
    newValue: next,
    ipAddress: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
    remarks,
  });
};

const restoreSeller = async (id, before) => {
  const restore = { $set: { commissionPercentage: before.commissionPercentage } };
  if (before.hasCustomCommission === undefined) restore.$unset = { hasCustomCommission: '' };
  else restore.$set.hasCustomCommission = before.hasCustomCommission;
  await Seller.updateOne({ _id: id }, restore);
};

const cleanRemark = (v) => String(v ?? '').trim().slice(0, 500);

// GET /commissions
export const listSellerCommissions = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const globalRate = await getGlobalSellerCommission();
    const sellers = await Seller.find({ ...sellerScopeFilter(scope) })
      .select('_id businessName ownerName phone email brandId commissionPercentage hasCustomCommission totalEarnings totalCommissionDeducted walletBalance status')
      .sort({ totalCommissionDeducted: -1 });
    res.status(200).json({
      success: true,
      scope: { isAll: scope.isAll, brandId: scope.brandId, brandName: scope.brand?.name || 'All Regions', city: scope.city },
      globalCommissionPercentage: globalRate,
      count: sellers.length,
      sellers: sellers.map((s) => view(s, globalRate)),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /sellers/:sellerId/commission   (also mounted at /api/admin/sellers/:id/commission)
export const setSellerCommission = async (req, res, next) => {
  try {
    const rate = parseCommissionPercent((req.body || {}).commissionPercentage);
    if (rate === null) {
      return res.status(400).json({ success: false, message: 'Commission must be a number between 0 and 100.' });
    }
    const remark = cleanRemark((req.body || {}).remarks);

    const seller = await loadScopedSeller(req, res);
    if (!seller) return;

    const globalRate = await getGlobalSellerCommission();
    const wasCustom = sellerHasCustomCommission(seller);
    const previousRate = resolveSellerCommissionRate(seller, globalRate);
    if (wasCustom && previousRate === rate) {
      return res.status(200).json({ success: true, changed: false, message: 'Commission is already set to this rate.', seller: view(seller, globalRate) });
    }

    const before = { commissionPercentage: seller.commissionPercentage, hasCustomCommission: seller.hasCustomCommission };
    // Compare-and-set on the previous stored state so two concurrent edits cannot both claim "previous"
    const updated = await Seller.findOneAndUpdate(
      { _id: seller._id, commissionPercentage: seller.commissionPercentage },
      { $set: { commissionPercentage: rate, hasCustomCommission: true } },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ success: false, message: 'This seller\'s commission was just changed by someone else. Reload and try again.' });
    }
    try {
      await writeCommissionAudit(req, seller, {
        action: 'COMMISSION_SET',
        previous: { commissionPercentage: previousRate, custom: wasCustom },
        next: { commissionPercentage: rate, custom: true },
        remarks: remark || `Commission changed from ${previousRate}% to ${rate}%`,
      });
    } catch (auditError) {
      // A change without its audit record must not stand
      await restoreSeller(seller._id, before);
      throw auditError;
    }
    invalidateSellersCache();
    res.status(200).json({
      success: true,
      changed: true,
      message: `Commission for "${updated.businessName}" set to ${rate}%`,
      seller: view(updated, globalRate),
    });
  } catch (error) {
    next(error);
  }
};

// POST /sellers/:sellerId/commission/reset
export const resetSellerCommission = async (req, res, next) => {
  try {
    const remark = cleanRemark((req.body || {}).remarks);
    const seller = await loadScopedSeller(req, res);
    if (!seller) return;

    const globalRate = await getGlobalSellerCommission();
    if (!sellerHasCustomCommission(seller)) {
      return res.status(200).json({ success: true, changed: false, message: 'This seller already follows the global default.', seller: view(seller, globalRate) });
    }
    const previousRate = Number(seller.commissionPercentage);
    const before = { commissionPercentage: seller.commissionPercentage, hasCustomCommission: seller.hasCustomCommission };

    const updated = await Seller.findOneAndUpdate(
      { _id: seller._id, commissionPercentage: seller.commissionPercentage },
      { $set: { commissionPercentage: globalRate, hasCustomCommission: false } },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ success: false, message: 'This seller\'s commission was just changed by someone else. Reload and try again.' });
    }
    try {
      await writeCommissionAudit(req, seller, {
        action: 'COMMISSION_RESET',
        previous: { commissionPercentage: previousRate, custom: true },
        next: { commissionPercentage: globalRate, custom: false },
        remarks: remark || `Custom commission ${previousRate}% reset to the global default ${globalRate}%`,
      });
    } catch (auditError) {
      await restoreSeller(seller._id, before);
      throw auditError;
    }
    invalidateSellersCache();
    res.status(200).json({
      success: true,
      changed: true,
      message: `Commission for "${updated.businessName}" reset to the global default (${globalRate}%)`,
      seller: view(updated, globalRate),
    });
  } catch (error) {
    next(error);
  }
};

const historyFilter = (req) => {
  const scope = req.scope || { isAll: true };
  const filter = { action: { $in: AUDIT_ACTIONS }, targetEntity: 'Seller' };
  if (!scope.isAll) filter.brandId = scope.brandId;
  return filter;
};

const shapeLog = (l) => ({
  id: l.logId,
  action: l.action,
  adminId: l.actorId,
  email: l.actorEmail,
  role: l.actorRole,
  brandId: l.brandId,
  sellerId: l.sellerId || l.targetId,
  previousCommission: l.previousValue?.commissionPercentage ?? null,
  newCommission: l.newValue?.commissionPercentage ?? null,
  remark: l.remarks,
  at: l.createdAt,
});

// GET /commissions/history  (optionally ?sellerId=)
export const getCommissionHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const filter = historyFilter(req);
    if (req.query.sellerId) {
      if (!mongoose.Types.ObjectId.isValid(String(req.query.sellerId))) return res.status(200).json({ success: true, total: 0, history: [] });
      filter.sellerId = String(req.query.sellerId);
    }
    const [rows, total] = await Promise.all([
      FinancialAuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      FinancialAuditLog.countDocuments(filter),
    ]);
    res.status(200).json({ success: true, total, page, history: rows.map(shapeLog) });
  } catch (error) {
    next(error);
  }
};

// GET /sellers/:sellerId/commission/history
export const getSellerCommissionHistory = async (req, res, next) => {
  try {
    const seller = await loadScopedSeller(req, res);
    if (!seller) return;
    const rows = await FinancialAuditLog.find({ action: { $in: AUDIT_ACTIONS }, targetEntity: 'Seller', $or: [{ sellerId: String(seller._id) }, { targetId: String(seller._id) }] })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.status(200).json({ success: true, total: rows.length, history: rows.map(shapeLog) });
  } catch (error) {
    next(error);
  }
};

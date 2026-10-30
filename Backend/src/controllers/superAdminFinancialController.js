import mongoose from 'mongoose';
import PlatformLedger from '../models/PlatformLedger.model.js';
import PayoutRequest from '../models/PayoutRequest.model.js';
import FinancialAdjustment from '../models/FinancialAdjustment.model.js';
import RefundRequest from '../models/RefundRequest.model.js';
import FinancialAuditLog from '../models/FinancialAuditLog.model.js';
import Seller from '../models/Seller.model.js';
import Captain from '../models/Captain.model.js';
import Order from '../models/Order.model.js';
import SellerNotification from '../models/SellerNotification.model.js';
import WalletTransaction from '../models/WalletTransaction.model.js';
import WithdrawalRequest from '../models/WithdrawalRequest.model.js';
import CaptainTransaction from '../models/CaptainTransaction.model.js';
import CodCashCollection from '../models/CodCashCollection.model.js';
import CaptainCashSettlement from '../models/CaptainCashSettlement.model.js';
import Product from '../models/Product.model.js';
import User from '../models/User.model.js';
import Brand from '../models/Brand.model.js';
import { getCityRegex, getScopedSellerIds, getScopedCaptainIds, sellerScopeFilter, sellerInScope } from '../middleware/scopeMiddleware.js';

// Helper: Log financial audit entry
const logAudit = async ({
  actorId,
  actorEmail,
  action,
  targetEntity,
  targetId,
  amount = null,
  previousValue = null,
  newValue = null,
  ipAddress = '',
  userAgent = '',
  remarks = '',
}) => {
  try {
    const logId = `AUD-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    await FinancialAuditLog.create({
      logId,
      actorId,
      actorEmail: actorEmail || 'superadmin@savitri.com',
      actorRole: 'super_admin',
      action,
      targetEntity,
      targetId: String(targetId || ''),
      amount,
      previousValue,
      newValue,
      ipAddress,
      userAgent,
      remarks,
    });
  } catch (err) {
    console.error('[FinancialAuditLog] Failed to record audit log:', err.message);
  }
};

// =========================================================================
// 1. FINANCIAL DASHBOARD LIVE METRICS (BRAND & REGION SCOPED)
// =========================================================================
export const getFinancialDashboardStats = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const cityRegex = getCityRegex(scope.city);

    // Resolve scoped entity IDs if not global
    const scopedSellerIds = await getScopedSellerIds(scope);
    const scopedCaptainIds = await getScopedCaptainIds(scope);
    const sellerIdStrs = (scopedSellerIds || []).map((id) => id.toString());
    const captainIdStrs = (scopedCaptainIds || []).map((id) => id.toString());

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Match conditions
    const orderMatch = {
      $or: [{ paymentStatus: 'Paid' }, { paymentMethod: 'COD' }],
    };
    const todayOrderMatch = {
      createdAt: { $gte: todayStart },
      $or: [{ paymentStatus: 'Paid' }, { paymentMethod: 'COD' }],
    };

    if (!scope.isAll && cityRegex) {
      orderMatch['shippingAddress.city'] = cityRegex;
      todayOrderMatch['shippingAddress.city'] = cityRegex;
    }

    const sellerMatch = {};
    if (!scope.isAll && cityRegex) {
      sellerMatch['warehouseLocation.city'] = cityRegex;
    }

    const captainMatch = {};
    if (!scope.isAll && cityRegex) {
      captainMatch['city'] = cityRegex;
    }

    const payoutMatch = { status: { $in: ['PENDING', 'APPROVED', 'PROCESSING'] } };
    const completedPayoutMatch = { status: 'PAID' };
    const todayPayoutMatch = { status: 'PAID', paidAt: { $gte: todayStart } };

    if (!scope.isAll) {
      const recipientOr = [
        { recipientType: 'SELLER', recipientId: { $in: sellerIdStrs } },
        { recipientType: 'CAPTAIN', recipientId: { $in: captainIdStrs } },
      ];
      payoutMatch.$or = recipientOr;
      completedPayoutMatch.$or = recipientOr;
      todayPayoutMatch.$or = recipientOr;
    }

    // Settlements match
    const settlementMatch = { settlementStatus: 'PENDING' };
    if (!scope.isAll && sellerIdStrs.length > 0) {
      settlementMatch.sellerId = { $in: sellerIdStrs };
    }

    // Monthly volume match
    const monthlyOrderMatch = {
      createdAt: { $gte: sixMonthsAgo },
      $or: [{ paymentStatus: 'Paid' }, { paymentMethod: 'COD' }],
    };
    if (!scope.isAll && cityRegex) {
      monthlyOrderMatch['shippingAddress.city'] = cityRegex;
    }

    // Recent ledger match
    const ledgerFilter = {};
    if (!scope.isAll) {
      const allScopedIds = [...sellerIdStrs, ...captainIdStrs];
      ledgerFilter.$or = [
        { 'metadata.brandId': scope.brandId },
        { 'metadata.city': cityRegex },
        { entityId: { $in: allScopedIds } },
      ];
    }

    const [
      ordersAgg,
      todayOrdersAgg,
      sellersAgg,
      captainsAgg,
      pendingPayoutsAgg,
      completedPayoutsAgg,
      todayPayoutsAgg,
      refundsAgg,
      pendingSettlementsAgg,
      monthlyVolumeAgg,
      recentLedger,
    ] = await Promise.all([
      // Total Gross Volume & Total Orders
      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCount: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Today's Revenue & Transactions
      Order.aggregate([
        { $match: todayOrderMatch },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: '$grandTotal' },
            todayCount: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Total Seller Earnings & Liabilities
      Seller.aggregate([
        ...(Object.keys(sellerMatch).length > 0 ? [{ $match: sellerMatch }] : []),
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$totalEarnings' },
            totalCommission: { $sum: '$totalCommissionDeducted' },
            totalWalletLiabilities: { $sum: '$walletBalance' },
            totalWithdrawn: { $sum: '$totalWithdrawn' },
          },
        },
      ]).catch(() => []),

      // Total Captain Balance & Liabilities
      Captain.aggregate([
        ...(Object.keys(captainMatch).length > 0 ? [{ $match: captainMatch }] : []),
        {
          $group: {
            _id: null,
            totalWalletLiabilities: { $sum: '$walletBalance' },
            totalCashCollected: { $sum: '$cashCollected' },
            totalOutstandingCash: { $sum: '$outstandingCash' },
            totalCodCollected: { $sum: '$totalCodCollected' },
          },
        },
      ]).catch(() => []),

      // Pending Payouts (both Seller & Captain)
      PayoutRequest.aggregate([
        { $match: payoutMatch },
        {
          $group: {
            _id: '$recipientType',
            totalAmount: { $sum: '$requestedAmount' },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Completed Payouts
      PayoutRequest.aggregate([
        { $match: completedPayoutMatch },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$approvedAmount' },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Today Completed Payouts
      PayoutRequest.aggregate([
        { $match: todayPayoutMatch },
        {
          $group: {
            _id: null,
            todayPayoutAmount: { $sum: '$approvedAmount' },
            todayPayoutCount: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Refunds Summary
      RefundRequest.aggregate([
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Pending Settlements from Seller Notifications
      SellerNotification.aggregate([
        { $match: settlementMatch },
        {
          $group: {
            _id: null,
            pendingSellerAmount: { $sum: '$netSellerAmount' },
            pendingCommission: { $sum: '$commissionAmount' },
            count: { $sum: 1 },
          },
        },
      ]).catch(() => []),

      // Monthly Volumes (last 6 months)
      Order.aggregate([
        { $match: monthlyOrderMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            volume: { $sum: '$grandTotal' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).catch(() => []),

      // Recent 10 Central Ledger entries
      PlatformLedger.find(ledgerFilter).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
    ]);

    // Extract metrics
    const totalPlatformRevenue = Number((ordersAgg[0]?.totalRevenue || 0).toFixed(2));
    const totalCustomerTransactions = ordersAgg[0]?.totalCount || 0;

    const todayRevenue = Number((todayOrdersAgg[0]?.todayRevenue || 0).toFixed(2));
    const todayTransactions = todayOrdersAgg[0]?.todayCount || 0;

    const totalSellerEarnings = Number((sellersAgg[0]?.totalEarnings || 0).toFixed(2));
    const totalPlatformCommission = Number((sellersAgg[0]?.totalCommission || 0).toFixed(2));
    const sellerOutstandingLiability = Number((sellersAgg[0]?.totalWalletLiabilities || 0).toFixed(2));

    const captainOutstandingLiability = Number((captainsAgg[0]?.totalWalletLiabilities || 0).toFixed(2));

    // Calculate Captain Total Earnings from transactions
    const captainTxnMatch = { type: 'CREDIT' };
    if (!scope.isAll && scopedCaptainIds && scopedCaptainIds.length > 0) {
      captainTxnMatch.captainId = { $in: scopedCaptainIds };
    }
    const captainEarningsAgg = await CaptainTransaction.aggregate([
      { $match: captainTxnMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).catch(() => []);
    const totalCaptainEarnings = Number((captainEarningsAgg[0]?.total || 0).toFixed(2));

    // Pending Payouts breakdown
    let pendingSellerPayouts = 0;
    let pendingSellerPayoutsCount = 0;
    let pendingCaptainPayouts = 0;
    let pendingCaptainPayoutsCount = 0;

    pendingPayoutsAgg.forEach((group) => {
      if (group._id === 'SELLER') {
        pendingSellerPayouts = Number((group.totalAmount || 0).toFixed(2));
        pendingSellerPayoutsCount = group.count || 0;
      } else if (group._id === 'CAPTAIN') {
        pendingCaptainPayouts = Number((group.totalAmount || 0).toFixed(2));
        pendingCaptainPayoutsCount = group.count || 0;
      }
    });

    // Completed payouts
    const totalCompletedPayouts = Number((completedPayoutsAgg[0]?.totalAmount || 0).toFixed(2));
    const totalCompletedPayoutsCount = completedPayoutsAgg[0]?.count || 0;

    const todayPayoutsAmount = Number((todayPayoutsAgg[0]?.todayPayoutAmount || 0).toFixed(2));
    const todayPayoutsCount = todayPayoutsAgg[0]?.todayPayoutCount || 0;

    // Settlements
    const pendingSettlementsAmount = Number((pendingSettlementsAgg[0]?.pendingSellerAmount || 0).toFixed(2));
    const pendingSettlementsCount = pendingSettlementsAgg[0]?.count || 0;

    // Total Platform Liabilities (Money currently owed to sellers and captains in their wallets)
    const totalOutstandingLiabilities = Number(
      (sellerOutstandingLiability + captainOutstandingLiability).toFixed(2)
    );

    // Total refunds processed
    const completedRefunds = refundsAgg.find((r) => r._id === 'COMPLETED');
    const totalRefundsAmount = Number((completedRefunds?.totalAmount || 0).toFixed(2));
    const totalRefundsCount = completedRefunds?.count || 0;

    // Captain COD Cash & Settlement metrics
    const outstandingCaptainCash = Number((captainsAgg[0]?.totalOutstandingCash || 0).toFixed(2));
    const totalCodCollected = Number(
      (captainsAgg[0]?.totalCodCollected || captainsAgg[0]?.totalCashCollected || 0).toFixed(2)
    );

    const cashSettlementMatch = { status: 'PENDING' };
    if (!scope.isAll && scopedCaptainIds && scopedCaptainIds.length > 0) {
      cashSettlementMatch.captainId = { $in: scopedCaptainIds };
    }
    const pendingCaptainCashSettlements = await CaptainCashSettlement.aggregate([
      { $match: cashSettlementMatch },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).catch(() => []);
    const pendingCashSettlementsAmount = Number((pendingCaptainCashSettlements[0]?.totalAmount || 0).toFixed(2));
    const pendingCashSettlementsCount = pendingCaptainCashSettlements[0]?.count || 0;

    // Format Monthly Charts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const found = monthlyVolumeAgg.find((m) => m._id === key);
      monthlyChartData.push({
        month: label,
        volume: found ? Number(found.volume.toFixed(2)) : 0,
        orders: found ? found.count : 0,
      });
    }

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
        state: scope.state,
      },
      metrics: {
        totalPlatformRevenue,
        totalCustomerTransactions,
        totalSellerEarnings,
        totalCaptainEarnings,
        totalPlatformCommission,
        totalPendingSellerPayouts: pendingSellerPayouts,
        pendingSellerPayoutsCount,
        totalPendingCaptainPayouts: pendingCaptainPayouts,
        pendingCaptainPayoutsCount,
        totalCompletedPayouts,
        totalCompletedPayoutsCount,
        totalPendingSettlements: pendingSettlementsAmount,
        pendingSettlementsCount,
        todayTransactionsVolume: todayRevenue,
        todayTransactionsCount: todayTransactions,
        todayPayoutsAmount,
        todayPayoutsCount,
        totalOutstandingLiabilities,
        sellerOutstandingLiability,
        captainOutstandingLiability,
        totalRefundsAmount,
        totalRefundsCount,
        outstandingCaptainCash,
        totalCodCollected,
        pendingCashSettlementsAmount,
        pendingCashSettlementsCount,
      },
      monthlyChartData,
      recentLedger,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 2. CENTRAL TRANSACTION LEDGER (BRAND & REGION SCOPED)
// =========================================================================
export const getLedgerTransactions = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const { category, type, status, entityType, search, startDate, endDate } = req.query;

    const query = {};

    if (category && category !== 'ALL') query.category = category;
    if (type && type !== 'ALL') query.type = type;
    if (status && status !== 'ALL') query.status = status;
    if (entityType && entityType !== 'ALL') query.entityType = entityType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { transactionId: { $regex: cleanSearch, $options: 'i' } },
        { referenceId: { $regex: cleanSearch, $options: 'i' } },
        { entityName: { $regex: cleanSearch, $options: 'i' } },
        { description: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    // Apply Scope Filter
    if (!scope.isAll) {
      const scopedSellerIds = await getScopedSellerIds(scope);
      const scopedCaptainIds = await getScopedCaptainIds(scope);
      const allScopedIds = [
        ...(scopedSellerIds || []).map((id) => id.toString()),
        ...(scopedCaptainIds || []).map((id) => id.toString()),
      ];

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'metadata.brandId': scope.brandId },
          { 'metadata.city': getCityRegex(scope.city) },
          { entityId: { $in: allScopedIds } },
        ],
      });
    }

    const [transactions, total, totalsAgg] = await Promise.all([
      PlatformLedger.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PlatformLedger.countDocuments(query),
      // Totals over the whole filtered/scoped result set (not just the current page)
      PlatformLedger.aggregate([
        { $match: query },
        { $group: { _id: { category: '$category', status: '$status' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const sumWhere = (predicate) =>
      totalsAgg.filter((r) => predicate(r._id)).reduce((acc, r) => acc + (r.total || 0), 0);
    const summary = {
      collections: sumWhere((k) => k.status === 'SUCCESS' && ['CUSTOMER_PAYMENT', 'MEMBERSHIP_FEE', 'REGISTRATION_FEE'].includes(k.category)),
      commission: sumWhere((k) => k.status === 'SUCCESS' && k.category === 'PLATFORM_COMMISSION'),
      sellerPayouts: sumWhere((k) => k.status === 'SUCCESS' && k.category === 'SELLER_PAYOUT'),
      refunds: sumWhere((k) => k.status === 'SUCCESS' && k.category === 'REFUND'),
      pending: sumWhere((k) => k.status === 'PENDING'),
    };

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      count: transactions.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      summary,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 3. UNIFIED PAYOUT REQUESTS (SELLER & CAPTAIN) (BRAND & REGION SCOPED)
// =========================================================================
export const getPayoutRequests = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { recipientType, status, search, startDate, endDate } = req.query;

    const query = {};

    if (recipientType && recipientType !== 'ALL') {
      query.recipientType = recipientType.toUpperCase();
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const clean = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { payoutId: { $regex: clean, $options: 'i' } },
        { recipientName: { $regex: clean, $options: 'i' } },
        { recipientPhone: { $regex: clean, $options: 'i' } },
        { paymentReference: { $regex: clean, $options: 'i' } },
      ];
    }

    // Apply Region Scope to Payouts
    if (!scope.isAll) {
      const scopedSellerIds = await getScopedSellerIds(scope);
      const scopedCaptainIds = await getScopedCaptainIds(scope);
      const sellerIdStrs = (scopedSellerIds || []).map((id) => id.toString());
      const captainIdStrs = (scopedCaptainIds || []).map((id) => id.toString());

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { recipientType: 'SELLER', recipientId: { $in: sellerIdStrs } },
          { recipientType: 'CAPTAIN', recipientId: { $in: captainIdStrs } },
        ],
      });
    }

    const [payouts, total] = await Promise.all([
      PayoutRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PayoutRequest.countDocuments(query),
    ]);

    // Count summary badges with active scope applied
    const badgeBaseQuery = query.$and ? { $and: query.$and } : {};
    const [pendingCount, approvedCount, processingCount, paidCount, rejectedCount] = await Promise.all([
      PayoutRequest.countDocuments({ ...badgeBaseQuery, status: 'PENDING' }),
      PayoutRequest.countDocuments({ ...badgeBaseQuery, status: 'APPROVED' }),
      PayoutRequest.countDocuments({ ...badgeBaseQuery, status: 'PROCESSING' }),
      PayoutRequest.countDocuments({ ...badgeBaseQuery, status: 'PAID' }),
      PayoutRequest.countDocuments({ ...badgeBaseQuery, status: 'REJECTED' }),
    ]);

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      counts: {
        all: total,
        pending: pendingCount,
        approved: approvedCount,
        processing: processingCount,
        paid: paidCount,
        rejected: rejectedCount,
      },
      payouts,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    next(error);
  }
};

// Get single Payout Request details + recipient financial profile
export const getPayoutRequestById = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { id } = req.params;
    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const payout = await PayoutRequest.findOne(
      isMongoId ? { $or: [{ _id: id }, { payoutId: id }] } : { payoutId: id }
    ).lean();

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    // Verify authorized scope
    if (!scope.isAll) {
      if (payout.recipientType === 'SELLER') {
        const s = await Seller.findById(payout.recipientId).lean();
        if (!sellerInScope(scope, s)) {
          return res.status(403).json({ success: false, message: 'Forbidden: Recipient outside your authorized regional scope.' });
        }
      } else if (payout.recipientType === 'CAPTAIN') {
        const c = await Captain.findById(payout.recipientId).lean();
        if (c?.city && !getCityRegex(scope.city).test(c.city)) {
          return res.status(403).json({ success: false, message: 'Forbidden: Recipient outside your authorized regional scope.' });
        }
      }
    }

    let recipientFinancials = null;
    if (payout.recipientType === 'SELLER') {
      const seller = await Seller.findById(payout.recipientId).lean();
      if (seller) {
        recipientFinancials = {
          businessName: seller.businessName,
          ownerName: seller.ownerName,
          phone: seller.phone,
          city: seller.warehouseLocation?.city || 'N/A',
          availableBalance: seller.walletBalance || 0,
          pendingBalance: seller.pendingBalance || 0,
          totalEarnings: seller.totalEarnings || 0,
          totalCommissionDeducted: seller.totalCommissionDeducted || 0,
          totalWithdrawn: seller.totalWithdrawn || 0,
          commissionPercentage: seller.commissionPercentage || 10,
        };
      }
    } else if (payout.recipientType === 'CAPTAIN') {
      const captain = await Captain.findById(payout.recipientId).lean();
      if (captain) {
        recipientFinancials = {
          name: captain.name,
          phone: captain.phone,
          city: captain.city || 'N/A',
          vehicleType: captain.vehicleType,
          availableBalance: captain.walletBalance || 0,
          cashCollected: captain.cashCollected || 0,
          outstandingCash: captain.outstandingCash || 0,
        };
      }
    }

    res.status(200).json({
      success: true,
      payout,
      recipientFinancials,
    });
  } catch (error) {
    next(error);
  }
};

// Approve Payout Request
export const approvePayout = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { id } = req.params;
    const { approvedAmount, remarks } = req.body;

    const payout = await PayoutRequest.findById(id);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve payout currently in status: ${payout.status}`,
      });
    }

    // Authorization check on recipient scope
    if (!scope.isAll) {
      if (payout.recipientType === 'SELLER') {
        const s = await Seller.findById(payout.recipientId).lean();
        if (!sellerInScope(scope, s)) {
          return res.status(403).json({ success: false, message: 'Action forbidden: Recipient outside your authorized regional scope.' });
        }
      } else if (payout.recipientType === 'CAPTAIN') {
        const c = await Captain.findById(payout.recipientId).lean();
        if (c?.city && !getCityRegex(scope.city).test(c.city)) {
          return res.status(403).json({ success: false, message: 'Action forbidden: Recipient outside your authorized regional scope.' });
        }
      }
    }

    const finalAmount = approvedAmount ? Number(approvedAmount) : payout.requestedAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid approved amount required' });
    }

    const previousStatus = payout.status;
    payout.status = 'APPROVED';
    payout.approvedAmount = finalAmount;
    if (remarks) payout.remarks = remarks;
    payout.approvedBy = req.user.id;
    payout.approvedAt = new Date();
    await payout.save();

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'APPROVE_PAYOUT',
      targetEntity: 'PayoutRequest',
      targetId: payout.payoutId,
      amount: finalAmount,
      previousValue: { status: previousStatus, requestedAmount: payout.requestedAmount },
      newValue: { status: 'APPROVED', approvedAmount: finalAmount },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      remarks: remarks || `Approved for ₹${finalAmount}`,
    });

    res.status(200).json({
      success: true,
      message: `Payout #${payout.payoutId} approved for ₹${finalAmount}`,
      payout,
    });
  } catch (error) {
    next(error);
  }
};

// Reject Payout Request & Restore Balance
export const rejectPayout = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { id } = req.params;
    const { rejectionReason, remarks } = req.body;

    const payout = await PayoutRequest.findById(id);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    if (payout.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already completed/paid payout',
      });
    }

    // Verify scope authorization
    if (!scope.isAll) {
      if (payout.recipientType === 'SELLER') {
        const s = await Seller.findById(payout.recipientId).lean();
        if (!sellerInScope(scope, s)) {
          return res.status(403).json({ success: false, message: 'Action forbidden: Recipient outside your authorized regional scope.' });
        }
      } else if (payout.recipientType === 'CAPTAIN') {
        const c = await Captain.findById(payout.recipientId).lean();
        if (c?.city && !getCityRegex(scope.city).test(c.city)) {
          return res.status(403).json({ success: false, message: 'Action forbidden: Recipient outside your authorized regional scope.' });
        }
      }
    }

    const previousStatus = payout.status;
    const refundAmt = payout.requestedAmount;

    // Restore unreserved balance
    if (payout.recipientType === 'SELLER') {
      const seller = await Seller.findById(payout.recipientId);
      if (seller) {
        seller.walletBalance = Number(((seller.walletBalance || 0) + refundAmt).toFixed(2));
        seller.pendingBalance = Math.max(0, Number(((seller.pendingBalance || 0) - refundAmt).toFixed(2)));
        await seller.save();
      }
    } else if (payout.recipientType === 'CAPTAIN') {
      const captain = await Captain.findById(payout.recipientId);
      if (captain) {
        captain.walletBalance = Number(((captain.walletBalance || 0) + refundAmt).toFixed(2));
        await captain.save();
      }
    }

    payout.status = 'REJECTED';
    payout.rejectionReason = rejectionReason || remarks || 'Rejected by Super Admin';
    if (remarks) payout.remarks = remarks;
    payout.rejectedBy = req.user.id;
    payout.rejectedAt = new Date();
    await payout.save();

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'REJECT_PAYOUT',
      targetEntity: 'PayoutRequest',
      targetId: payout.payoutId,
      amount: refundAmt,
      previousValue: { status: previousStatus },
      newValue: { status: 'REJECTED', unreservedAmount: refundAmt },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      remarks: rejectionReason || remarks,
    });

    res.status(200).json({
      success: true,
      message: `Payout #${payout.payoutId} rejected and ₹${refundAmt} restored to available balance`,
      payout,
    });
  } catch (error) {
    next(error);
  }
};

// Process & Complete Payout
export const processPayout = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { id } = req.params;
    const { paymentReference, paymentMethod = 'BANK_TRANSFER', remarks } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference (UTR / Transaction ID) is required to complete payout',
      });
    }

    const payout = await PayoutRequest.findById(id);
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout request not found' });
    }

    if (payout.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'This payout is already marked as PAID' });
    }

    if (payout.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Cannot process a rejected payout' });
    }

    // Verify scope
    if (!scope.isAll) {
      if (payout.recipientType === 'SELLER') {
        const s = await Seller.findById(payout.recipientId).lean();
        if (!sellerInScope(scope, s)) {
          return res.status(403).json({ success: false, message: 'Action forbidden: Recipient outside your authorized regional scope.' });
        }
      } else if (payout.recipientType === 'CAPTAIN') {
        const c = await Captain.findById(payout.recipientId).lean();
        if (c?.city && !getCityRegex(scope.city).test(c.city)) {
          return res.status(403).json({ success: false, message: 'Action forbidden: Recipient outside your authorized regional scope.' });
        }
      }
    }

    const previousStatus = payout.status;
    const paidAmount = payout.approvedAmount || payout.requestedAmount;

    payout.status = 'PAID';
    payout.paymentReference = paymentReference;
    payout.paymentMethod = paymentMethod;
    if (remarks) payout.remarks = remarks;
    payout.paidAt = new Date();
    payout.processedBy = req.user.id;
    payout.processedAt = new Date();
    await payout.save();

    // Sync captain/seller wallet withdrawal txn
    try {
      if (payout.recipientType === 'CAPTAIN') {
        await CaptainTransaction.updateMany(
          {
            $or: [
              { orderId: payout.payoutId },
              { orderId: String(payout._id) },
              { description: { $regex: payout.payoutId || '', $options: 'i' } },
            ],
            type: { $in: ['WITHDRAWAL', 'DEBIT'] },
            status: { $in: ['PENDING', 'Pending', 'pending'] },
            captainId: payout.recipientId,
          },
          { $set: { status: 'COMPLETED' } }
        );
      } else if (payout.recipientType === 'SELLER') {
        await WalletTransaction.updateMany(
          {
            $or: [
              { orderId: payout.payoutId },
              { orderId: String(payout._id) },
            ],
            type: { $in: ['WITHDRAWAL', 'DEBIT'] },
            status: { $in: ['PENDING', 'Pending', 'pending'] },
            sellerId: String(payout.recipientId),
          },
          { $set: { status: 'COMPLETED' } }
        );
      }
    } catch (_) {}

    // Central platform ledger entry
    const ledgerTxnId = `TXN-LED-PAY-${Date.now().toString().slice(-6)}`;
    await PlatformLedger.create({
      transactionId: ledgerTxnId,
      category: payout.recipientType === 'SELLER' ? 'SELLER_PAYOUT' : 'CAPTAIN_PAYOUT',
      type: 'DEBIT',
      amount: paidAmount,
      source: 'PLATFORM_ESCROW',
      destination: `${payout.recipientType}_BANK`,
      entityType: payout.recipientType,
      entityId: String(payout.recipientId),
      entityName: payout.recipientName || payout.recipientType,
      referenceModel: 'PayoutRequest',
      referenceId: payout.payoutId,
      referenceObjId: payout._id,
      status: 'SUCCESS',
      description: `Disbursed ${payout.recipientType} payout #${payout.payoutId} via ${paymentMethod}. UTR: ${paymentReference}`,
      metadata: {
        paymentReference,
        paymentMethod,
        brandId: scope.brandId,
        city: scope.city,
      },
    });

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'PROCESS_PAYOUT',
      targetEntity: 'PayoutRequest',
      targetId: payout.payoutId,
      amount: paidAmount,
      previousValue: { status: previousStatus },
      newValue: { status: 'PAID', paymentReference },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      remarks: `Paid ₹${paidAmount} via ${paymentMethod}. Ref: ${paymentReference}`,
    });

    res.status(200).json({
      success: true,
      message: `Payout #${payout.payoutId} processed and marked as PAID`,
      payout,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 4. SELLER & CAPTAIN SETTLEMENTS (BRAND & REGION SCOPED)
// =========================================================================
export const getSellerSettlements = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { status, search } = req.query;

    const query = {};
    if (status && status !== 'ALL') query.settlementStatus = status.toUpperCase();

    if (search && search.trim()) {
      const clean = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { orderId: { $regex: clean, $options: 'i' } },
        { sellerName: { $regex: clean, $options: 'i' } },
        { sellerId: { $regex: clean, $options: 'i' } },
      ];
    }

    if (!scope.isAll) {
      const scopedSellerIds = await getScopedSellerIds(scope);
      const sellerIdStrs = (scopedSellerIds || []).map((id) => id.toString());
      query.sellerId = { $in: sellerIdStrs };
    }

    const [settlements, total] = await Promise.all([
      SellerNotification.find(query)
        .select('orderId sellerName sellerId totalAmount commissionRate commissionAmount netSellerAmount paymentMethod paymentStatus status settlementStatus settledAt createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SellerNotification.countDocuments(query),
    ]);

    const summaryAgg = await SellerNotification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$settlementStatus',
          totalGross: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalNetSeller: { $sum: '$netSellerAmount' },
          count: { $sum: 1 },
        },
      },
    ]).catch(() => []);

    let totalSettled = 0;
    let pendingSettled = 0;
    let totalCommission = 0;

    summaryAgg.forEach((s) => {
      totalCommission += s.totalCommission || 0;
      if (s._id === 'SETTLED') totalSettled += s.totalNetSeller || 0;
      if (s._id === 'PENDING') pendingSettled += s.totalNetSeller || 0;
    });

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      summary: {
        totalSettledAmount: Number(totalSettled.toFixed(2)),
        pendingSettlementAmount: Number(pendingSettled.toFixed(2)),
        totalCommissionEarned: Number(totalCommission.toFixed(2)),
        totalTransactions: total,
      },
      settlements,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (error) {
    next(error);
  }
};

export const getCaptainSettlements = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const query = {};
    if (!scope.isAll && scope.city) {
      query.city = getCityRegex(scope.city);
    }

    const [captains, total] = await Promise.all([
      Captain.find(query)
        .select('_id name phone vehicleType city state walletBalance cashCollected status createdAt')
        .sort({ walletBalance: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Captain.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      captains,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 5. COMMISSION MANAGEMENT (SUPER ADMIN AUTHORITY ONLY) (BRAND/REGION SCOPED)
// =========================================================================
export const getAllCommissions = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const query = { ...sellerScopeFilter(scope) };

    const sellers = await Seller.find(query)
      .select('_id businessName ownerName phone email warehouseLocation commissionPercentage totalEarnings totalCommissionDeducted walletBalance status')
      .sort({ totalCommissionDeducted: -1 })
      .lean();

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      count: sellers.length,
      sellers,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSellerCommission = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { sellerId } = req.params;
    const { commissionPercentage, remarks } = req.body;

    const rate = Number(commissionPercentage);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be a valid number between 0% and 100%',
      });
    }

    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    // Verify regional scope
    if (!scope.isAll) {
      if (!sellerInScope(scope, seller)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot update commission for a merchant outside your authorized regional scope.',
        });
      }
    }

    const previousRate = seller.commissionPercentage;
    seller.commissionPercentage = rate;
    await seller.save();

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'UPDATE_COMMISSION',
      targetEntity: 'Seller',
      targetId: String(seller._id),
      previousValue: { commissionPercentage: previousRate },
      newValue: { commissionPercentage: rate },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      remarks: remarks || `Commission updated from ${previousRate}% to ${rate}%`,
    });

    res.status(200).json({
      success: true,
      message: `Commission rate for "${seller.businessName}" updated to ${rate}%`,
      seller: {
        id: seller._id,
        businessName: seller.businessName,
        commissionPercentage: seller.commissionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 6. FINANCIAL ADJUSTMENTS (MANUAL OVERRIDE WITH AUDIT TRAIL)
// =========================================================================
export const createFinancialAdjustment = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { entityType, entityId, type, amount, reason, reference, remarks } = req.body;

    if (!entityType || !entityId || !type || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide entityType (SELLER/CAPTAIN), entityId, type (CREDIT/DEBIT), amount, and reason',
      });
    }

    const adjAmount = Number(amount);
    if (isNaN(adjAmount) || adjAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount required' });
    }

    let entityName = '';
    let balanceBefore = 0;
    let balanceAfter = 0;

    if (entityType === 'SELLER') {
      const seller = await Seller.findById(entityId);
      if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
      entityName = seller.businessName || seller.ownerName || 'Seller Store';
      balanceBefore = Number(seller.walletBalance || 0);

      // Verify regional scope
      if (!scope.isAll) {
        if (!sellerInScope(scope, seller)) {
          return res.status(403).json({ success: false, message: 'Forbidden: Merchant outside authorized regional scope.' });
        }
      }

      if (type === 'DEBIT' && balanceBefore < adjAmount) {
        return res.status(400).json({
          success: false,
          message: `Cannot debit ₹${adjAmount}. Seller balance is only ₹${balanceBefore.toFixed(2)}`,
        });
      }

      balanceAfter = type === 'CREDIT' ? balanceBefore + adjAmount : balanceBefore - adjAmount;
      balanceAfter = Number(balanceAfter.toFixed(2));
      seller.walletBalance = balanceAfter;
      await seller.save();

      // Create seller transaction record
      const txnId = `TXN-ADJ-${Date.now().toString().slice(-6)}`;
      await WalletTransaction.create({
        transactionId: txnId,
        sellerId: String(seller._id),
        orderId: `ADJ-${Date.now().toString().slice(-6)}`,
        type: type === 'CREDIT' ? 'CREDIT' : 'DEBIT_REVERSAL',
        grossAmount: adjAmount,
        netAmount: type === 'CREDIT' ? adjAmount : -adjAmount,
        balanceBefore,
        balanceAfter,
        paymentMethod: 'MANUAL_ADJUSTMENT',
        settlementStatus: 'SETTLED',
        description: `Manual ${type}: ${reason}. Ref: ${reference || 'N/A'}`,
      });
    } else if (entityType === 'CAPTAIN') {
      const captain = await Captain.findById(entityId);
      if (!captain) return res.status(404).json({ success: false, message: 'Captain not found' });
      entityName = captain.name || 'Captain';
      balanceBefore = Number(captain.walletBalance || 0);

      // Verify regional scope
      if (!scope.isAll && scope.city) {
        if (captain.city && !getCityRegex(scope.city).test(captain.city)) {
          return res.status(403).json({ success: false, message: 'Forbidden: Captain outside authorized regional scope.' });
        }
      }

      if (type === 'DEBIT' && balanceBefore < adjAmount) {
        return res.status(400).json({
          success: false,
          message: `Cannot debit ₹${adjAmount}. Captain balance is only ₹${balanceBefore.toFixed(2)}`,
        });
      }

      balanceAfter = type === 'CREDIT' ? balanceBefore + adjAmount : balanceBefore - adjAmount;
      balanceAfter = Number(balanceAfter.toFixed(2));
      captain.walletBalance = balanceAfter;
      await captain.save();

      const txnId = `TXN-ADJ-${Date.now().toString().slice(-6)}`;
      await CaptainTransaction.create({
        transactionId: txnId,
        captainId: captain._id,
        orderId: `ADJ-${Date.now().toString().slice(-6)}`,
        type: type === 'CREDIT' ? 'CREDIT' : 'WITHDRAWAL',
        amount: adjAmount,
        balanceBefore,
        balanceAfter,
        description: `Manual ${type}: ${reason}. Ref: ${reference || 'N/A'}`,
        status: 'COMPLETED',
      });
    }

    const adjustmentId = `ADJ-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    const adjustment = await FinancialAdjustment.create({
      adjustmentId,
      entityType,
      entityId: String(entityId || ''),
      entityName,
      type,
      amount: adjAmount,
      reason,
      reference: reference || '',
      remarks: remarks || '',
      createdBy: req.user.id,
      creatorEmail: req.user.email,
      balanceBefore,
      balanceAfter,
      status: 'APPLIED',
      metadata: {
        brandId: scope.brandId,
        city: scope.city,
      },
    });

    // Create central ledger record
    const ledgerTxnId = `TXN-LED-ADJ-${Date.now().toString().slice(-6)}`;
    await PlatformLedger.create({
      transactionId: ledgerTxnId,
      category: 'FINANCIAL_ADJUSTMENT',
      type,
      amount: adjAmount,
      source: type === 'CREDIT' ? 'PLATFORM' : entityType,
      destination: type === 'CREDIT' ? entityType : 'PLATFORM',
      entityType,
      entityId: String(entityId || ''),
      entityName,
      referenceModel: 'FinancialAdjustment',
      referenceId: adjustmentId,
      referenceObjId: adjustment._id,
      status: 'SUCCESS',
      balanceBefore,
      balanceAfter,
      description: `Financial Adjustment (${type}) of ₹${adjAmount}: ${reason}`,
      metadata: { reference, remarks, brandId: scope.brandId, city: scope.city },
    });

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'CREATE_FINANCIAL_ADJUSTMENT',
      targetEntity: 'FinancialAdjustment',
      targetId: adjustmentId,
      amount: adjAmount,
      previousValue: { balanceBefore },
      newValue: { balanceAfter, type, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      remarks: `Applied ${type} of ₹${adjAmount} to ${entityType} "${entityName}"`,
    });

    res.status(201).json({
      success: true,
      message: `Financial adjustment #${adjustmentId} applied successfully`,
      adjustment,
      updatedBalance: balanceAfter,
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialAdjustments = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const query = {};
    if (!scope.isAll) {
      query.$or = [
        { 'metadata.brandId': scope.brandId },
        { 'metadata.city': getCityRegex(scope.city) },
      ];
    }
    const adjustments = await FinancialAdjustment.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: adjustments.length,
      adjustments,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 7. REFUNDS MANAGEMENT (BRAND & REGION SCOPED)
// =========================================================================
export const getRefunds = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const query = {};

    if (!scope.isAll && scope.city) {
      const cityOrders = await Order.find({
        'shippingAddress.city': getCityRegex(scope.city),
      }).select('orderId _id').lean();
      const cityOrderIds = cityOrders.map((o) => o.orderId);
      const cityObjIds = cityOrders.map((o) => o._id);
      query.$or = [
        { orderId: { $in: cityOrderIds } },
        { order: { $in: cityObjIds } },
      ];
    }

    const refunds = await RefundRequest.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      count: refunds.length,
      refunds,
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { id } = req.params;
    const { status, gatewayRefundId, remarks } = req.body;

    if (!['APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid refund status.' });
    }

    const refund = await RefundRequest.findById(id);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund request not found' });
    }
    if (['COMPLETED', 'REJECTED'].includes(refund.status)) {
      return res.status(409).json({ success: false, message: `Refund is already ${refund.status} and cannot be changed.` });
    }

    // Verify authorized scope on the parent order
    if (!scope.isAll && scope.city) {
      const orderDoc = await Order.findOne({
        $or: [{ orderId: refund.orderId }, { _id: refund.order }],
      }).lean();
      if (orderDoc && !getCityRegex(scope.city).test(orderDoc.shippingAddress?.city)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot process refund for order outside authorized region.' });
      }
    }

    const previousStatus = refund.status;
    refund.status = status;
    if (gatewayRefundId) refund.gatewayRefundId = gatewayRefundId;
    if (remarks) refund.remarks = remarks;
    refund.processedBy = req.user.id;
    refund.processedAt = new Date();
    await refund.save();

    if (status === 'COMPLETED') {
      const ledgerTxnId = `TXN-LED-REF-${Date.now().toString().slice(-6)}`;
      await PlatformLedger.create({
        transactionId: ledgerTxnId,
        category: 'REFUND',
        type: 'DEBIT',
        amount: refund.amount,
        source: 'PLATFORM_TREASURY',
        destination: 'USER',
        entityType: 'USER',
        entityId: String(refund.userId || ''),
        entityName: refund.userName || 'Customer',
        referenceModel: 'RefundRequest',
        referenceId: refund.refundId,
        referenceObjId: refund._id,
        status: 'SUCCESS',
        description: `Order Refund #${refund.refundId} processed. Ref: ${gatewayRefundId || 'Direct'}`,
        metadata: { gatewayRefundId, remarks, brandId: scope.brandId, city: scope.city },
      });
    }

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'PROCESS_REFUND',
      targetEntity: 'RefundRequest',
      targetId: refund.refundId,
      amount: refund.amount,
      previousValue: { status: previousStatus },
      newValue: { status, gatewayRefundId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      remarks: remarks || `Refund updated to ${status}`,
    });

    res.status(200).json({
      success: true,
      message: `Refund #${refund.refundId} updated to ${status}`,
      refund,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 8. FINANCIAL AUDIT LOGS (BRAND & REGION SCOPED)
// =========================================================================
export const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const { action, search } = req.query;

    const query = {};
    if (action && action !== 'ALL') query.action = action;

    if (search && search.trim()) {
      const clean = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { logId: { $regex: clean, $options: 'i' } },
        { targetId: { $regex: clean, $options: 'i' } },
        { remarks: { $regex: clean, $options: 'i' } },
        { actorEmail: { $regex: clean, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      FinancialAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FinancialAuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 9. FINANCIAL EXPORTS & REPORTS (BRAND & REGION SCOPED)
// =========================================================================
export const getFinancialReports = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { reportType, startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.createdAt.$lte = end;
      }
    }

    if (reportType === 'transactions') {
      const query = { ...dateQuery };
      if (!scope.isAll) {
        const scopedSellerIds = await getScopedSellerIds(scope);
        const scopedCaptainIds = await getScopedCaptainIds(scope);
        const allScopedIds = [
          ...(scopedSellerIds || []).map((id) => id.toString()),
          ...(scopedCaptainIds || []).map((id) => id.toString()),
        ];
        query.$or = [
          { 'metadata.brandId': scope.brandId },
          { 'metadata.city': getCityRegex(scope.city) },
          { entityId: { $in: allScopedIds } },
        ];
      }
      const transactions = await PlatformLedger.find(query).sort({ createdAt: -1 }).limit(500).lean();
      return res.status(200).json({ success: true, reportType, transactions });
    }

    if (reportType === 'seller-settlements') {
      const query = { ...dateQuery };
      if (!scope.isAll) {
        const scopedSellerIds = await getScopedSellerIds(scope);
        query.sellerId = { $in: (scopedSellerIds || []).map((id) => id.toString()) };
      }
      const settlements = await SellerNotification.find(query)
        .select('orderId sellerName sellerId totalAmount commissionRate commissionAmount netSellerAmount settlementStatus settledAt createdAt')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();
      return res.status(200).json({ success: true, reportType, settlements });
    }

    if (reportType === 'captain-settlements') {
      const query = {};
      if (!scope.isAll && scope.city) query.city = getCityRegex(scope.city);
      const captains = await Captain.find(query).select('name phone vehicleType city walletBalance cashCollected createdAt').lean();
      return res.status(200).json({ success: true, reportType, captains });
    }

    if (reportType === 'platform-revenue') {
      const orderFilter = {
        ...(dateQuery.createdAt ? { createdAt: dateQuery.createdAt } : {}),
        $or: [{ paymentStatus: 'Paid' }, { paymentMethod: 'COD' }],
      };
      if (!scope.isAll && scope.city) {
        orderFilter['shippingAddress.city'] = getCityRegex(scope.city);
      }
      const orders = await Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            grossVolume: { $sum: '$grandTotal' },
            itemsTotal: { $sum: '$itemsTotal' },
            shippingRevenue: { $sum: '$shippingFee' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      return res.status(200).json({ success: true, reportType, orders });
    }

    // Default overview report
    res.status(200).json({
      success: true,
      message: 'Select a valid report type: transactions, seller-settlements, captain-settlements, platform-revenue',
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================================
// 10. STORES & MERCHANTS OVERSIGHT (BRAND & REGION SCOPED)
// =========================================================================
export const getSuperAdminStores = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { search = '', status = 'ALL', page = 1, limit = 50 } = req.query;

    const query = {};

    // 1. Strict Brand Scope Filtering
    if (!scope.isAll) {
      query.$or = [
        { brandId: scope.brandId },
        ...(scope.brand?._id ? [{ brand: scope.brand._id }] : []),
      ];
    }

    // 2. Status Filtering
    if (status && status !== 'ALL') {
      if (status === 'Active') query.status = 'approved';
      else if (status === 'Inactive') query.status = { $in: ['suspended', 'rejected'] };
      else query.status = status.toLowerCase();
    }

    // 3. Search Filtering
    if (search && search.trim()) {
      const s = search.trim();
      const searchConditions = [
        { businessName: { $regex: s, $options: 'i' } },
        { ownerName: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { 'warehouseLocation.city': { $regex: s, $options: 'i' } },
        { 'warehouseLocation.storeAddress': { $regex: s, $options: 'i' } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const total = await Seller.countDocuments(query);
    const sellers = await Seller.find(query)
      .populate('brand', 'name code city logo brandId')
      .sort({ createdAt: -1 })
      .skip((Math.max(1, Number(page)) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Enrich with store order counts & product counts
    const sellerIds = sellers.map((s) => s._id);
    const [productsCountArr, ordersCountArr] = await Promise.all([
      Product.aggregate([
        { $match: { sellerId: { $in: sellerIds } } },
        {
          $group: {
            _id: '$sellerId',
            count: { $sum: 1 },
            totalUnits: { $sum: '$stock' },
            valuation: { $sum: { $multiply: ['$stock', '$salePrice'] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { 'items.seller': { $in: sellers.map((s) => s.businessName) } } },
        { $group: { _id: '$items.seller', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      ]),
    ]);

    const prodMap = {};
    productsCountArr.forEach((p) => {
      prodMap[String(p._id)] = p;
    });
    const orderMap = {};
    ordersCountArr.forEach((o) => {
      orderMap[o._id] = o;
    });

    // Lookup brand metadata
    const allBrands = await Brand.find({}, 'name code city logo brandId').lean();
    const brandMap = {};
    allBrands.forEach((b) => {
      brandMap[b.brandId] = b;
      brandMap[String(b._id)] = b;
    });

    // Compute live brand breakdown across all brands
    const brandCountsAggregation = await Seller.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$brandId', 'unassigned'] },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['under_review', 'pending', 'pending_otp']] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $in: ['$status', ['suspended', 'rejected']] }, 1, 0] } },
        },
      },
    ]);
    const brandCounts = {};
    brandCountsAggregation.forEach((bc) => {
      brandCounts[bc._id] = bc;
    });

    // Base query for current brand scope to calculate scopeStats
    const scopeBaseQuery = !scope.isAll
      ? { $or: [{ brandId: scope.brandId }, ...(scope.brand?._id ? [{ brand: scope.brand._id }] : [])] }
      : {};

    const [scopeTotal, scopeActive, scopePending, scopeInactive] = await Promise.all([
      Seller.countDocuments(scopeBaseQuery),
      Seller.countDocuments({ ...scopeBaseQuery, status: 'approved' }),
      Seller.countDocuments({ ...scopeBaseQuery, status: { $in: ['under_review', 'pending', 'pending_otp'] } }),
      Seller.countDocuments({ ...scopeBaseQuery, status: { $in: ['suspended', 'rejected'] } }),
    ]);

    const stores = sellers.map((s) => {
      const pStats = prodMap[String(s._id)] || { count: 0, totalUnits: 0, valuation: 0 };
      const oStats = orderMap[s.businessName] || { count: 0, revenue: 0 };
      const bInfo =
        s.brand && s.brand.name
          ? s.brand
          : brandMap[s.brandId] || brandMap[String(s.brand)] || scope.brand || null;

      return {
        storeId: `STR-${String(s._id).slice(-6).toUpperCase()}`,
        _id: s._id,
        sellerId: String(s._id),
        storeName: s.businessName || 'Store Location',
        sellerName: s.ownerName || s.businessName || 'Merchant',
        brandId: bInfo?.brandId || s.brandId || '',
        brandSlug: (bInfo?.code || 'savitri').toLowerCase(),
        brandName: bInfo?.name || 'Unassigned Brand',
        brandCode: bInfo?.code || 'N/A',
        city: s.warehouseLocation?.city || bInfo?.city || 'Indore',
        state: s.warehouseLocation?.state || bInfo?.state || 'Madhya Pradesh',
        address: s.warehouseLocation?.storeAddress || s.warehouseLocation?.address || s.address || '',
        pincode: s.warehouseLocation?.pincode || '',
        email: s.email || '',
        phone: s.phone || '',
        categories: s.categories || [],
        registeredAt: s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : 'N/A',
        verificationStatus: s.isVerified
          ? 'Verified'
          : s.status === 'under_review'
          ? 'Under Review'
          : 'Pending',
        storeStatus: s.status === 'approved' ? 'Active' : 'Inactive',
        productCount: pStats.count,
        totalOrders: oStats.count,
        inventorySummary: {
          inStock: pStats.count,
          lowStock: 0,
          outOfStock: 0,
          totalUnits: pStats.totalUnits || 0,
          valuation: pStats.valuation || 0,
        },
        salesSummary: {
          totalRevenue: s.totalEarnings || oStats.revenue || 0,
          completedOrders: oStats.count,
          pendingOrders: 0,
          avgOrderValue: oStats.count > 0 ? Math.round((s.totalEarnings || oStats.revenue || 0) / oStats.count) : 0,
        },
        payoutSummary: {
          totalPaid: s.totalWithdrawn || 0,
          pendingAmount: s.walletBalance || 0,
          lastPayoutDate: s.updatedAt ? new Date(s.updatedAt).toISOString().slice(0, 10) : 'N/A',
          payoutStatus: s.walletBalance > 0 ? 'Pending' : 'Settled',
        },
        purchaseSummary: {
          totalPurchases: oStats.count,
          totalSpend: s.totalEarnings || 0,
          primarySupplier: bInfo?.name || 'Direct Wholesale',
          lastPurchaseDate: s.updatedAt ? new Date(s.updatedAt).toISOString().slice(0, 10) : 'N/A',
        },
      };
    });

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      total,
      count: stores.length,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      stats: {
        total: scopeTotal,
        active: scopeActive,
        pending: scopePending,
        inactive: scopeInactive,
      },
      brandCounts,
      stores,
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 10B. SINGLE STORE DETAIL (BRAND SCOPED)
// =========================================================================
export const getSuperAdminStoreById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const scope = req.scope || { isAll: true };
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

    const seller = await Seller.findOne({
      $or: [{ _id: isMongoId ? id : null }, { phone: id }].filter(Boolean),
    })
      .populate('brand', 'name code city logo brandId')
      .lean();

    if (!seller) {
      return res.status(404).json({ success: false, message: 'Store record not found in MongoDB' });
    }

    // Brand authorization check
    if (!scope.isAll) {
      const sellerBrandId = seller.brandId || seller.brand?.brandId;
      const sellerBrandMongoId = seller.brand?._id ? String(seller.brand._id) : null;
      const scopeBrandMongoId = scope.brand?._id ? String(scope.brand._id) : null;

      const isMatch =
        sellerBrandId === scope.brandId ||
        (sellerBrandMongoId && scopeBrandMongoId && sellerBrandMongoId === scopeBrandMongoId);

      if (!isMatch) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Store "${seller.businessName}" does not belong to authorized brand scope (${scope.brand?.name || scope.brandId}).`,
        });
      }
    }

    res.status(200).json({ success: true, store: seller });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 11. CENTRAL INVENTORY CONTROL (BRAND & REGION SCOPED)
// =========================================================================
export const getSuperAdminInventory = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { search = '', category = 'ALL', status = 'ALL', page = 1, limit = 25 } = req.query;

    const sellerQuery = { ...sellerScopeFilter(scope) };
    const matchingSellers = await Seller.find(sellerQuery).select('_id businessName warehouseLocation').lean();
    const sellerIds = matchingSellers.map((s) => s._id);
    const sellerNames = matchingSellers.map((s) => s.businessName).filter(Boolean);

    const query = {
      $or: [
        { sellerId: { $in: sellerIds } },
        { seller: { $in: sellerNames } },
      ],
    };

    if (category && category !== 'ALL') {
      query.category = category;
    }
    if (search && search.trim()) {
      const s = search.trim();
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: s, $options: 'i' } },
          { sku: { $regex: s, $options: 'i' } },
          { brand: { $regex: s, $options: 'i' } },
        ],
      });
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ updatedAt: -1 })
      .skip((Math.max(1, Number(page)) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const sellerMap = {};
    matchingSellers.forEach((s) => {
      sellerMap[String(s._id)] = s;
      if (s.businessName) sellerMap[s.businessName] = s;
    });

    const items = products.map((p) => {
      const sellerDoc = sellerMap[String(p.sellerId)] || sellerMap[p.seller] || {};
      const stock = Number(p.stock) || 0;
      const lowStockThreshold = 10;
      let stockStatus = 'In Stock';
      if (stock === 0) stockStatus = 'Out of Stock';
      else if (stock <= lowStockThreshold) stockStatus = 'Low Stock';

      return {
        id: String(p._id),
        _id: p._id,
        sku: p.sku || `SKU-${String(p._id).slice(-6).toUpperCase()}`,
        name: p.name,
        category: p.category || 'General',
        brand: p.brand || scope.brand?.name || 'Savitri',
        warehouse: sellerDoc.businessName ? `${sellerDoc.businessName} Warehouse` : `${scope.city || 'Central'} Hub`,
        city: sellerDoc.warehouseLocation?.city || scope.city || 'Indore',
        stock,
        minThreshold: lowStockThreshold,
        price: p.salePrice || p.mrp || 0,
        mrp: p.mrp || p.salePrice || 0,
        totalValuation: (p.salePrice || p.mrp || 0) * stock,
        status: stockStatus,
        lastUpdated: p.updatedAt || p.createdAt,
      };
    });

    // Summary statistics
    const summaryAgg = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          totalValuation: { $sum: { $multiply: ['$stock', '$salePrice'] } },
          lowStockCount: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 10] }] }, 1, 0] } },
          outOfStockCount: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
        },
      },
    ]);

    const summary = summaryAgg[0] || { totalStock: 0, totalValuation: 0, lowStockCount: 0, outOfStockCount: 0 };

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      total,
      count: items.length,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      summary,
      items,
      inventory: items,
    });
  } catch (err) {
    next(err);
  }
};

export const adjustSuperAdminInventoryStock = async (req, res, next) => {
  try {
    const { productId, adjustType, quantity, reason } = req.body;
    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Product ID and valid positive quantity are required' });
    }

    const prod = await Product.findById(productId);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    const qty = Number(quantity);
    const oldStock = prod.stock || 0;
    let newStock = oldStock;

    if (adjustType === 'ADD') {
      newStock = oldStock + qty;
    } else if (adjustType === 'DEDUCT') {
      if (oldStock < qty) {
        return res.status(400).json({ success: false, message: `Cannot deduct ${qty} units. Current stock is ${oldStock}.` });
      }
      newStock = oldStock - qty;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid adjustType. Use ADD or DEDUCT.' });
    }

    prod.stock = newStock;
    await prod.save();

    await logAudit({
      actorId: req.user.id,
      actorEmail: req.user.email,
      action: 'INVENTORY_STOCK_ADJUSTMENT',
      targetEntity: 'Product',
      targetId: prod._id,
      amount: qty,
      previousValue: String(oldStock),
      newValue: String(newStock),
      remarks: `${adjustType} ${qty} units: ${reason || 'Super Admin Adjustment'}`,
    });

    res.status(200).json({
      success: true,
      message: `Stock successfully adjusted from ${oldStock} to ${newStock} units.`,
      product: {
        id: prod._id,
        stock: prod.stock,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 12. DELIVERY PARTNERS / CAPTAINS OVERSIGHT (BRAND & REGION SCOPED)
// =========================================================================
export const getSuperAdminDeliveryPartners = async (req, res, next) => {
  try {
    const scope = req.scope || { isAll: true };
    const { search = '', status = 'ALL', page = 1, limit = 20 } = req.query;

    const query = {};
    if (!scope.isAll && scope.city) {
      query.city = getCityRegex(scope.city);
    }
    if (status && status !== 'ALL') {
      query.status = status.toLowerCase();
    }
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { vehicleType: { $regex: s, $options: 'i' } },
      ];
    }

    const total = await Captain.countDocuments(query);
    const captains = await Captain.find(query)
      .sort({ createdAt: -1 })
      .skip((Math.max(1, Number(page)) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Enrich with delivered order counts
    const captainIds = captains.map((c) => c._id);
    const orderDeliveries = await Order.aggregate([
      { $match: { captainId: { $in: captainIds }, orderStatus: 'Delivered' } },
      { $group: { _id: '$captainId', count: { $sum: 1 }, earnings: { $sum: '$captainEarnings' } } },
    ]);
    const deliveryMap = {};
    orderDeliveries.forEach((d) => {
      deliveryMap[String(d._id)] = d;
    });

    const partners = captains.map((c) => {
      const dStats = deliveryMap[String(c._id)] || { count: 0, earnings: 0 };
      return {
        id: String(c._id),
        captainId: `CAP-${String(c._id).slice(-4).toUpperCase()}`,
        name: c.name,
        phone: c.phone,
        email: c.email || '',
        city: c.city || scope.city || 'Indore',
        state: c.state || scope.state || 'Madhya Pradesh',
        vehicleType: c.vehicleType || 'Two Wheeler',
        status: c.status === 'approved' ? 'Active' : c.status === 'pending' ? 'Pending' : 'Suspended',
        accountStatus: c.accountStatus || 'approved',
        isOnline: Boolean(c.isOnline),
        completedDeliveries: dStats.count || c.totalDeliveriesCompleted || 0,
        walletBalance: c.walletBalance || 0,
        cashCollected: c.cashCollected || 0,
        outstandingCash: c.outstandingCash || 0,
        rating: 4.8,
        registeredAt: c.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      scope: {
        isAll: scope.isAll,
        brandId: scope.brandId,
        brandName: scope.brand?.name || 'All Regions',
        city: scope.city,
      },
      total,
      count: partners.length,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      partners,
      captains: partners,
    });
  } catch (err) {
    next(err);
  }
};

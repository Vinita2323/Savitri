import Order from '../../models/Order.model.js';
import OrderFulfillment from '../../models/OrderFulfillment.model.js';
import RefundRequest from '../../models/RefundRequest.model.js';
import UserWalletTransaction from '../../models/UserWalletTransaction.model.js';
import PlatformLedger from '../../models/PlatformLedger.model.js';
import { creditUserWallet } from '../../utils/userWalletHelper.js';

/**
 * Customer refunds for courier shipments that came back (RTO completed).
 *
 *  - Amount: the returned fulfilment's complete item subtotal. The order's delivery fee is refunded only when EVERY
 *    fulfilment of the order was returned. Delivered fulfilments are never refunded.
 *  - Wallet-paid orders: credited to the wallet automatically through the existing creditUserWallet, exactly once.
 *  - Online (Razorpay) orders: a RefundRequest is created as REQUESTED and stays there until an admin initiates the
 *    gateway refund and Razorpay confirms it (existing treasury flow). Nothing here talks to a gateway.
 *  - Exactly once: one RefundRequest per refundKey (unique index), a credit lock, and a wallet-transaction tag.
 */
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const ONLINE_METHODS = ['UPI', 'CARD', 'NETBANKING', 'ONLINE'];
const STALE_LOCK_MS = 2 * 60 * 1000;
const genRefundId = () => `REF-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

const modeFor = (order) => {
  const m = String(order.paymentMethod || '').toUpperCase();
  if (m === 'WALLET') return 'WALLET';
  if (ONLINE_METHODS.includes(m)) return 'RAZORPAY';
  return 'MANUAL';
};

const ledgerForWalletRefund = async (refund, order) => {
  try {
    await PlatformLedger.create({
      transactionId: `TXN-LED-RTO-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`,
      category: 'REFUND', type: 'DEBIT', amount: refund.amount,
      source: 'PLATFORM_TREASURY', destination: 'USER', entityType: 'USER',
      entityId: String(refund.userId || ''), entityName: refund.userName || 'Customer',
      referenceModel: 'RefundRequest', referenceId: refund.refundId, referenceObjId: refund._id,
      status: 'SUCCESS',
      description: `Courier return refund ${refund.refundId} credited to wallet for Order #${order.orderId}`,
      metadata: { refundKey: refund.refundKey, orderId: order.orderId },
    });
  } catch (e) { console.error('[CourierRefund] ledger entry failed for', refund.refundId, e.message); }
};

/** Create (or find) the refund for a key and, for wallet payments, credit it exactly once. */
const ensureRefund = async ({ key, amount, reason, order }) => {
  const mode = modeFor(order);
  let doc;
  try {
    doc = await RefundRequest.create({
      refundId: genRefundId(), refundKey: key, orderId: order.orderId, order: order._id, userId: order.user,
      userName: order.shippingAddress?.fullName || '', userPhone: order.shippingAddress?.phone || '',
      amount, reason, refundMode: mode, source: 'CUSTOMER_RETURN', paymentMethod: order.paymentMethod,
      // wallet: money moves automatically, so the request starts in flight; everything else waits for a person / the gateway
      status: mode === 'WALLET' ? 'PROCESSING' : 'REQUESTED',
      remarks: mode === 'RAZORPAY'
        ? 'Courier return (RTO). Awaiting gateway refund: an admin must initiate it; it completes only when Razorpay confirms.'
        : mode === 'MANUAL' ? 'Courier return (RTO). Awaiting manual refund.' : 'Courier return (RTO). Automatic wallet refund.',
    });
  } catch (e) {
    if (e?.code !== 11000) throw e;
    doc = await RefundRequest.findOne({ refundKey: key });
    if (!doc) throw e;
  }
  if (mode !== 'WALLET' || doc.status === 'COMPLETED') return doc;

  // Only one caller may credit; a crashed attempt's lock expires and is recovered below.
  const claimed = await RefundRequest.findOneAndUpdate(
    { _id: doc._id, status: 'PROCESSING', $or: [{ creditClaimedAt: null }, { creditClaimedAt: { $exists: false } }, { creditClaimedAt: { $lt: new Date(Date.now() - STALE_LOCK_MS) } }] },
    { $set: { creditClaimedAt: new Date() } },
    { new: true }
  );
  if (!claimed) return RefundRequest.findById(doc._id);

  // a crash after the credit but before completion must not credit twice
  const already = await UserWalletTransaction.findOne({ userId: order.user, returnId: key, type: 'CREDIT' }).lean();
  if (!already) {
    const credit = await creditUserWallet({
      userId: order.user, amount, category: 'REFUND', orderId: order.orderId, order: order._id, returnId: key,
      description: `Refund for courier-returned parcel, Order #${order.orderId} (₹${amount.toFixed(2)})`,
    });
    if (!credit.success) {
      await RefundRequest.updateOne({ _id: doc._id }, { $set: { creditClaimedAt: null, remarks: `Wallet credit failed: ${credit.message || 'unknown'}. Will retry.` } });
      return RefundRequest.findById(doc._id);
    }
  }
  const done = await RefundRequest.findOneAndUpdate(
    { _id: doc._id, status: 'PROCESSING' },
    { $set: { status: 'COMPLETED', processedAt: new Date(), remarks: 'Courier return (RTO). Credited to the customer wallet.' } },
    { new: true }
  );
  if (done) await ledgerForWalletRefund(done, order);
  return done || RefundRequest.findById(doc._id);
};

/** Keep the parent order's refundStatus truthful (set only for a fully returned order). */
const syncOrderRefundState = async (orderId) => {
  const fs = await OrderFulfillment.find({ order: orderId }).select('fulfillmentStatus').lean();
  if (!fs.length || !fs.every((f) => f.fulfillmentStatus === 'RETURNED')) return;
  const refunds = await RefundRequest.find({ order: orderId, refundKey: /^RTO/ }).select('status').lean();
  const allDone = refunds.length > 0 && refunds.every((r) => r.status === 'COMPLETED');
  await Order.updateOne({ _id: orderId }, { $set: allDone ? { refundStatus: 'Completed', refundedAt: new Date() } : { refundStatus: 'Pending' } });
};

/**
 * Called whenever a courier shipment of this order is confirmed RETURNED (and again on a repeated event, which is
 * safe). Creates/finishes the refunds that are due. Never refunds a delivered fulfilment.
 */
export const processRtoRefunds = async (orderObjectId) => {
  const order = await Order.findById(orderObjectId).lean();
  if (!order || order.paymentStatus !== 'Paid') return []; // nothing was collected, nothing to give back
  const fulfilments = await OrderFulfillment.find({ order: order._id }).lean();
  const results = [];
  const priorRefunds = await RefundRequest.find({ order: order._id, status: { $nin: ['REJECTED', 'FAILED'] } }).select('amount refundKey').lean();
  let committed = priorRefunds.reduce((a, r) => a + Number(r.amount || 0), 0);
  const known = new Set(priorRefunds.map((r) => r.refundKey).filter(Boolean));
  const guard = (key, amount) => known.has(key) || r2(committed + amount) <= r2(order.grandTotal); // never refund more than was paid
  const note = (key, amount) => { if (!known.has(key)) { committed += amount; known.add(key); } };

  for (const f of fulfilments.filter((x) => x.fulfillmentType === 'STANDARD' && x.fulfillmentStatus === 'RETURNED')) {
    const amount = r2((f.items || []).reduce((a, i) => a + Number(i.price || 0) * Number(i.quantity || 0), 0));
    const key = `RTO:${f._id}`;
    if (!(amount > 0) || !guard(key, amount)) continue;
    results.push(await ensureRefund({ key, amount, order, reason: `Courier return (RTO) of ${f.sellerName || 'seller'} parcel, Order #${order.orderId}` }));
    note(key, amount);
  }
  const wholeOrderReturned = fulfilments.length > 0 && fulfilments.every((x) => x.fulfillmentStatus === 'RETURNED');
  const fee = r2(order.shippingFee || 0);
  if (wholeOrderReturned && fee > 0) {
    const key = `RTO-FEE:${order._id}`;
    if (guard(key, fee)) {
      results.push(await ensureRefund({ key, amount: fee, order, reason: `Delivery fee refund: whole order returned by courier, Order #${order.orderId}` }));
      note(key, fee);
    }
  }
  await syncOrderRefundState(order._id);
  return results;
};

/** Customer-safe summary of the courier-return refunds of an order (no internal ids). */
export const courierRefundsForOrder = async (orderObjectId) => {
  const rows = await RefundRequest.find({ order: orderObjectId, refundKey: /^RTO/ }).select('amount refundMode status refundKey createdAt').sort({ createdAt: 1 }).lean();
  return rows.map((r) => ({
    kind: String(r.refundKey).startsWith('RTO-FEE') ? 'DELIVERY_FEE' : 'ITEMS',
    amount: r.amount,
    to: r.refundMode === 'WALLET' ? 'WALLET' : 'ORIGINAL_PAYMENT',
    // COMPLETED only when the money really moved (wallet credited / gateway confirmed)
    status: r.status === 'COMPLETED' ? 'COMPLETED' : r.status === 'PROCESSING' ? 'PROCESSING' : 'PENDING',
  }));
};

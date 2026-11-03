import mongoose from 'mongoose';
import Order from '../models/Order.model.js';
import SellerNotification from '../models/SellerNotification.model.js';
import Seller from '../models/Seller.model.js';
import RefundRequest from '../models/RefundRequest.model.js';
import PlatformLedger from '../models/PlatformLedger.model.js';
import TreasuryAccount, { REAL_MONEY_TYPES } from '../models/TreasuryAccount.model.js';
import GatewayPayment from '../models/GatewayPayment.model.js';
import GatewaySettlement from '../models/GatewaySettlement.model.js';
import BankStatementEntry from '../models/BankStatementEntry.model.js';
import {
  ensureTreasuryIndexes,
  ensureSystemAccount,
  postEntry,
  withTxn,
  SYSTEM_ACTOR,
} from './treasuryLedger.js';
import * as gateway from './razorpayGateway.js';

/**
 * Razorpay <-> treasury bridge.
 *
 *   capture    Dr Razorpay Clearing        Cr Customer Receipts         (money collected, NOT yet in the bank)
 *   refund     Dr Customer Refunds         Cr Razorpay Clearing         (only when Razorpay reports it PROCESSED)
 *   settlement Dr Bank (net)  Dr Gateway Fees (fee+tax)  Cr Razorpay Clearing (net + fees)
 *
 * Every figure comes from Razorpay (payment entity, refund entity, settlement entity / recon report).
 * Nothing is computed from an assumed fee rate.
 */

const UNASSIGNED = 'unassigned';
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const ts = (unix) => (unix ? new Date(Number(unix) * 1000) : new Date());

// ── Brand attribution ───────────────────────────────────────────────────────────────────────────
// An order belongs to the brand of the seller it was routed to (same attribution used everywhere else).
export const resolveOrderBrand = async (order) => {
  if (!order?._id) return UNASSIGNED;
  const notes = await SellerNotification.find({ order: order._id }).select('sellerId').lean();
  const ids = [...new Set(notes.map((n) => String(n.sellerId)))].filter((s) => OBJECT_ID.test(s));
  if (ids.length) {
    const sellers = await Seller.find({ _id: { $in: ids } }).select('brandId').lean();
    const brand = sellers.map((s) => s.brandId).find(Boolean);
    if (brand) return brand;
  }
  return UNASSIGNED;
};

const pushAudit = async (paymentDoc, entry) => {
  // One audit line per webhook event id - duplicate deliveries do not grow the history
  const filter = { _id: paymentDoc._id };
  if (entry.eventId) filter['audit.eventId'] = { $ne: entry.eventId };
  await GatewayPayment.updateOne(filter, { $push: { audit: { at: new Date(), ...entry } } });
};

// ── 1. Payment capture ──────────────────────────────────────────────────────────────────────────
/**
 * Records a CAPTURED online payment: payment audit record + Razorpay Clearing debit.
 * Idempotent (keyed by the Razorpay payment id), so webhooks, the verify call and repair jobs can all
 * call it for the same payment without ever posting twice. COD is rejected: cash on delivery is not
 * gateway income.
 */
export const recordGatewayCapture = async (order, meta = {}, { source = 'WEBHOOK', event = 'payment.captured', eventId = '' } = {}) => {
  await ensureTreasuryIndexes();
  if (!order) return { skipped: 'missing_order' };
  if (order.paymentMethod === 'COD') return { skipped: 'cod' };
  const paymentId = meta.paymentId || order.razorpay?.paymentId;
  if (!paymentId) return { skipped: 'no_payment_id' };
  const amountPaise = Number(meta.amount ?? order.razorpay?.amount ?? Math.round(Number(order.grandTotal) * 100));
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { skipped: 'bad_amount' };

  let gp = await GatewayPayment.findOne({ razorpayPaymentId: paymentId });
  const brandId = gp?.brandId || (await resolveOrderBrand(order));
  if (!gp) {
    try {
      gp = await GatewayPayment.create({
        razorpayPaymentId: paymentId,
        razorpayOrderId: meta.razorpayOrderId || order.razorpay?.orderId || '',
        order: order._id,
        orderNumber: order.orderId,
        brandId,
        amountPaise,
        currency: meta.currency || 'INR',
        method: meta.method || '',
        status: 'captured',
        capturedAt: new Date(),
        reportedFeePaise: meta.feePaise ?? null,
        reportedTaxPaise: meta.taxPaise ?? null,
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
      gp = await GatewayPayment.findOne({ razorpayPaymentId: paymentId });
    }
  }
  // Never downgrade a refunded payment; otherwise this attempt is now captured
  await GatewayPayment.updateOne(
    { _id: gp._id, status: { $in: ['created', 'authorized', 'failed'] } },
    { $set: { status: 'captured', capturedAt: new Date(), failedAt: null, failureCode: '', failureReason: '' } }
  );
  await pushAudit(gp, { source, event, eventId, status: 'captured', note: `Captured ${amountPaise} paise` });

  const result = await withTxn(async (session) => {
    const clearing = await ensureSystemAccount('GATEWAY_CLEARING', gp.brandId || brandId, session);
    const { entry, duplicate } = await postEntry(
      {
        description: `Razorpay payment ${paymentId} captured for order ${order.orderId}`,
        sourceModule: 'RAZORPAY_PAYMENT',
        sourceRef: paymentId,
        idempotencyKey: `rzp-capture:${paymentId}`,
        entryDate: gp.capturedAt || new Date(),
        actor: SYSTEM_ACTOR,
        meta: { orderId: order.orderId, razorpayOrderId: gp.razorpayOrderId },
        lines: [
          { accountId: clearing._id, debitPaise: gp.amountPaise, memo: 'Collected by Razorpay, awaiting settlement' },
          { systemCode: 'CUSTOMER_RECEIPTS', brandId: gp.brandId || brandId, creditPaise: gp.amountPaise },
        ],
      },
      { session }
    );
    await GatewayPayment.updateOne({ _id: gp._id }, { $set: { captureEntryId: entry._id } }, session ? { session } : undefined);
    return { entry, duplicate };
  });
  return { recorded: true, duplicate: result.duplicate, paymentId };
};

export const recordGatewayFailure = async (order, payment, { source = 'WEBHOOK', event = 'payment.failed', eventId = '' } = {}) => {
  await ensureTreasuryIndexes();
  if (!order || !payment?.id) return { skipped: true };
  const existing = await GatewayPayment.findOne({ razorpayPaymentId: payment.id });
  if (existing && ['captured', 'refunded', 'partially_refunded'].includes(existing.status)) {
    await pushAudit(existing, { source, event, eventId, status: existing.status, note: 'Ignored late failure event for a captured payment' });
    return { skipped: 'already_captured' };
  }
  const gp = existing || (await GatewayPayment.create({
    razorpayPaymentId: payment.id,
    razorpayOrderId: payment.order_id || '',
    order: order._id,
    orderNumber: order.orderId,
    brandId: await resolveOrderBrand(order),
    amountPaise: Number(payment.amount) || 0,
    currency: payment.currency || 'INR',
    method: payment.method || '',
    status: 'failed',
  }).catch(async (e) => { if (e?.code === 11000) return GatewayPayment.findOne({ razorpayPaymentId: payment.id }); throw e; }));
  await GatewayPayment.updateOne(
    { _id: gp._id, status: { $in: ['created', 'authorized', 'failed'] } },
    { $set: { status: 'failed', failedAt: ts(payment.created_at), failureCode: payment.error_code || '', failureReason: payment.error_description || '' } }
  );
  await pushAudit(gp, { source, event, eventId, status: 'failed', note: payment.error_description || '' });
  return { recorded: true };
};

export const recordGatewayAuthorized = async (order, payment, { source = 'WEBHOOK', event = 'payment.authorized', eventId = '' } = {}) => {
  await ensureTreasuryIndexes();
  if (!order || !payment?.id) return { skipped: true };
  let gp = await GatewayPayment.findOne({ razorpayPaymentId: payment.id });
  if (!gp) {
    gp = await GatewayPayment.create({
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id || '',
      order: order._id,
      orderNumber: order.orderId,
      brandId: await resolveOrderBrand(order),
      amountPaise: Number(payment.amount) || 0,
      currency: payment.currency || 'INR',
      method: payment.method || '',
      status: 'authorized',
    }).catch(async (e) => { if (e?.code === 11000) return GatewayPayment.findOne({ razorpayPaymentId: payment.id }); throw e; });
  }
  await pushAudit(gp, { source, event, eventId, status: 'authorized' });
  return { recorded: true };
};

// ── 2. Refunds ──────────────────────────────────────────────────────────────────────────────────
/** Which Razorpay payment (if any) paid for this refund's order, and how much of it is still refundable. */
export const gatewayContextForRefund = async (refund) => {
  const order = await Order.findOne({ $or: [{ _id: refund.order || null }, { orderId: refund.orderId }] }).lean();
  const paymentId = order?.razorpay?.paymentId;
  if (!order || order.paymentMethod === 'COD' || !paymentId || order.razorpay?.paymentStatus !== 'captured') {
    return { eligible: false, order };
  }
  const gp = await GatewayPayment.findOne({ razorpayPaymentId: paymentId });
  return { eligible: true, order, paymentId, gp };
};

/**
 * Starts a Razorpay refund for a RefundRequest. The request is marked PROCESSING (money is in flight) -
 * it only becomes COMPLETED when Razorpay confirms the refund as processed (webhook or explicit sync).
 * Duplicate protection: an atomic claim on gatewayRefund.status, a refundable-amount check against what
 * is already refunded / pending, and a lookup of existing gateway refunds before any retry.
 */
export const initiateGatewayRefund = async (refundId, { actor }) => {
  await ensureTreasuryIndexes();
  const refund = await RefundRequest.findById(refundId);
  if (!refund) throw Object.assign(new Error('Refund request not found'), { status: 404 });
  if (['COMPLETED', 'REJECTED'].includes(refund.status)) {
    throw Object.assign(new Error(`Refund is already ${refund.status}`), { status: 409 });
  }
  const ctx = await gatewayContextForRefund(refund);
  if (!ctx.eligible) throw Object.assign(new Error('This order was not paid through Razorpay, so it cannot be refunded through the gateway.'), { status: 400 });

  const amountPaise = Math.round(Number(refund.amount) * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) throw Object.assign(new Error('Invalid refund amount'), { status: 400 });

  let gp = ctx.gp;
  if (!gp) {
    // Payment captured before treasury tracking existed: bring it into the book first (idempotent)
    await recordGatewayCapture(ctx.order, { paymentId: ctx.paymentId, amount: ctx.order.razorpay.amount, razorpayOrderId: ctx.order.razorpay.orderId, method: ctx.order.razorpay.method }, { source: 'SYSTEM', event: 'backfill' });
    gp = await GatewayPayment.findOne({ razorpayPaymentId: ctx.paymentId });
  }
  const refundable = gp.amountPaise - gp.refundedPaise - gp.refundPendingPaise;
  const staleLock = Date.now() - 2 * 60 * 1000;
  // Claim the right to call Razorpay: only one request can move none/failed (or a stale 'initiating') to 'initiating'
  const claimed = await RefundRequest.findOneAndUpdate(
    {
      _id: refund._id,
      $or: [
        { 'gatewayRefund.status': { $in: ['', 'failed', null] } },
        { 'gatewayRefund.status': { $exists: false } },
        { 'gatewayRefund.status': 'initiating', 'gatewayRefund.initiatedAt': { $lt: new Date(staleLock) } },
      ],
    },
    {
      $set: {
        refundMode: 'RAZORPAY',
        'gatewayRefund.status': 'initiating',
        'gatewayRefund.razorpayPaymentId': ctx.paymentId,
        'gatewayRefund.amountPaise': amountPaise,
        'gatewayRefund.initiatedAt': new Date(),
        'gatewayRefund.initiatedBy': actor,
        'gatewayRefund.failureReason': '',
      },
      $inc: { 'gatewayRefund.attempts': 1 },
    },
    { returnDocument: 'after' }
  );
  if (!claimed) {
    throw Object.assign(new Error('A gateway refund has already been initiated for this request.'), { status: 409 });
  }
  if (amountPaise > refundable) {
    await RefundRequest.updateOne({ _id: refund._id }, { $set: { 'gatewayRefund.status': '', 'gatewayRefund.failureReason': '' } });
    throw Object.assign(new Error(`Refund exceeds the refundable amount (₹${(refundable / 100).toFixed(2)} remaining on this payment).`), { status: 400 });
  }

  const ref = String(claimed.refundId);
  try {
    // If an earlier attempt may have reached Razorpay (lost response), adopt that refund instead of creating a second one
    let gw = null;
    if ((claimed.gatewayRefund.attempts || 0) > 1) {
      const existing = await gateway.listPaymentRefunds(ctx.paymentId).catch(() => null);
      gw = existing?.items?.find((r) => r?.notes?.refund_request_id === ref) || null;
    }
    if (!gw) gw = await gateway.createRefund(ctx.paymentId, { amountPaise, refundRequestId: ref });

    const set = {
      status: 'PROCESSING',
      'gatewayRefund.razorpayRefundId': gw.id,
      'gatewayRefund.status': 'initiated',
      'gatewayRefund.amountPaise': Number(gw.amount) || amountPaise,
      processedBy: mongoose.Types.ObjectId.isValid(String(actor?.id)) ? actor.id : null,
    };
    const updated = await RefundRequest.findOneAndUpdate({ _id: refund._id }, { $set: set }, { returnDocument: 'after' });
    await GatewayPayment.updateOne({ _id: gp._id }, { $inc: { refundPendingPaise: Number(gw.amount) || amountPaise } });
    await pushAudit(gp, { source: 'SYSTEM', event: 'refund.initiated', status: gw.status || 'created', note: `Refund ${gw.id} initiated by ${actor?.email} for ${gw.amount} paise` });
    // Razorpay can return an already-processed refund (instant refunds)
    if (gw.status === 'processed') await completeGatewayRefund(updated, gw);
    return RefundRequest.findById(refund._id);
  } catch (e) {
    const retryable = e?.retryable;
    await RefundRequest.updateOne(
      { _id: refund._id, 'gatewayRefund.status': 'initiating' },
      // An ambiguous failure (timeout / 5xx) keeps the lock so nobody fires a blind second refund; the next
      // attempt looks the refund up first. A definite rejection by Razorpay releases it.
      { $set: { 'gatewayRefund.status': retryable ? 'initiating' : 'failed', 'gatewayRefund.failureReason': String(e.message).slice(0, 300) } }
    );
    throw Object.assign(new Error(`Razorpay refund failed: ${e.message}`), { status: e.statusCode >= 400 && e.statusCode < 500 ? 400 : 502 });
  }
};

/**
 * Razorpay says the refund is PROCESSED: finalise the request, post the treasury entry, update the
 * payment, and write the operational ledger row - each exactly once.
 */
export const completeGatewayRefund = async (refundDoc, gw) => {
  const amountPaise = Number(gw.amount) || refundDoc.gatewayRefund?.amountPaise || Math.round(Number(refundDoc.amount) * 100);
  // Atomic: only the first caller wins the transition to 'processed'
  const won = await RefundRequest.findOneAndUpdate(
    { _id: refundDoc._id, 'gatewayRefund.status': { $ne: 'processed' } },
    {
      $set: {
        status: 'COMPLETED',
        refundMode: 'RAZORPAY',
        gatewayRefundId: gw.id,
        'gatewayRefund.razorpayRefundId': gw.id,
        'gatewayRefund.status': 'processed',
        'gatewayRefund.amountPaise': amountPaise,
        'gatewayRefund.processedAt': new Date(),
        'gatewayRefund.failureReason': '',
        processedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  if (!won) return { duplicate: true };

  const paymentId = won.gatewayRefund.razorpayPaymentId || gw.payment_id;
  const gp = await GatewayPayment.findOne({ razorpayPaymentId: paymentId });
  const brandId = gp?.brandId || UNASSIGNED;
  try {
    await withTxn(async (session) => {
      const clearing = await ensureSystemAccount('GATEWAY_CLEARING', brandId, session);
      await postEntry(
        {
          description: `Razorpay refund ${gw.id} processed (${won.refundId}, order ${won.orderId})`,
          sourceModule: 'RAZORPAY_REFUND',
          sourceRef: gw.id,
          idempotencyKey: `rzp-refund:${gw.id}`,
          actor: SYSTEM_ACTOR,
          entryDate: new Date(),
          meta: { refundRequest: won.refundId, paymentId },
          lines: [
            { systemCode: 'CUSTOMER_REFUNDS', brandId, debitPaise: amountPaise },
            { accountId: clearing._id, creditPaise: amountPaise, memo: 'Refund taken from gateway balance' },
          ],
        },
        { session }
      );
    });
  } catch (e) {
    // Never leave a refund marked paid without its ledger entry: undo the transition so a retry can finish it
    await RefundRequest.updateOne({ _id: won._id }, { $set: { status: 'PROCESSING', 'gatewayRefund.status': 'initiated' } });
    throw e;
  }
  if (gp) {
    const refundedPaise = gp.refundedPaise + amountPaise;
    await GatewayPayment.updateOne(
      { _id: gp._id },
      {
        $set: { status: refundedPaise >= gp.amountPaise ? 'refunded' : 'partially_refunded' },
        $inc: { refundedPaise: amountPaise, refundPendingPaise: -Math.min(gp.refundPendingPaise, amountPaise) },
      }
    );
    await pushAudit(gp, { source: 'WEBHOOK', event: 'refund.processed', eventId: `refund:${gw.id}`, status: 'processed', note: `Refund ${gw.id} processed (${amountPaise} paise)` });
  }
  // Operational ledger row (existing Transactions screens), once
  const already = await PlatformLedger.findOne({ referenceModel: 'RefundRequest', referenceObjId: won._id, category: 'REFUND' }).lean();
  if (!already) {
    await PlatformLedger.create({
      transactionId: `TXN-LED-REF-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`,
      category: 'REFUND', type: 'DEBIT', amount: amountPaise / 100, source: 'PLATFORM_TREASURY', destination: 'USER',
      entityType: 'USER', entityId: String(won.userId || ''), entityName: won.userName || 'Customer',
      referenceModel: 'RefundRequest', referenceId: won.refundId, referenceObjId: won._id, status: 'SUCCESS',
      description: `Order Refund #${won.refundId} processed by Razorpay (${gw.id})`,
      metadata: { gatewayRefundId: gw.id, paymentId, brandId },
    }).catch(() => {});
  }
  // Keep the customer's order in step
  const orderQuery = won.order ? { _id: won.order } : { orderId: won.orderId };
  await Order.updateOne(orderQuery, { $set: { returnStatus: 'Refunded', orderStatus: 'Refund Completed', refundStatus: 'Completed', refundedAt: new Date() } });
  return { completed: true, refund: won };
};

export const markGatewayRefundFailed = async (refundDoc, gw) => {
  const reason = gw?.status_reason || gw?.error_description || 'Razorpay reported the refund as failed';
  const res = await RefundRequest.findOneAndUpdate(
    { _id: refundDoc._id, 'gatewayRefund.status': { $in: ['initiating', 'initiated', 'failed', ''] } }, // never overwrite 'processed'
    { $set: { status: 'FAILED', 'gatewayRefund.status': 'failed', 'gatewayRefund.failureReason': String(reason).slice(0, 300) } },
    { returnDocument: 'after' }
  );
  if (res) {
    const pend = Number(gw?.amount) || res.gatewayRefund.amountPaise || 0;
    const gp = await GatewayPayment.findOne({ razorpayPaymentId: res.gatewayRefund.razorpayPaymentId });
    if (gp) {
      await GatewayPayment.updateOne({ _id: gp._id }, { $inc: { refundPendingPaise: -Math.min(gp.refundPendingPaise, pend) } });
      await pushAudit(gp, { source: 'WEBHOOK', event: 'refund.failed', eventId: `refund:${gw?.id}:failed`, status: 'failed', note: reason });
    }
  }
  return { failed: !!res };
};

/** Webhook entry point for refund.created / refund.processed / refund.failed. */
export const processRefundEvent = async (event) => {
  await ensureTreasuryIndexes();
  const gw = event?.payload?.refund?.entity;
  if (!gw?.id) return { outcome: 'ignored', reason: 'missing_refund_entity' };
  const ref = gw.notes?.refund_request_id;
  let refund = await RefundRequest.findOne({ 'gatewayRefund.razorpayRefundId': gw.id });
  if (!refund && ref) refund = await RefundRequest.findOne({ refundId: ref });
  if (!refund) {
    // Refund created directly in the Razorpay dashboard: only record it if it is for a payment we know
    const gp = await GatewayPayment.findOne({ razorpayPaymentId: gw.payment_id });
    if (!gp) return { outcome: 'ignored', reason: 'unknown_payment' };
    refund = await RefundRequest.findOne({ 'gatewayRefund.razorpayRefundId': gw.id }) || await RefundRequest.create({
      refundId: `RZP-${gw.id}`,
      orderId: gp.orderNumber,
      order: gp.order,
      amount: Number(gw.amount) / 100,
      reason: 'Refund issued from the Razorpay dashboard',
      status: 'PROCESSING',
      paymentMethod: 'ONLINE',
      refundMode: 'RAZORPAY',
      source: 'GATEWAY_DASHBOARD',
      gatewayRefund: { razorpayPaymentId: gw.payment_id, razorpayRefundId: gw.id, status: 'initiated', amountPaise: Number(gw.amount), initiatedAt: new Date() },
    }).catch(async (e) => { if (e?.code === 11000) return RefundRequest.findOne({ refundId: `RZP-${gw.id}` }); throw e; });
    await GatewayPayment.updateOne({ _id: gp._id }, { $inc: { refundPendingPaise: Number(gw.amount) } });
  }
  switch (event.event) {
    case 'refund.created':
      await RefundRequest.updateOne(
        { _id: refund._id, 'gatewayRefund.status': { $in: ['', 'initiating'] } },
        { $set: { 'gatewayRefund.razorpayRefundId': gw.id, 'gatewayRefund.status': 'initiated', status: 'PROCESSING' } }
      );
      return { outcome: 'processed', reason: 'refund_created' };
    case 'refund.processed': {
      const r = await completeGatewayRefund(refund, gw);
      return { outcome: 'processed', reason: r.duplicate ? 'already_processed' : 'refund_completed' };
    }
    case 'refund.failed': {
      const r = await markGatewayRefundFailed(refund, gw);
      return { outcome: 'processed', reason: r.failed ? 'refund_failed' : 'already_final' };
    }
    default:
      return { outcome: 'ignored', reason: 'unsupported_refund_event' };
  }
};

/** Pull the refund's real state from Razorpay (covers a missed webhook). */
export const syncRefundFromGateway = async (refundId) => {
  const refund = await RefundRequest.findById(refundId);
  if (!refund) throw Object.assign(new Error('Refund request not found'), { status: 404 });
  const rid = refund.gatewayRefund?.razorpayRefundId;
  if (!rid) throw Object.assign(new Error('No gateway refund has been initiated for this request.'), { status: 400 });
  const gw = await gateway.fetchRefund(rid);
  if (gw.status === 'processed') await completeGatewayRefund(refund, gw);
  else if (gw.status === 'failed') await markGatewayRefundFailed(refund, gw);
  return { gatewayStatus: gw.status, refund: await RefundRequest.findById(refundId) };
};

// ── 3. Settlements ──────────────────────────────────────────────────────────────────────────────
const mapReconItem = (it) => {
  const type = ['payment', 'refund', 'adjustment'].includes(it.type) ? it.type : 'other';
  const gross = Number(it.amount) || 0;
  let amountPaise = gross;
  if (type === 'adjustment') amountPaise = (Number(it.credit) || 0) - (Number(it.debit) || 0);
  return {
    type,
    entityId: it.entity_id || '',
    paymentId: type === 'payment' ? it.entity_id || '' : it.payment_id || '',
    amountPaise,
    feePaise: Number(it.fee) || 0,
    taxPaise: Number(it.tax) || 0,
  };
};

/** Attribute each itemised line to a brand and verify that the lines add up to the settlement Razorpay reported. */
export const computeSettlementBreakdown = async (s) => {
  const net = s.netPaise;
  const fee = s.feePaise;
  if (!s.itemized || !s.items.length) return { ok: true, itemized: false, perBrand: null };
  const payIds = [...new Set(s.items.map((i) => i.paymentId).filter(Boolean))];
  const payments = payIds.length ? await GatewayPayment.find({ razorpayPaymentId: { $in: payIds } }).select('razorpayPaymentId brandId').lean() : [];
  const brandOf = new Map(payments.map((p) => [p.razorpayPaymentId, p.brandId || UNASSIGNED]));
  const per = new Map();
  const get = (b) => { if (!per.has(b)) per.set(b, { clearingPaise: 0, feePaise: 0 }); return per.get(b); };
  let gross = 0, refunds = 0, adjustments = 0, itemFees = 0;
  for (const it of s.items) {
    const brand = brandOf.get(it.paymentId) || UNASSIGNED;
    const row = get(brand);
    if (it.type === 'payment') { row.clearingPaise += it.amountPaise; gross += it.amountPaise; }
    else if (it.type === 'refund') { row.clearingPaise -= it.amountPaise; refunds += it.amountPaise; }
    else { row.clearingPaise += it.amountPaise; adjustments += it.amountPaise; }
    row.feePaise += it.feePaise;
    itemFees += it.feePaise;
  }
  const clearingTotal = [...per.values()].reduce((a, r) => a + r.clearingPaise, 0);
  const expected = net + fee;
  const ok = clearingTotal === expected && itemFees === fee;
  return {
    ok, itemized: true, gross, refunds, adjustments,
    differencePaise: clearingTotal - expected,
    perBrand: [...per.entries()].map(([brandId, v]) => ({ brandId, ...v })),
  };
};

/** Creates / refreshes a settlement from Razorpay data. A posted settlement's money fields are never overwritten silently. */
export const upsertSettlement = async ({ entity, items = null, source = 'WEBHOOK' }) => {
  await ensureTreasuryIndexes();
  if (!entity?.id) throw new Error('Settlement entity without an id');
  const incoming = {
    status: ['created', 'processed', 'failed'].includes(entity.status) ? entity.status : 'created',
    netPaise: Number(entity.amount) || 0,
    feePaise: Number(entity.fees) || 0,
    taxPaise: Number(entity.tax) || 0,
    utr: entity.utr || '',
    settledAt: ts(entity.created_at),
  };
  let s = await GatewaySettlement.findOne({ razorpaySettlementId: entity.id });
  if (!s) {
    try {
      s = await GatewaySettlement.create({ razorpaySettlementId: entity.id, source, ...incoming });
    } catch (e) {
      if (e?.code !== 11000) throw e;
      s = await GatewaySettlement.findOne({ razorpaySettlementId: entity.id });
    }
  } else if (!s.postedEntryId) {
    Object.assign(s, incoming);
  } else if (s.netPaise !== incoming.netPaise || s.feePaise !== incoming.feePaise) {
    s.reconStatus = 'DISCREPANCY';
    s.discrepancyNote = `Razorpay reports different amounts after posting (net ${incoming.netPaise}, fees ${incoming.feePaise}).`;
  } else if (incoming.utr && !s.utr) {
    s.utr = incoming.utr;
  }
  if (items && Array.isArray(items) && !s.postedEntryId) {
    s.items = items.map(mapReconItem);
    s.itemized = true;
  }
  if (s.itemized && !s.postedEntryId) {
    const b = await computeSettlementBreakdown(s);
    s.grossPaise = b.gross || 0;
    s.refundPaise = b.refunds || 0;
    s.adjustmentPaise = b.adjustments || 0;
    s.brandBreakdown = b.perBrand || [];
    if (!b.ok) {
      s.reconStatus = 'DISCREPANCY';
      s.discrepancyPaise = b.differencePaise || 0;
      s.discrepancyNote = 'Itemised payments, refunds and fees do not add up to the settlement Razorpay reported.';
    } else if (s.reconStatus === 'DISCREPANCY' && /do not add up/.test(s.discrepancyNote)) {
      s.reconStatus = 'PENDING'; s.discrepancyPaise = 0; s.discrepancyNote = '';
    }
  }
  await s.save();
  return s;
};

/**
 * Posts a processed settlement to the book: the money really arrived in the bank, so the bank is
 * debited by the NET amount, fees are expensed, and Razorpay Clearing is released by net + fees.
 */
export const postSettlement = async (settlementId, { destinationAccountId, actor }) => {
  await ensureTreasuryIndexes();
  const s = await GatewaySettlement.findById(settlementId);
  if (!s) throw Object.assign(new Error('Settlement not found'), { status: 404 });
  if (s.postedEntryId) throw Object.assign(new Error('This settlement is already posted.'), { status: 409 });
  if (s.status !== 'processed') throw Object.assign(new Error(`Only a processed settlement can be posted (this one is "${s.status}"). Capturing a payment does not mean it has been settled.`), { status: 409 });
  if (s.reconStatus === 'DISCREPANCY' && s.discrepancyPaise !== 0 && !s.matchedStatementId && /do not add up/.test(s.discrepancyNote)) {
    throw Object.assign(new Error('The settlement does not reconcile (its items do not add up to the reported net and fees). Re-sync it from Razorpay or investigate before posting.'), { status: 409 });
  }
  const dest = await TreasuryAccount.findById(destinationAccountId);
  if (!dest || !dest.isActive || !REAL_MONEY_TYPES.includes(dest.type) || dest.type === 'CASH') {
    throw Object.assign(new Error('Choose an active bank account as the settlement destination.'), { status: 400 });
  }

  const destBrand = dest.brandId === 'PLATFORM' ? UNASSIGNED : dest.brandId;
  let perBrand = s.brandBreakdown?.length ? s.brandBreakdown.map((b) => ({ brandId: b.brandId, clearingPaise: b.clearingPaise, feePaise: b.feePaise })) : null;
  if (!perBrand) perBrand = [{ brandId: destBrand, clearingPaise: s.netPaise + s.feePaise, feePaise: s.feePaise }];
  const clearingTotal = perBrand.reduce((a, b) => a + b.clearingPaise, 0);
  if (clearingTotal !== s.netPaise + s.feePaise) throw Object.assign(new Error('Settlement breakdown does not equal net + fees.'), { status: 409 });

  const result = await withTxn(async (session) => {
    const lines = [];
    if (s.netPaise > 0) lines.push({ accountId: dest._id, debitPaise: s.netPaise, memo: `Settlement ${s.razorpaySettlementId} UTR ${s.utr || '-'}` });
    for (const b of perBrand) {
      if (b.feePaise > 0) {
        const feeAcc = await ensureSystemAccount('GATEWAY_FEE', b.brandId, session);
        lines.push({ accountId: feeAcc._id, debitPaise: b.feePaise, memo: 'Razorpay fee and tax' });
      }
      if (b.clearingPaise !== 0) {
        const clr = await ensureSystemAccount('GATEWAY_CLEARING', b.brandId, session);
        if (b.clearingPaise > 0) lines.push({ accountId: clr._id, creditPaise: b.clearingPaise, memo: 'Released from clearing' });
        else lines.push({ accountId: clr._id, debitPaise: -b.clearingPaise, memo: 'Refunds / adjustments netted in this settlement' });
      }
    }
    const { entry, duplicate } = await postEntry(
      {
        description: `Razorpay settlement ${s.razorpaySettlementId} credited to ${dest.name} (net ₹${(s.netPaise / 100).toFixed(2)}, fees ₹${(s.feePaise / 100).toFixed(2)})`,
        sourceModule: 'RAZORPAY_SETTLEMENT',
        sourceRef: s.razorpaySettlementId,
        idempotencyKey: `rzp-settlement:${s.razorpaySettlementId}`,
        entryDate: s.settledAt || new Date(),
        actor,
        lines,
        meta: { utr: s.utr, itemized: s.itemized },
      },
      { session }
    );
    const upd = await GatewaySettlement.updateOne(
      { _id: s._id, postedEntryId: null },
      {
        $set: {
          postedEntryId: entry._id, postedAt: new Date(), destinationAccountId: dest._id, brandId: dest.brandId,
          postedBy: { id: actor.id, email: actor.email, role: actor.role },
          ...(s.itemized ? {} : { discrepancyNote: s.discrepancyNote || 'Posted without per-payment itemisation (webhook data only).' }),
        },
      },
      session ? { session } : undefined
    );
    return { entry, duplicate, updated: upd.modifiedCount };
  });
  const payIds = s.items.filter((i) => i.type === 'payment').map((i) => i.paymentId).filter(Boolean);
  if (payIds.length) await GatewayPayment.updateMany({ razorpayPaymentId: { $in: payIds } }, { $set: { settlementId: s.razorpaySettlementId } });
  return { settlement: await GatewaySettlement.findById(s._id), entry: result.entry, duplicate: result.duplicate };
};

/** Webhook entry point for settlement.processed. Auto-posts only when exactly one default settlement account exists. */
export const processSettlementEvent = async (event) => {
  const entity = event?.payload?.settlement?.entity;
  if (!entity?.id) return { outcome: 'ignored', reason: 'missing_settlement_entity' };
  const s = await upsertSettlement({ entity, source: 'WEBHOOK' });
  if (s.status === 'processed' && !s.postedEntryId) {
    const defaults = await TreasuryAccount.find({ isSettlementAccount: true, isActive: true, type: { $in: ['CURRENT', 'SAVINGS', 'ESCROW'] } });
    if (defaults.length === 1) {
      try {
        await postSettlement(s._id, { destinationAccountId: defaults[0]._id, actor: SYSTEM_ACTOR });
        return { outcome: 'processed', reason: 'settlement_posted' };
      } catch (e) {
        console.warn('[Treasury] Settlement received but not auto-posted:', e.message);
      }
    }
  }
  return { outcome: 'processed', reason: 'settlement_recorded' };
};

const fetchAllRecon = async (year, month, day) => {
  const all = [];
  for (let skip = 0; skip < 20000; skip += 1000) {
    const page = await gateway.fetchReconCombined({ year, month, day, count: 1000, skip });
    const items = page?.items || [];
    all.push(...items);
    if (items.length < 1000) break;
  }
  return all;
};

/** Pulls settlements (and their per-transaction detail) from Razorpay for a date window. */
export const syncSettlements = async ({ from, to }) => {
  await ensureTreasuryIndexes();
  const fromUnix = Math.floor(new Date(from).getTime() / 1000);
  const toUnix = Math.floor(new Date(to).getTime() / 1000);
  const entities = [];
  for (let skip = 0; skip < 5000; skip += 100) {
    const page = await gateway.listSettlements({ from: fromUnix, to: toUnix, count: 100, skip });
    const items = page?.items || [];
    entities.push(...items);
    if (items.length < 100) break;
  }
  const reconCache = new Map();
  const out = { fetched: entities.length, created: 0, updated: 0, itemized: 0, itemizationFailed: 0 };
  for (const entity of entities) {
    const before = await GatewaySettlement.findOne({ razorpaySettlementId: entity.id }).select('_id postedEntryId').lean();
    let items = null;
    if (entity.status === 'processed' && !before?.postedEntryId) {
      const d = ts(entity.created_at);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
      try {
        if (!reconCache.has(key)) reconCache.set(key, await fetchAllRecon(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
        items = reconCache.get(key).filter((r) => r.settlement_id === entity.id && r.type !== 'settlement');
        if (items.length === 0) items = null;
      } catch (e) {
        out.itemizationFailed += 1;
        console.warn(`[Treasury] Recon report unavailable for settlement ${entity.id}: ${e.message}`);
      }
    }
    await upsertSettlement({ entity, items, source: 'SYNC' });
    if (items) out.itemized += 1;
    if (before) out.updated += 1; else out.created += 1;
  }
  return out;
};

// ── 4. Reconciliation against bank statement credits ────────────────────────────────────────────
const DAY = 24 * 60 * 60 * 1000;
const refMatches = (statementRef, utr) => {
  if (!statementRef || !utr) return false;
  const a = String(statementRef).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const b = String(utr).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a));
};

/** Applies the match rules for one settlement against one statement credit. Returns the resulting recon status. */
export const evaluateMatch = (settlement, statement) => {
  const sameAmount = statement.amountPaise === settlement.netPaise;
  const refOk = refMatches(statement.reference, settlement.utr);
  const near = settlement.settledAt ? Math.abs(new Date(statement.entryDate) - new Date(settlement.settledAt)) <= 3 * DAY : false;
  if (sameAmount && refOk) return { status: 'MATCHED', differencePaise: 0 };
  if (sameAmount && near) return { status: 'PARTIAL', differencePaise: 0 }; // probable: needs a human to confirm
  if (refOk && !sameAmount) return { status: 'DISCREPANCY', differencePaise: statement.amountPaise - settlement.netPaise };
  return null;
};

export const matchSettlementToStatement = async (settlementId, statementId, { confirm = true } = {}) => {
  const s = await GatewaySettlement.findById(settlementId);
  const st = await BankStatementEntry.findById(statementId);
  if (!s || !st) throw Object.assign(new Error('Settlement or bank statement entry not found'), { status: 404 });
  if (st.direction !== 'CREDIT') throw Object.assign(new Error('Only a bank credit can be matched to a settlement.'), { status: 400 });
  if (st.status === 'LINKED' || (st.status === 'MATCHED' && String(st.matchedSettlementId) !== String(s._id))) {
    throw Object.assign(new Error('This bank credit is already matched or allocated.'), { status: 409 });
  }
  if (s.status !== 'processed') throw Object.assign(new Error('Only a processed settlement can be matched to a bank credit.'), { status: 409 });
  const ev = evaluateMatch(s, st) || { status: st.amountPaise === s.netPaise ? 'PARTIAL' : 'DISCREPANCY', differencePaise: st.amountPaise - s.netPaise };
  const status = ev.status === 'PARTIAL' && confirm ? 'MATCHED' : ev.status; // an admin explicitly confirming turns "probable" into matched
  const stillOpen = status === 'MATCHED';
  await GatewaySettlement.updateOne(
    { _id: s._id },
    { $set: { reconStatus: status, matchedStatementId: st._id, discrepancyPaise: ev.differencePaise, discrepancyNote: ev.differencePaise ? `Bank credit differs from the settlement by ${(ev.differencePaise / 100).toFixed(2)}` : '' } }
  );
  await BankStatementEntry.updateOne({ _id: st._id }, { $set: { status: stillOpen ? 'MATCHED' : 'UNMATCHED', matchedSettlementId: stillOpen ? s._id : null } });
  return { status, differencePaise: ev.differencePaise };
};

export const unmatchSettlement = async (settlementId) => {
  const s = await GatewaySettlement.findById(settlementId);
  if (!s) throw Object.assign(new Error('Settlement not found'), { status: 404 });
  if (s.matchedStatementId) await BankStatementEntry.updateOne({ _id: s.matchedStatementId, matchedSettlementId: s._id }, { $set: { status: 'UNMATCHED', matchedSettlementId: null } });
  await GatewaySettlement.updateOne({ _id: s._id }, { $set: { reconStatus: 'PENDING', matchedStatementId: null, discrepancyPaise: 0, discrepancyNote: '' } });
  return { ok: true };
};

/** Tries every open processed settlement against every unmatched bank credit. Never guesses: ambiguous candidates stay PARTIAL. */
export const autoReconcile = async ({ brandFilter = {} } = {}) => {
  const settlements = await GatewaySettlement.find({ status: 'processed', reconStatus: { $in: ['PENDING', 'PARTIAL', 'DISCREPANCY'] }, ...brandFilter });
  const out = { matched: 0, partial: 0, discrepancies: 0, untouched: 0 };
  for (const s of settlements) {
    const credits = await BankStatementEntry.find({
      direction: 'CREDIT', status: 'UNMATCHED', source: 'BANK_STATEMENT',
      ...(s.destinationAccountId ? { $or: [{ accountId: s.destinationAccountId }, { accountId: null }] } : {}),
    });
    const evals = credits.map((c) => ({ c, ev: evaluateMatch(s, c) })).filter((x) => x.ev);
    const exact = evals.filter((x) => x.ev.status === 'MATCHED');
    if (exact.length === 1) {
      await matchSettlementToStatement(s._id, exact[0].c._id, { confirm: false });
      out.matched += 1;
    } else if (exact.length === 0 && evals.length > 0) {
      const best = evals[0];
      await GatewaySettlement.updateOne({ _id: s._id, reconStatus: { $ne: 'MATCHED' } }, { $set: { reconStatus: best.ev.status, discrepancyPaise: best.ev.differencePaise, discrepancyNote: best.ev.status === 'PARTIAL' ? 'A probable bank credit exists - confirm the match.' : `Matched by reference but the amount differs by ${(best.ev.differencePaise / 100).toFixed(2)}.` } });
      if (best.ev.status === 'PARTIAL') out.partial += 1; else out.discrepancies += 1;
    } else {
      out.untouched += 1; // none, or several equally good candidates - leave for a human
    }
  }
  return out;
};

// ── 5. Repair job: bring captured Razorpay orders that predate the treasury into the book ───────
export const backfillGatewayCaptures = async ({ limit = 500 } = {}) => {
  const orders = await Order.find({ 'razorpay.paymentStatus': 'captured', 'razorpay.paymentId': { $type: 'string' }, paymentMethod: { $ne: 'COD' } }).limit(limit);
  let recorded = 0, duplicates = 0;
  for (const o of orders) {
    const r = await recordGatewayCapture(o, { paymentId: o.razorpay.paymentId, amount: o.razorpay.amount, razorpayOrderId: o.razorpay.orderId, method: o.razorpay.method }, { source: 'SYSTEM', event: 'backfill' });
    if (r.recorded && !r.duplicate) recorded += 1; else duplicates += 1;
  }
  return { scanned: orders.length, recorded, alreadyRecorded: duplicates };
};

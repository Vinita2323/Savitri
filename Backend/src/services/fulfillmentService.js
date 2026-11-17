// Phase 2 — fulfilment decision engine + seller-level fulfilment records.
//
// One customer checkout / one payment / one parent Order. Each seller's items are fulfilled either by our own
// captains (INSTANT, the existing workflow) or, in later phases, by a third-party courier (STANDARD).
// All decision logic lives here so checkout, order creation and the API share exactly the same rules.
import mongoose from 'mongoose';
import Seller from '../models/Seller.model.js';
import Order from '../models/Order.model.js';
import OrderFulfillment from '../models/OrderFulfillment.model.js';
import { haversineDistanceRaw } from '../utils/haversine.js';
import { getEffectiveStock } from '../utils/productStock.js';
import { isValidCoordinate } from '../utils/sellerLocationHelper.js';

const DEFAULT_SELLER_KEY = 'ShippNex Official Store';

export const REASONS = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INSTANT_NOT_SUPPORTED: 'INSTANT_NOT_SUPPORTED',
  OUTSIDE_LOCAL_AREA: 'OUTSIDE_LOCAL_AREA',
  SELLER_LOCATION_MISSING: 'SELLER_LOCATION_MISSING',
  STANDARD_NOT_SUPPORTED: 'STANDARD_NOT_SUPPORTED',
  SHIPPING_DISABLED: 'SHIPPING_DISABLED',
  PRODUCT_NOT_SHIPPING_READY: 'PRODUCT_NOT_SHIPPING_READY',
  PICKUP_ADDRESS_MISSING: 'PICKUP_ADDRESS_MISSING',
  PICKUP_ADDRESS_INCOMPLETE: 'PICKUP_ADDRESS_INCOMPLETE',
  PICKUP_ADDRESS_REJECTED: 'PICKUP_ADDRESS_REJECTED',
  REQUESTED_METHOD_UNAVAILABLE: 'REQUESTED_METHOD_UNAVAILABLE',
};

const REASON_TEXT = {
  OUT_OF_STOCK: (p) => `"${p}" is out of stock.`,
  INSTANT_NOT_SUPPORTED: (p) => `"${p}" is not available for instant delivery.`,
  OUTSIDE_LOCAL_AREA: () => 'This store does not deliver instantly to your location.',
  SELLER_LOCATION_MISSING: () => 'The store location is not set, so instant delivery cannot be confirmed.',
  STANDARD_NOT_SUPPORTED: (p) => `"${p}" is not available for standard (courier) delivery.`,
  SHIPPING_DISABLED: (p) => `Courier shipping is not enabled for "${p}".`,
  PRODUCT_NOT_SHIPPING_READY: (p) => `"${p}" is missing weight or package dimensions for courier shipping.`,
  PICKUP_ADDRESS_MISSING: () => 'The seller has not added a pickup address for courier dispatch.',
  PICKUP_ADDRESS_INCOMPLETE: () => 'The seller\'s pickup address is incomplete.',
  PICKUP_ADDRESS_REJECTED: () => 'The seller\'s pickup address was rejected, so courier dispatch is unavailable.',
  REQUESTED_METHOD_UNAVAILABLE: (m) => `${m === 'STANDARD' ? 'Standard' : 'Instant'} delivery is not available for this seller's items.`,
};
const reason = (code, arg) => ({ code, message: (REASON_TEXT[code] || (() => code))(arg) });

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : NaN);

/** Same service-radius rule as the storefront (sellerLocationHelper): serviceRadius if > 0, else 5 km. */
export const effectiveRadiusKm = (seller) => (num(seller?.serviceRadius) > 0 ? num(seller.serviceRadius) : 5);

const sellerCoords = (seller) => {
  const c = seller?.warehouseLocation?.location?.coordinates || seller?.location?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = num(c[0]); const lat = num(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

/** Complete, usable pickup address (does not say anything about verification). */
export const pickupAddressProblem = (seller) => {
  const a = seller?.pickupAddress;
  if (!a || !a.addressLine1) return reason(REASONS.PICKUP_ADDRESS_MISSING);
  const ok = a.contactPerson && /^[6-9]\d{9}$/.test(String(a.phone || '')) && a.city && a.state && /^[1-9]\d{5}$/.test(String(a.pincode || ''));
  return ok ? null : reason(REASONS.PICKUP_ADDRESS_INCOMPLETE);
};

export const productFulfillmentType = (product) => {
  const t = String(product?.fulfillmentType || '').toUpperCase();
  return ['INSTANT', 'STANDARD', 'BOTH'].includes(t) ? t : 'INSTANT'; // legacy products behave as INSTANT
};

/**
 * Decide the delivery methods for ONE seller's products. Pure function (no DB access).
 * customer: { lat, lng } optional. Without coordinates the local-area check cannot run and INSTANT is allowed
 * exactly as before this phase (locationVerified=false) so existing checkouts keep working.
 */
export const decideSellerFulfillment = ({ products = [], seller = null, customer = {}, requested = null }) => {
  const rejectionReasons = [];
  const warnings = [];
  const names = products.map((p) => p?.name || 'item');
  const hasCoords = isValidCoordinate(customer?.lat, customer?.lng);

  // ----- product-level checks
  let instantProducts = true; let standardProducts = true;
  const instantWhy = []; const standardWhy = [];
  products.forEach((p, i) => {
    const type = productFulfillmentType(p);
    if (type === 'STANDARD') { instantProducts = false; instantWhy.push(reason(REASONS.INSTANT_NOT_SUPPORTED, names[i])); }
    if (type === 'INSTANT') { standardProducts = false; standardWhy.push(reason(REASONS.STANDARD_NOT_SUPPORTED, names[i])); }
    if (type !== 'INSTANT') {
      if (!p?.shippingEnabled) { standardProducts = false; standardWhy.push(reason(REASONS.SHIPPING_DISABLED, names[i])); }
      else if (!p?.shippingReady) { standardProducts = false; standardWhy.push(reason(REASONS.PRODUCT_NOT_SHIPPING_READY, names[i])); }
    }
  });
  const outOfStock = products.map((p, i) => (getEffectiveStock(p) <= 0 ? reason(REASONS.OUT_OF_STOCK, names[i]) : null)).filter(Boolean);

  // ----- INSTANT: existing local delivery eligibility
  let instantEligible = instantProducts; let locationVerified = false;
  if (instantProducts) {
    if (hasCoords) {
      const c = sellerCoords(seller);
      if (!c) { instantEligible = false; instantWhy.push(reason(REASONS.SELLER_LOCATION_MISSING)); }
      else {
        const d = haversineDistanceRaw(Number(customer.lat), Number(customer.lng), c.lat, c.lng);
        locationVerified = true;
        if (d > effectiveRadiusKm(seller)) { instantEligible = false; instantWhy.push(reason(REASONS.OUTSIDE_LOCAL_AREA)); }
      }
    } else {
      warnings.push('LOCATION_NOT_VERIFIED');
    }
  } else if (hasCoords) locationVerified = true;

  // ----- STANDARD: product readiness + seller pickup address
  let standardEligible = standardProducts; let pickupAddressStatus = seller?.pickupAddressStatus || 'PENDING';
  if (standardProducts) {
    const problem = pickupAddressProblem(seller);
    if (problem) { standardEligible = false; standardWhy.push(problem); }
    else if (pickupAddressStatus === 'REJECTED') { standardEligible = false; standardWhy.push(reason(REASONS.PICKUP_ADDRESS_REJECTED)); }
    else if (pickupAddressStatus !== 'VERIFIED') warnings.push('PICKUP_ADDRESS_PENDING_VERIFICATION');
  }
  if (outOfStock.length) { instantEligible = false; standardEligible = false; }

  const eligibleMethods = [];
  if (instantEligible) eligibleMethods.push('INSTANT');
  if (standardEligible) eligibleMethods.push('STANDARD');

  let selectedMethod = null;
  const req = requested ? String(requested).toUpperCase() : null;
  if (req && ['INSTANT', 'STANDARD'].includes(req)) {
    if (eligibleMethods.includes(req)) selectedMethod = req;
    else rejectionReasons.push(reason(REASONS.REQUESTED_METHOD_UNAVAILABLE, req));
  } else if (eligibleMethods.length) {
    selectedMethod = eligibleMethods[0]; // INSTANT first: preserves today's behaviour when both work
  }
  if (!eligibleMethods.length || (req && !selectedMethod)) {
    rejectionReasons.push(...outOfStock, ...instantWhy, ...standardWhy);
  }

  return {
    eligibleMethods,
    selectedMethod,
    instantEligible,
    standardEligible,
    rejectionReasons: dedupe(rejectionReasons),
    warnings,
    pickupAddressStatus,
    pickupAddressVerified: pickupAddressStatus === 'VERIFIED',
    requiresCourierServiceabilityCheck: selectedMethod === 'STANDARD' || (selectedMethod === null && standardEligible),
    locationVerified,
    deliverable: Boolean(selectedMethod),
  };
};

const dedupe = (list) => { const seen = new Set(); return list.filter((r) => (seen.has(r.message) ? false : seen.add(r.message))); };

/** Key that groups a product with the seller notification (same expression the order code stores in item.seller). */
export const sellerKeyForProduct = (product) => String(product?.seller || DEFAULT_SELLER_KEY);

const resolveSeller = async (sellerKey, sellerIdHint, cache) => {
  const ck = `${sellerIdHint || ''}|${sellerKey}`;
  if (cache.has(ck)) return cache.get(ck);
  let doc = null;
  if (sellerIdHint && mongoose.Types.ObjectId.isValid(String(sellerIdHint))) doc = await Seller.findById(sellerIdHint).lean();
  if (!doc && mongoose.Types.ObjectId.isValid(sellerKey)) doc = await Seller.findById(sellerKey).lean();
  if (!doc) doc = await Seller.findOne({ $or: [{ phone: sellerKey }, { businessName: sellerKey }, { ownerName: sellerKey }] }).lean();
  cache.set(ck, doc);
  return doc;
};

/**
 * Evaluate a whole cart. `products` are Product documents/lean objects (already loaded by the caller).
 * requested: { [sellerKey]: 'INSTANT' | 'STANDARD' } — customer preference, always re-validated here.
 */
export const evaluateCartFulfillment = async ({ products = [], customer = {}, requested = {} }) => {
  const groups = new Map();
  for (const p of products) {
    const key = sellerKeyForProduct(p);
    if (!groups.has(key)) groups.set(key, { sellerKey: key, sellerIdHint: p?.sellerId ? String(p.sellerId) : '', products: [] });
    groups.get(key).products.push(p);
  }
  const cache = new Map();
  const sellers = [];
  for (const g of groups.values()) {
    const seller = await resolveSeller(g.sellerKey, g.sellerIdHint, cache);
    const decision = decideSellerFulfillment({ products: g.products, seller, customer, requested: requested?.[g.sellerKey] });
    sellers.push({
      sellerKey: g.sellerKey,
      sellerId: seller ? String(seller._id) : g.sellerIdHint || '',
      sellerName: seller?.businessName || seller?.ownerName || g.sellerKey,
      productIds: g.products.map((p) => String(p._id)),
      ...decision,
    });
  }
  const blocking = sellers.filter((s) => !s.deliverable);
  const methods = [...new Set(sellers.map((s) => s.selectedMethod).filter(Boolean))];
  return {
    ok: blocking.length === 0,
    sellers,
    blocking,
    isMixed: methods.length > 1,
    methods,
    // honest wording: courier availability for the customer's pincode is only known once courier APIs are integrated
    courierServiceabilityConfirmed: false,
    note: methods.includes('STANDARD') ? 'Standard delivery availability for your PIN code will be confirmed by the courier after the order is placed.' : '',
  };
};

// ---------------------------------------------------------------------------------------------
// Fulfilment records
// ---------------------------------------------------------------------------------------------
const pickAddress = (a) => (a ? JSON.parse(JSON.stringify(a.toObject ? a.toObject() : a)) : null);

/** Idempotent: a retry (or the online-payment webhook racing checkout) can never create a duplicate. */
export const ensureOrderFulfillment = async ({ order, sellerKey, groupItems, sellerDoc, assignedSellerId, sellerName, notification, shippingAddress, products = [] }) => {
  const plan = (order.fulfillmentPlan || []).find((p) => p.sellerKey === sellerKey);
  const type = plan?.method === 'STANDARD' ? 'STANDARD' : 'INSTANT';
  const pickup = pickAddress(sellerDoc?.pickupAddress);
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = (groupItems || []).map((it) => {
    const p = byId.get(String(it.product)) || {};
    return {
      product: it.product, name: it.name, sku: it.sku || '', variantSku: it.variantSku || '', variantTitle: it.variantTitle || '',
      quantity: it.quantity, price: it.price, image: it.image || '',
      weightKg: p.weightKg ?? null, length: p.length ?? null, breadth: p.breadth ?? null, height: p.height ?? null,
    };
  });
  const doc = {
    order: order._id, orderId: order.orderId, sellerKey, sellerId: assignedSellerId || '', sellerName: sellerName || sellerKey,
    brandId: sellerDoc?.brandId || '', notification: notification?._id || null, items,
    fulfillmentType: type, deliveryMethod: type === 'STANDARD' ? 'COURIER' : 'LOCAL_CAPTAIN',
    fulfillmentStatus: 'PENDING', statusHistory: [{ status: 'PENDING', at: new Date() }],
    pickupAddressSnapshot: type === 'STANDARD' ? pickup : null,
    deliveryAddressSnapshot: pickAddress(shippingAddress),
    pickupAddressStatus: type === 'STANDARD' ? (sellerDoc?.pickupAddressStatus || 'PENDING') : '',
    dispatchReady: type === 'STANDARD' && sellerDoc?.pickupAddressStatus === 'VERIFIED',
    requiresCourierServiceabilityCheck: type === 'STANDARD',
    locationVerified: Boolean(plan?.locationVerified),
  };
  try {
    return await OrderFulfillment.findOneAndUpdate({ order: order._id, sellerKey }, { $setOnInsert: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (e) {
    if (e?.code === 11000) return OrderFulfillment.findOne({ order: order._id, sellerKey }); // lost a race: the other writer created it
    throw e;
  }
};

// ---------------------------------------------------------------------------------------------
// Status mapping (SellerNotification.status -> fulfilment status) and parent roll-up
//   NEW -> PENDING | ACCEPTED -> CONFIRMED | PROCESSING -> PROCESSING
//   PACKED -> PACKED (INSTANT) / READY_FOR_DISPATCH (STANDARD) | Reached Store -> PACKED
//   OUT_FOR_DELIVERY -> OUT_FOR_DELIVERY (INSTANT) / IN_TRANSIT (STANDARD) | DELIVERED -> DELIVERED
//   REJECTED / Cancelled -> CANCELLED
// ---------------------------------------------------------------------------------------------
export const fulfillmentStatusFromNotification = (status, type) => {
  const s = String(status || '').toUpperCase().replace(/[\s/]+/g, '_');
  switch (s) {
    case 'NEW': return 'PENDING';
    case 'ACCEPTED': return 'CONFIRMED';
    case 'PROCESSING': return 'PROCESSING';
    case 'PACKED': return type === 'STANDARD' ? 'READY_FOR_DISPATCH' : 'PACKED';
    case 'REACHED_STORE': case 'REACHED_STORE_PICKUP': return 'PACKED';
    case 'OUT_FOR_DELIVERY': return type === 'STANDARD' ? 'IN_TRANSIT' : 'OUT_FOR_DELIVERY';
    case 'DELIVERED': return 'DELIVERED';
    case 'REJECTED': case 'CANCELLED': return 'CANCELLED';
    default: return null;
  }
};

const RANK = { PENDING: 0, CONFIRMED: 1, PROCESSING: 2, PACKED: 3, READY_FOR_DISPATCH: 3, IN_TRANSIT: 4, OUT_FOR_DELIVERY: 4, DELIVERED: 5 };
const PARENT_LABEL = ['Placed', 'Accepted', 'Processing', 'Packed', 'Out for Delivery', 'Delivered'];
const INACTIVE = new Set(['CANCELLED', 'FAILED', 'RETURNED']);

/** Pure: parent Order.orderStatus implied by a set of fulfilments (only meaningful when there are 2 or more). */
export const rollupParentStatus = (fulfillments = []) => {
  const active = fulfillments.filter((f) => !INACTIVE.has(f.fulfillmentStatus));
  if (active.length === 0) {
    // Nothing left to deliver. A courier return-to-origin is NOT a seller rejection: FAILED only ever comes from a
    // courier RTO in progress, RETURNED from a completed RTO. Only when every part was declined by sellers is it Rejected.
    if (fulfillments.some((f) => f.fulfillmentStatus === 'FAILED')) return 'Return to Origin';
    // (distinct from 'Returned', which already means a customer-initiated return of a delivered order)
    if (fulfillments.some((f) => f.fulfillmentStatus === 'RETURNED')) return 'Returned to Seller';
    return 'Rejected';
  }
  if (active.every((f) => f.fulfillmentStatus === 'DELIVERED')) return 'Delivered';
  const open = active.filter((f) => f.fulfillmentStatus !== 'DELIVERED');
  // the captain workflow drives the customer-facing tracking, so INSTANT fulfilments take precedence while open
  const instantOpen = open.filter((f) => f.fulfillmentType === 'INSTANT');
  const basis = instantOpen.length ? instantOpen : open;
  const least = Math.min(...basis.map((f) => RANK[f.fulfillmentStatus] ?? 0));
  return PARENT_LABEL[least];
};

export const syncFulfillmentFromNotification = async (notification) => {
  try {
    if (!notification?._id) return null;
    const f = await OrderFulfillment.findOne({ notification: notification._id });
    if (!f) return null;
    const next = fulfillmentStatusFromNotification(notification.status, f.fulfillmentType);
    const update = {};
    if (next && next !== f.fulfillmentStatus) {
      update.$set = { fulfillmentStatus: next };
      update.$push = { statusHistory: { status: next, at: notification.rejectedAt && next === 'CANCELLED' ? new Date(notification.rejectedAt) : new Date(), ...(next === 'CANCELLED' && notification.rejectionReason ? { note: String(notification.rejectionReason).slice(0, 500) } : {}) } };
    }
    if (notification.captainId && f.fulfillmentType === 'INSTANT' && String(f.assignedCaptain || '') !== String(notification.captainId)) {
      update.$set = { ...(update.$set || {}), assignedCaptain: notification.captainId };
    }
    if (update.$set || update.$push) await OrderFulfillment.updateOne({ _id: f._id }, update);
    return next;
  } catch (e) {
    console.warn('[Fulfillment] sync failed:', e.message);
    return null;
  }
};

/** For orders with 2+ fulfilments, bring the parent status in line; returns the status applied (or null for single/legacy orders). */
export const applyParentRollup = async (orderId, { force = false } = {}) => {
  try {
    const list = await OrderFulfillment.find({ order: orderId }).select('fulfillmentStatus fulfillmentType').lean();
    if (list.length < (force ? 1 : 2)) return null;
    const status = rollupParentStatus(list);
    await Order.updateOne({ _id: orderId }, { $set: { orderStatus: status } });
    return status;
  } catch (e) {
    console.warn('[Fulfillment] roll-up failed:', e.message);
    return null;
  }
};

/** Notification ids that belong to courier (STANDARD) fulfilments — captain actions must never touch them. */
export const standardNotificationIds = async (orderId) => {
  try {
    const rows = await OrderFulfillment.find({ order: orderId, fulfillmentType: 'STANDARD', notification: { $ne: null } }).select('notification').lean();
    return rows.map((r) => r.notification);
  } catch (e) { return []; }
};

export const isStandardNotification = async (notificationId) => {
  try { return Boolean(await OrderFulfillment.exists({ notification: notificationId, fulfillmentType: 'STANDARD' })); } catch (e) { return false; }
};

/** Filter for SellerNotification updates made by the captain flow: never touches courier (STANDARD) notifications. */
export const instantNotificationFilter = async (orderId) => ({ order: orderId, _id: { $nin: await standardNotificationIds(orderId) } });

/** After a captain action: refresh INSTANT fulfilments from their notifications, then roll up the parent. Returns the parent status applied or null. */
export const syncInstantFulfillmentsForOrder = async (orderId) => {
  try {
    const SellerNotification = (await import('../models/SellerNotification.model.js')).default;
    const rows = await OrderFulfillment.find({ order: orderId, fulfillmentType: 'INSTANT', notification: { $ne: null } }).select('notification').lean();
    for (const r of rows) {
      const n = await SellerNotification.findById(r.notification).select('status captainId').lean();
      if (n) await syncFulfillmentFromNotification({ _id: r.notification, status: n.status, captainId: n.captainId });
    }
    return await applyParentRollup(orderId);
  } catch (e) {
    console.warn('[Fulfillment] captain sync failed:', e.message);
    return null;
  }
};

/** True when the order has 2+ seller fulfilments (parent-level seller fields then belong to no single seller). */
export const isMultiFulfillmentOrder = async (orderId) => {
  try { return (await OrderFulfillment.countDocuments({ order: orderId })) >= 2; } catch (e) { return false; }
};

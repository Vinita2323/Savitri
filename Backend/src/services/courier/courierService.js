import Order from '../../models/Order.model.js';
import OrderFulfillment from '../../models/OrderFulfillment.model.js';
import SellerNotification from '../../models/SellerNotification.model.js';
import { assertProvider } from './courierProvider.interface.js';
import { mockCourierProvider } from './mockCourierProvider.js';
import { shiprocketProvider } from './shiprocketProvider.js';
import { validatePackage, chargeableWeightKg, packageFromItems } from './shippingCalculator.js';
import { pickupAddressProblem, applyParentRollup } from '../fulfillmentService.js';

/**
 * The only module order / seller / admin code uses to reach a courier. It picks the provider from
 * COURIER_PROVIDER (mock | shiprocket), enforces that simulated data never runs in production, and owns
 * the shipment lifecycle on the OrderFulfillment record.
 */
export class CourierError extends Error {
  constructor(message, code = 'COURIER_ERROR', status = 400, extra = {}) {
    super(message);
    this.name = 'CourierError';
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const isProduction = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const PROVIDERS = { mock: mockCourierProvider, shiprocket: shiprocketProvider };

/** What the platform can currently do. Safe to show to sellers/admins; contains no secrets. */
export const getCourierConfig = () => {
  const requested = String(process.env.COURIER_PROVIDER || (isProduction() ? 'none' : 'mock')).trim().toLowerCase();
  if (requested === 'mock') {
    if (isProduction()) return { provider: 'mock', simulated: true, available: false, reason: 'The simulated courier is disabled in production.' };
    return { provider: 'mock', simulated: true, available: true, reason: null };
  }
  if (requested === 'shiprocket') {
    // Real integration is not built yet; the stub never contacts anyone.
    return { provider: 'shiprocket', simulated: false, available: shiprocketProvider.isConfigured(), reason: 'Shiprocket is not connected yet.' };
  }
  return { provider: requested || 'none', simulated: false, available: false, reason: 'No courier provider is configured.' };
};

export const getProvider = () => {
  const cfg = getCourierConfig();
  if (!cfg.available) throw new CourierError(cfg.reason || 'Courier shipping is not available.', 'COURIER_UNAVAILABLE', 503, { config: cfg });
  return assertProvider(PROVIDERS[cfg.provider]);
};

const PIN = /^[1-9]\d{5}$/;
const MAX_STR = 200;
const s = (v) => String(v ?? '').trim();

/** Validate raw serviceability input. Returns { errors[], value }. */
export const validateServiceabilityInput = (input = {}) => {
  const errors = [];
  const pickupPincode = s(input.pickupPincode);
  const deliveryPincode = s(input.deliveryPincode);
  if (!PIN.test(pickupPincode)) errors.push('Pickup PIN code must be a valid 6-digit Indian PIN code');
  if (!PIN.test(deliveryPincode)) errors.push('Delivery PIN code must be a valid 6-digit Indian PIN code');
  const pkg = { weightKg: Number(input.weightKg), length: Number(input.length), breadth: Number(input.breadth), height: Number(input.height) };
  errors.push(...validatePackage(pkg).map((p) => `Package ${p}`));
  const pm = s(input.paymentMethod || 'PREPAID').toUpperCase();
  if (!['PREPAID', 'COD'].includes(pm)) errors.push('Payment method must be PREPAID or COD');
  const codAmount = Number(input.codAmount || 0);
  if (pm === 'COD' && !(codAmount > 0)) errors.push('COD amount is required for a COD shipment');
  if (!Number.isFinite(codAmount) || codAmount < 0) errors.push('COD amount is invalid');
  return { errors, value: { pickupPincode, deliveryPincode, ...pkg, paymentMethod: pm, codAmount: pm === 'COD' ? codAmount : 0 } };
};

/**
 * Serviceability + rates for a parcel. Returns the provider answer plus provenance (`simulated`, `provider`).
 * Never claims serviceability on its own: a PIN is only serviceable if the provider says so.
 */
export const checkServiceability = async (input) => {
  const { errors, value } = validateServiceabilityInput(input);
  if (errors.length) throw new CourierError(errors[0], 'INVALID_INPUT', 400, { errors });
  const provider = getProvider();
  const res = await provider.checkServiceability(value);
  const couriers = [...(res.couriers || [])].sort((a, b) => a.estimatedCharge - b.estimatedCharge);
  return {
    provider: provider.name,
    simulated: Boolean(provider.simulated),
    serviceable: Boolean(res.serviceable),
    couriers,
    cheapest: couriers[0] || null,
    chargeableWeightKg: res.chargeableWeightKg ?? chargeableWeightKg(value).chargeableKg,
    actualWeightKg: res.actualWeightKg ?? value.weightKg,
    volumetricWeightKg: res.volumetricWeightKg ?? null,
    rejectionReason: res.serviceable ? null : (res.rejectionReason || 'Not serviceable'),
    notice: provider.simulated ? 'SIMULATED - test rates and coverage, not real courier data' : null,
  };
};

// --------------------------------------------------------------------------------------------------
// Fulfilment-level operations
// --------------------------------------------------------------------------------------------------
const requireStandard = (f) => {
  if (!f || f.fulfillmentType !== 'STANDARD') throw new CourierError('Courier shipments apply only to STANDARD (courier) fulfilments.', 'NOT_A_COURIER_FULFILLMENT', 400);
};
const parcelOf = (f) => {
  if (f.parcel?.weightKg && f.parcel?.length && f.parcel?.breadth && f.parcel?.height) {
    return { complete: true, weightKg: f.parcel.weightKg, length: f.parcel.length, breadth: f.parcel.breadth, height: f.parcel.height, source: f.parcel.source || 'AUTO' };
  }
  const auto = packageFromItems(f.items || []);
  return auto.complete ? { ...auto, source: 'AUTO' } : auto;
};
const paymentOf = (order) => {
  const cod = String(order?.paymentMethod || '').toUpperCase() === 'COD';
  return { paymentMethod: cod ? 'COD' : 'PREPAID', codAmount: cod ? Number(order.grandTotal || 0) : 0 };
};

const serviceabilityInputFor = (f, order) => ({
  pickupPincode: f.pickupAddressSnapshot?.pincode,
  deliveryPincode: f.deliveryAddressSnapshot?.pincode,
  ...(() => { const p = parcelOf(f); return p.complete ? { weightKg: p.weightKg, length: p.length, breadth: p.breadth, height: p.height } : {}; })(),
  ...paymentOf(order),
});

/** Seller/admin confirms (or corrects) the package that will be handed to the courier. */
export const confirmParcel = async (f, pkg, actor) => {
  requireStandard(f);
  if (f.shipment?.status && !['NOT_CREATED', null].includes(f.shipment.status)) {
    throw new CourierError('The package can no longer be changed once a shipment exists.', 'SHIPMENT_EXISTS', 409);
  }
  const p = { weightKg: Number(pkg?.weightKg), length: Number(pkg?.length), breadth: Number(pkg?.breadth), height: Number(pkg?.height) };
  const problems = validatePackage(p);
  if (problems.length) throw new CourierError(`Package ${problems[0]}`, 'INVALID_PACKAGE', 400, { errors: problems });
  const w = chargeableWeightKg(p);
  const updated = await OrderFulfillment.findOneAndUpdate(
    { _id: f._id },
    { $set: { parcel: { ...p, source: actor?.role === 'seller' ? 'SELLER' : 'ADMIN', confirmedAt: new Date(), confirmedBy: String(actor?.id || '') } } },
    { new: true }
  ).lean();
  return { fulfillment: updated, weight: w };
};

/** Serviceability + rates for one fulfilment, stored on the record for the UI. */
export const quoteFulfillment = async (f, order) => {
  requireStandard(f);
  const parcel = parcelOf(f);
  if (!parcel.complete) throw new CourierError(`Weight and dimensions are missing for ${parcel.missing}. Confirm the package first.`, 'PACKAGE_INCOMPLETE', 400);
  if (!f.pickupAddressSnapshot?.pincode) throw new CourierError('No pickup address recorded for this seller.', 'PICKUP_ADDRESS_MISSING', 400);
  if (!f.deliveryAddressSnapshot?.pincode) throw new CourierError('No delivery PIN code on this order.', 'DELIVERY_ADDRESS_MISSING', 400);
  const result = await checkServiceability(serviceabilityInputFor(f, order));
  const best = result.cheapest;
  const quote = {
    simulated: result.simulated, serviceable: result.serviceable, chargeableWeightKg: result.chargeableWeightKg,
    courierId: best?.courierId || null, courierName: best?.courierName || null, charge: best?.estimatedCharge ?? null,
    etaDaysMin: best?.etaDaysMin ?? null, etaDaysMax: best?.etaDaysMax ?? null,
    rejectionReason: result.rejectionReason, quotedAt: new Date(), options: result.couriers,
  };
  await OrderFulfillment.updateOne({ _id: f._id }, { $set: { 'shipment.quote': quote } });
  return { ...result, quote };
};

const appendEvent = (status, description, simulated, location = '') => ({ status, description, location, at: new Date(), simulated: Boolean(simulated) });

/** Create the courier shipment. Safe to call twice: the second call returns the existing shipment. */
export const createShipmentForFulfillment = async (f, order, { courierId } = {}, actor = {}) => {
  requireStandard(f);
  if (f.shipment?.status && !['NOT_CREATED', null].includes(f.shipment.status)) {
    if (f.shipment.status === 'CREATING') throw new CourierError('A shipment is already being created for this fulfilment.', 'SHIPMENT_IN_PROGRESS', 409);
    return { alreadyCreated: true, fulfillment: f };
  }
  if (!['PACKED', 'READY_FOR_DISPATCH'].includes(f.fulfillmentStatus)) {
    throw new CourierError('Mark the order as packed before creating a shipment.', 'NOT_READY_FOR_DISPATCH', 409);
  }
  if (!order || String(order.paymentMethod).toUpperCase() === 'COD') {
    throw new CourierError('Cash on Delivery orders cannot be shipped by courier.', 'COD_NOT_SUPPORTED', 409);
  }
  if (order.paymentStatus !== 'Paid') throw new CourierError('Payment is not complete for this order.', 'PAYMENT_NOT_COMPLETE', 409);

  const provider = getProvider();
  const problem = pickupAddressProblem({ pickupAddress: f.pickupAddressSnapshot });
  if (problem) throw new CourierError(`Pickup address is not usable: ${problem.message || problem}`, 'PICKUP_ADDRESS_INVALID', 409);
  if (f.pickupAddressStatus === 'REJECTED') throw new CourierError('The pickup address was rejected by the platform.', 'PICKUP_ADDRESS_REJECTED', 409);
  // A real courier must never collect from an address nobody verified; the simulator may (it moves no parcel).
  if (!provider.simulated && f.pickupAddressStatus !== 'VERIFIED') throw new CourierError('The pickup address must be verified before a real shipment is created.', 'PICKUP_ADDRESS_UNVERIFIED', 409);

  const parcel = parcelOf(f);
  if (!parcel.complete) throw new CourierError(`Weight and dimensions are missing for ${parcel.missing}.`, 'PACKAGE_INCOMPLETE', 400);
  const svc = await checkServiceability(serviceabilityInputFor(f, order));
  if (!svc.serviceable) throw new CourierError(svc.rejectionReason || 'This delivery PIN code is not serviceable.', 'NOT_SERVICEABLE', 422, { serviceability: svc });
  let chosen = svc.cheapest;
  if (courierId) {
    chosen = svc.couriers.find((c) => c.courierId === courierId);
    if (!chosen) throw new CourierError('The selected courier is not available for this parcel.', 'COURIER_NOT_AVAILABLE', 400);
  }

  // Atomic claim: only one concurrent request can move NOT_CREATED -> CREATING
  const claimed = await OrderFulfillment.findOneAndUpdate(
    { _id: f._id, 'shipmentReference.awb': null, 'shipment.status': { $in: [null, 'NOT_CREATED'] } },
    { $set: { 'shipment.status': 'CREATING' } },
    { new: true }
  );
  if (!claimed) {
    const fresh = await OrderFulfillment.findById(f._id).lean();
    if (fresh?.shipmentReference?.awb) return { alreadyCreated: true, fulfillment: fresh };
    throw new CourierError('A shipment is already being created for this fulfilment.', 'SHIPMENT_IN_PROGRESS', 409);
  }

  let res;
  try {
    res = await provider.createShipment({
      referenceId: String(f._id), courierId: chosen.courierId,
      pickup: f.pickupAddressSnapshot, delivery: f.deliveryAddressSnapshot,
      items: f.items, package: parcel, ...paymentOf(order),
    });
    if (!res?.ok || !res.awb) throw new CourierError(res?.message || 'The courier did not create the shipment.', 'SHIPMENT_FAILED', 502);
  } catch (e) {
    await OrderFulfillment.updateOne({ _id: f._id, 'shipment.status': 'CREATING' }, { $set: { 'shipment.status': 'NOT_CREATED' } });
    throw e;
  }

  const sim = Boolean(provider.simulated);
  const updated = await OrderFulfillment.findOneAndUpdate(
    { _id: f._id },
    {
      $set: {
        'shipment.status': 'CREATED', 'shipment.createdAt': new Date(), 'shipment.courierId': chosen.courierId,
        'shipmentReference.provider': provider.name, 'shipmentReference.shipmentId': res.providerShipmentId,
        'shipmentReference.awb': res.awb, 'shipmentReference.trackingUrl': res.trackingUrl || null,
        'shipmentReference.referenceId': String(f._id), 'shipmentReference.providerOrderId': res.providerOrderId || null,
        'shipmentReference.courierName': res.courierName || chosen.courierName, 'shipmentReference.simulated': sim,
        'shipment.quote.courierId': chosen.courierId, 'shipment.quote.courierName': chosen.courierName,
        'shipment.quote.charge': chosen.estimatedCharge, 'shipment.quote.simulated': sim, 'shipment.quote.serviceable': true,
        'shipment.quote.etaDaysMin': chosen.etaDaysMin, 'shipment.quote.etaDaysMax': chosen.etaDaysMax, 'shipment.quote.quotedAt': new Date(),
        'shipment.quote.chargeableWeightKg': svc.chargeableWeightKg,
        parcel: f.parcel?.weightKg ? f.parcel : { weightKg: parcel.weightKg, length: parcel.length, breadth: parcel.breadth, height: parcel.height, source: 'AUTO', confirmedAt: new Date(), confirmedBy: String(actor?.id || '') },
      },
      $push: { 'shipment.events': appendEvent('CREATED', sim ? 'Shipment created (SIMULATED)' : 'Shipment created', sim) },
    },
    { new: true }
  ).lean();
  return { alreadyCreated: false, fulfillment: updated };
};

export const schedulePickupForFulfillment = async (f, pickupDate) => {
  requireStandard(f);
  if (!f.shipmentReference?.awb) throw new CourierError('Create the shipment before scheduling a pickup.', 'NO_SHIPMENT', 409);
  if (f.shipment?.pickup?.status === 'SCHEDULED') return { alreadyScheduled: true, fulfillment: f };
  if (f.shipment.status !== 'CREATED') throw new CourierError('A pickup can only be scheduled for a newly created shipment.', 'INVALID_STATE', 409);
  let when = null;
  if (pickupDate) {
    when = new Date(pickupDate);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60 * 1000) throw new CourierError('Pickup date must be a valid future date.', 'INVALID_PICKUP_DATE', 400);
  }
  const provider = getProvider();
  const res = await provider.schedulePickup({ providerShipmentId: f.shipmentReference.shipmentId, pickupDate: when });
  if (!res?.ok) throw new CourierError(res?.message || 'The courier could not schedule the pickup.', 'PICKUP_FAILED', 502);
  const sim = Boolean(provider.simulated);
  const updated = await OrderFulfillment.findOneAndUpdate(
    { _id: f._id, 'shipment.status': 'CREATED' },
    {
      $set: { 'shipment.status': 'PICKUP_SCHEDULED', 'shipment.pickup': { status: 'SCHEDULED', scheduledAt: res.scheduledAt, reference: res.pickupReference } },
      $push: { 'shipment.events': appendEvent('PICKUP_SCHEDULED', sim ? 'Pickup scheduled (SIMULATED)' : 'Pickup scheduled', sim) },
    },
    { new: true }
  ).lean();
  if (!updated) throw new CourierError('The shipment changed while scheduling the pickup.', 'INVALID_STATE', 409);
  return { alreadyScheduled: false, fulfillment: updated };
};

export const generateLabelForFulfillment = async (f) => {
  requireStandard(f);
  if (!f.shipmentReference?.awb) throw new CourierError('Create the shipment before downloading a label.', 'NO_SHIPMENT', 409);
  const provider = getProvider();
  const res = await provider.generateLabel({ awb: f.shipmentReference.awb, providerShipmentId: f.shipmentReference.shipmentId });
  if (!res?.ok) throw new CourierError('The courier could not generate a label.', 'LABEL_FAILED', 502);
  await OrderFulfillment.updateOne({ _id: f._id }, { $set: { 'shipment.labelGeneratedAt': new Date(), ...(res.labelUrl ? { 'shipmentReference.labelUrl': res.labelUrl } : {}) } });
  return { simulated: Boolean(provider.simulated), labelText: res.labelText || null, labelUrl: res.labelUrl || null };
};

// --------------------------------------------------------------------------------------------------
// Tracking events
// --------------------------------------------------------------------------------------------------
export const NEXT_SHIPMENT_STATUS = {
  CREATED: ['PICKUP_SCHEDULED', 'PICKED_UP'],
  PICKUP_SCHEDULED: ['PICKED_UP'],
  PICKED_UP: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'RTO_INITIATED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RTO_INITIATED'],
  RTO_INITIATED: ['RTO_IN_TRANSIT'],
  RTO_IN_TRANSIT: ['RTO_DELIVERED'],
};
// courier status -> our business status (null = no change)
const FULFILMENT_FOR = {
  PICKED_UP: 'IN_TRANSIT', IN_TRANSIT: 'IN_TRANSIT', OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY', DELIVERED: 'DELIVERED',
  RTO_INITIATED: 'FAILED', RTO_IN_TRANSIT: 'FAILED', RTO_DELIVERED: 'RETURNED',
};
const NOTIFICATION_FOR = { OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY', DELIVERED: 'DELIVERED' };
const DESCRIPTION = {
  PICKED_UP: 'Picked up by courier', IN_TRANSIT: 'In transit', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered',
  FAILED_DELIVERY: 'Delivery attempt failed', RTO_INITIATED: 'Return to origin initiated', RTO_IN_TRANSIT: 'Return to origin in transit', RTO_DELIVERED: 'Returned to origin',
};

/**
 * Move a shipment to a new courier status. Rejects impossible transitions, is a no-op for a repeated status,
 * and uses a compare-and-set on the current status so two concurrent events cannot both apply.
 * Does NOT touch payment, settlement or refunds, and sends no customer notification (a later phase decides those).
 */
export const applyShipmentEvent = async (f, status, { simulated = false, description, location = '', reason = '' } = {}) => {
  requireStandard(f);
  const current = f.shipment?.status || 'NOT_CREATED';
  if (current === status) return { duplicate: true, fulfillment: f };
  if (!(NEXT_SHIPMENT_STATUS[current] || []).includes(status)) {
    throw new CourierError(`Cannot move a shipment from ${current} to ${status}.`, 'INVALID_TRANSITION', 409, { allowed: NEXT_SHIPMENT_STATUS[current] || [] });
  }
  const set = { 'shipment.status': status };
  const bizStatus = FULFILMENT_FOR[status];
  const push = { 'shipment.events': appendEvent(status, `${description || DESCRIPTION[status] || status}${simulated ? ' (SIMULATED)' : ''}`, simulated, location) };
  if (bizStatus && bizStatus !== f.fulfillmentStatus) {
    set.fulfillmentStatus = bizStatus;
    push.statusHistory = { status: bizStatus, at: new Date(), note: `Courier: ${status}${simulated ? ' (simulated)' : ''}` };
  }
  if (status === 'RTO_INITIATED') { set['shipment.rto.status'] = 'INITIATED'; set['shipment.rto.initiatedAt'] = new Date(); set['shipment.rto.reason'] = reason || 'Delivery failed'; set['shipment.rto.returnShipmentRef'] = `${simulated ? 'MOCK-' : ''}RTO-${String(f.shipmentReference?.awb || f._id)}`; }
  if (status === 'RTO_IN_TRANSIT') set['shipment.rto.status'] = 'IN_TRANSIT';
  if (status === 'RTO_DELIVERED') { set['shipment.rto.status'] = 'DELIVERED'; set['shipment.rto.deliveredAt'] = new Date(); }

  const updated = await OrderFulfillment.findOneAndUpdate({ _id: f._id, 'shipment.status': current }, { $set: set, $push: push }, { new: true }).lean();
  if (!updated) throw new CourierError('The shipment was updated by someone else; reload and try again.', 'CONFLICT', 409);

  if (NOTIFICATION_FOR[status] && updated.notification) {
    await SellerNotification.updateOne({ _id: updated.notification, status: { $nin: ['REJECTED', 'Rejected'] } }, { $set: { status: NOTIFICATION_FOR[status] } }).catch(() => {});
  }
  await applyParentRollup(updated.order, { force: true });
  return { duplicate: false, fulfillment: updated };
};

/** Development-only: advance a MOCK shipment. Refused for real providers and in production. */
export const simulateShipmentEvent = async (f, status, opts = {}) => {
  const cfg = getCourierConfig();
  if (!cfg.available || !cfg.simulated || isProduction()) {
    throw new CourierError('Shipment simulation is only available with the mock courier in development.', 'SIMULATION_DISABLED', 403);
  }
  if (!f.shipmentReference?.simulated) throw new CourierError('Only simulated shipments can be advanced manually.', 'NOT_SIMULATED', 409);
  return applyShipmentEvent(f, status, { ...opts, simulated: true });
};

export const loadOrderFor = (f) => Order.findById(f.order).select('orderId paymentMethod paymentStatus grandTotal user').lean();

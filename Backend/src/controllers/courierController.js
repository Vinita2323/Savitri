import mongoose from 'mongoose';
import OrderFulfillment from '../models/OrderFulfillment.model.js';
import { orderInScope } from '../middleware/scopeMiddleware.js';
import { CourierProviderError } from '../services/courier/courierProvider.interface.js';
import {
  CourierError, getCourierConfig, checkServiceability, confirmParcel, quoteFulfillment, createShipmentForFulfillment,
  schedulePickupForFulfillment, generateLabelForFulfillment, simulateShipmentEvent, loadOrderFor, NEXT_SHIPMENT_STATUS,
} from '../services/courier/courierService.js';

const fail = (res, e) => {
  if (e instanceof CourierError) return res.status(e.status).json({ success: false, code: e.code, message: e.message, ...(e.extra || {}) });
  if (e instanceof CourierProviderError) return res.status(503).json({ success: false, code: e.code, message: e.message });
  console.error('[Courier] unexpected error:', e);
  return res.status(500).json({ success: false, message: 'Courier operation failed' });
};

// Seller: only their own fulfilment. Admin / super admin: only fulfilments of orders inside their brand scope.
const loadAuthorized = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) { res.status(404).json({ success: false, message: 'Fulfilment not found' }); return null; }
  const f = await OrderFulfillment.findById(id).lean();
  const allowed = f && (req.user.role === 'seller'
    ? String(f.sellerId) === String(req.user.id)
    : await orderInScope(req.scope, f.order));
  if (!allowed) { res.status(404).json({ success: false, message: 'Fulfilment not found' }); return null; }
  return f;
};

// What the UI shows for the courier part of a fulfilment (never includes secrets; flags simulated data)
const present = (f) => ({ ...f, courierSimulated: Boolean(f?.shipmentReference?.simulated || f?.shipment?.quote?.simulated) });

// GET /api/courier/status
export const getStatus = (req, res) => {
  const cfg = getCourierConfig();
  res.json({ success: true, courier: { provider: cfg.provider, simulated: cfg.simulated, available: cfg.available, reason: cfg.reason } });
};

// POST /api/courier/serviceability  { pickupPincode, deliveryPincode, weightKg, length, breadth, height, paymentMethod?, codAmount? }
export const postServiceability = async (req, res) => {
  try { res.json({ success: true, ...(await checkServiceability(req.body || {})) }); } catch (e) { fail(res, e); }
};

// GET /api/courier/fulfillment/:id
export const getFulfillmentCourier = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    res.json({ success: true, courier: getCourierConfig(), fulfillment: present(f), allowedNext: NEXT_SHIPMENT_STATUS[f.shipment?.status || 'NOT_CREATED'] || [] });
  } catch (e) { fail(res, e); }
};

// POST /api/courier/fulfillment/:id/package  { weightKg, length, breadth, height }
export const postPackage = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    const out = await confirmParcel(f, req.body || {}, req.user);
    res.json({ success: true, fulfillment: present(out.fulfillment), weight: out.weight });
  } catch (e) { fail(res, e); }
};

// POST /api/courier/fulfillment/:id/quote
export const postQuote = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    const order = await loadOrderFor(f);
    const out = await quoteFulfillment(f, order);
    res.json({ success: true, ...out, fulfillment: present(await OrderFulfillment.findById(f._id).lean()) });
  } catch (e) { fail(res, e); }
};

// POST /api/courier/fulfillment/:id/shipment  { courierId? }
export const postShipment = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    const order = await loadOrderFor(f);
    const out = await createShipmentForFulfillment(f, order, { courierId: req.body?.courierId }, req.user);
    res.status(out.alreadyCreated ? 200 : 201).json({ success: true, alreadyCreated: out.alreadyCreated, fulfillment: present(out.fulfillment) });
  } catch (e) { fail(res, e); }
};

// POST /api/courier/fulfillment/:id/pickup  { pickupDate? }
export const postPickup = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    const out = await schedulePickupForFulfillment(f, req.body?.pickupDate);
    res.json({ success: true, alreadyScheduled: out.alreadyScheduled, fulfillment: present(out.fulfillment) });
  } catch (e) { fail(res, e); }
};

// GET /api/courier/fulfillment/:id/label  -> plain-text placeholder for simulated shipments
export const getLabel = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    const out = await generateLabelForFulfillment(f);
    if (out.labelUrl) return res.json({ success: true, simulated: out.simulated, labelUrl: out.labelUrl });
    res.json({ success: true, simulated: out.simulated, labelText: out.labelText });
  } catch (e) { fail(res, e); }
};

// POST /api/courier/fulfillment/:id/simulate  { status, reason? }   (admin, mock courier, development only)
export const postSimulate = async (req, res) => {
  try {
    const f = await loadAuthorized(req, res); if (!f) return;
    const out = await simulateShipmentEvent(f, String(req.body?.status || '').toUpperCase(), { reason: req.body?.reason });
    res.json({ success: true, duplicate: out.duplicate, fulfillment: present(out.fulfillment) });
  } catch (e) { fail(res, e); }
};

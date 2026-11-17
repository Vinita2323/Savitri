import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import OrderFulfillment from '../models/OrderFulfillment.model.js';
import { evaluateCartFulfillment } from '../services/fulfillmentService.js';
import { orderScopeFilter, orderInScope } from '../middleware/scopeMiddleware.js';

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

// What a customer may see: no seller pickup address, no internal ids.
const customerView = (f) => ({
  _id: f._id,
  sellerName: f.sellerName,
  fulfillmentType: f.fulfillmentType,
  deliveryMethod: f.deliveryMethod,
  fulfillmentStatus: f.fulfillmentStatus,
  estimatedDeliveryDate: f.estimatedDeliveryDate,
  requiresCourierServiceabilityCheck: f.requiresCourierServiceabilityCheck,
  // simulated (mock courier) shipments are never shown to customers as real tracking
  shipmentReference: f.shipmentReference?.simulated ? { provider: null, awb: null, trackingUrl: null } : { provider: f.shipmentReference?.provider || null, awb: f.shipmentReference?.awb || null, trackingUrl: f.shipmentReference?.trackingUrl || null },
  items: (f.items || []).map((i) => ({ name: i.name, quantity: i.quantity, image: i.image })),
});

// @desc    Delivery options for the logged-in customer's cart (server-side cart, or ?productIds=a,b)
// @route   GET /api/fulfillment/options?lat=&lng=
// @access  Private/User
export const getFulfillmentOptions = async (req, res) => {
  try {
    let ids = [];
    if (req.query.productIds) {
      ids = String(req.query.productIds).split(',').map((s) => s.trim()).filter(isId);
    } else {
      const user = await User.findById(req.user.id).select('cart').lean();
      ids = (user?.cart || []).map((c) => String(c.product?._id || c.product || '')).filter(isId);
    }
    ids = [...new Set(ids)];
    if (ids.length === 0) return res.json({ success: true, ok: true, sellers: [], blocking: [], isMixed: false, methods: [], courierServiceabilityConfirmed: false, note: '' });
    if (ids.length > 100) return res.status(400).json({ success: false, message: 'Too many products' });

    const products = await Product.find({ _id: { $in: ids }, status: 'Published' }).lean();
    const result = await evaluateCartFulfillment({
      products,
      customer: { lat: req.query.lat ?? req.query.latitude, lng: req.query.lng ?? req.query.longitude },
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Could not evaluate delivery options' });
  }
};

// @desc    Fulfilments of one order (customer owner, the seller on it, or a scoped admin)
// @route   GET /api/fulfillment/order/:orderId
export const getOrderFulfillments = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne(isId(orderId) ? { $or: [{ _id: orderId }, { orderId }] } : { orderId }).select('user orderId').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const role = req.user.role;
    const rows = await OrderFulfillment.find({ order: order._id }).sort({ createdAt: 1 }).lean();
    if (role === 'user') {
      if (String(order.user) !== String(req.user.id)) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, orderId: order.orderId, fulfillments: rows.map(customerView) });
    }
    if (role === 'seller') {
      const mine = rows.filter((f) => String(f.sellerId) === String(req.user.id));
      if (mine.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
      return res.json({ success: true, orderId: order.orderId, fulfillments: mine });
    }
    if (!(await orderInScope(req.scope, order._id))) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, orderId: order.orderId, fulfillments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Could not load fulfilments' });
  }
};

// @desc    The logged-in seller's own fulfilments
// @route   GET /api/fulfillment/seller/orders
export const getSellerFulfillments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const query = { sellerId: String(req.user.id) };
    if (['INSTANT', 'STANDARD'].includes(String(req.query.type || '').toUpperCase())) query.fulfillmentType = String(req.query.type).toUpperCase();
    const [rows, total] = await Promise.all([
      OrderFulfillment.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      OrderFulfillment.countDocuments(query),
    ]);
    res.json({ success: true, total, page, fulfillments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Could not load fulfilments' });
  }
};

// @desc    Admin / Super Admin: fulfilments for orders inside the caller's brand scope
// @route   GET /api/fulfillment/admin/orders
export const getAdminFulfillments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const orderIds = (await Order.find(await orderScopeFilter(req.scope || { isAll: true })).select('_id').sort({ createdAt: -1 }).limit(1000).lean()).map((o) => o._id);
    const query = { order: { $in: orderIds } };
    if (['INSTANT', 'STANDARD'].includes(String(req.query.type || '').toUpperCase())) query.fulfillmentType = String(req.query.type).toUpperCase();
    if (req.query.orderId) query.orderId = String(req.query.orderId);
    const [rows, total] = await Promise.all([
      OrderFulfillment.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      OrderFulfillment.countDocuments(query),
    ]);
    res.json({ success: true, total, page, fulfillments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Could not load fulfilments' });
  }
};

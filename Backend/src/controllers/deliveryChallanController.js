import mongoose from 'mongoose';
import DeliveryChallan from '../models/DeliveryChallan.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Counter, { nextSequence } from '../models/Counter.model.js';
import { orderInScope, orderScopeFilter } from '../middleware/scopeMiddleware.js';

// ── Brand scoping ─────────────────────────────────────────────────────────────
// A challan belongs to one brand. Every read/write is confined to the brand selected in the panel
// (req.scope); a challan of another brand is reported as 404 so its existence is not disclosed.
const scopeFilter = (req) => (!req.scope || req.scope.isAll ? {} : { brandId: req.scope.brandId });
const withScope = (req, q) => (Object.keys(scopeFilter(req)).length ? { $and: [scopeFilter(req), q] } : q);
const findScoped = (req, ref) => {
  const key = String(ref || '').trim();
  const or = [{ challanNumber: key.toUpperCase() }];
  if (mongoose.Types.ObjectId.isValid(key)) or.push({ _id: key });
  return DeliveryChallan.findOne(withScope(req, { $or: or }));
};
const escapeRe = (v) => String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const actorName = (req) => req.user?.email || req.user?.name || (req.user?.role === 'super_admin' ? 'Super Admin' : 'Admin');
const notFound = (res) => res.status(404).json({ success: false, message: 'Delivery Challan not found' });
const dispatchKey = (item) => String(item.product || item.variantSku || item.sku || item.name).trim();
const EDITABLE_STATUSES = ['Draft', 'Dispatched'];

/**
 * Builds challan lines from what the order REALLY contains. The ordered quantity and price always
 * come from the order - never from the request - so a client cannot dispatch more than was bought.
 */
const buildItemsFromOrder = (orderDoc, dispatchedMap, submitted) => {
  const orderItems = new Map();
  (orderDoc.items || []).forEach((oi) => orderItems.set(dispatchKey(oi), oi));
  const seen = new Set();
  const out = [];
  let total = 0;
  for (const item of submitted) {
    const key = dispatchKey(item || {});
    const oi = orderItems.get(key);
    if (!oi) return { error: `"${item?.name || key}" is not part of this order.` };
    if (seen.has(key)) return { error: `"${item.name || key}" appears more than once.` };
    seen.add(key);
    const qty = Number(item.dispatchedQuantity);
    if (!Number.isFinite(qty) || qty < 0) return { error: `Dispatched quantity for "${oi.name}" must be zero or more.` };
    const orderedQty = Number(oi.quantity) || 0;
    const prev = dispatchedMap[key] || 0;
    const remaining = Math.max(0, orderedQty - prev);
    if (qty > remaining) {
      return { error: `Over-dispatch rejected for "${oi.name}": attempted ${qty}, but remaining dispatchable quantity is ${remaining}` };
    }
    if (qty === 0) continue; // lines with nothing to dispatch are not part of the challan
    total += qty;
    out.push({
      product: oi.product || null,
      name: oi.name,
      sku: oi.sku || item.sku || '',
      variantSku: oi.variantSku || '',
      variantTitle: oi.variantTitle || '',
      hsn: item.hsn || '',
      unit: item.unit || oi.unit || 'Units',
      unitPrice: Number(oi.price) || 0,
      orderedQuantity: orderedQty,
      previouslyDispatchedQuantity: prev,
      dispatchedQuantity: qty,
      remainingQuantity: Math.max(0, remaining - qty),
      notes: item.notes || '',
    });
  }
  if (out.length === 0) return { error: 'At least one product item with a dispatch quantity greater than zero is required.' };
  return { items: out, total };
};

/** After a challan becomes "active", make sure concurrent requests did not over-dispatch the order. */
const orderIsOverDispatched = async (orderDoc) => {
  const map = await calculateOrderDispatches(orderDoc._id);
  return (orderDoc.items || []).some((oi) => (map[dispatchKey(oi)] || 0) > (Number(oi.quantity) || 0));
};

/**
 * Helper: Computes previously dispatched quantities for an order across all active (non-cancelled) challans.
 * Optionally excludes a specific challan ID (used when updating a draft).
 */
export const calculateOrderDispatches = async (orderId, excludeChallanId = null) => {
  const query = {
    order: orderId,
    status: { $in: ['Dispatched', 'Partially Delivered', 'Delivered'] },
  };

  if (excludeChallanId && mongoose.Types.ObjectId.isValid(excludeChallanId)) {
    query._id = { $ne: excludeChallanId };
  }

  const existingChallans = await DeliveryChallan.find(query).lean();

  // Aggregate dispatched quantity per product SKU/name/ID
  const dispatchedMap = {};

  existingChallans.forEach((ch) => {
    (ch.items || []).forEach((item) => {
      const key = String(item.product || item.variantSku || item.sku || item.name).trim();
      dispatchedMap[key] = (dispatchedMap[key] || 0) + (Number(item.dispatchedQuantity) || 0);
    });
  });

  return dispatchedMap;
};

/**
 * Generate sequential unique Challan Number: DC-YYYY-XXXX
 */
export const generateNextChallanNumber = async () => {
  const year = new Date().getFullYear();
  // Atomic counter: concurrent requests can never get the same number (no reliance on a unique index).
  for (let i = 0; i < 20; i++) {
    const seq = await nextSequence(`challan-${year}`);
    const number = `DC-${year}-${String(seq).padStart(4, '0')}`;
    if (!(await DeliveryChallan.exists({ challanNumber: number }))) return number;
  }
  throw new Error('Could not allocate a challan number.');
};

const peekNextChallanNumber = async () => {
  const year = new Date().getFullYear();
  const c = await Counter.findById(`challan-${year}`).lean();
  return `DC-${year}-${String((c?.seq || 0) + 1).padStart(4, '0')}`;
};

/**
 * GET /api/delivery-challans/next-number
 */
export const getNextChallanNumber = async (req, res, next) => {
  try {
    const challanNumber = await peekNextChallanNumber();
    res.status(200).json({
      success: true,
      challanNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-challans/clients
 * Fetch clients who have placed orders or registered clients
 */
export const getClients = async (req, res, next) => {
  try {
    const { search = '', limit = 100 } = req.query;

    const filter = { role: { $ne: 'admin' } };
    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }

    // Find users who have placed at least one order first to prioritize active clients
    const clientOrderCounts = await Order.aggregate([
      { $match: { orderStatus: { $nin: ['Cancelled', 'Rejected'] } } },
      { $group: { _id: '$user', orderCount: { $sum: 1 }, lastOrderDate: { $max: '$createdAt' } } },
      { $sort: { lastOrderDate: -1 } },
    ]);

    const orderUserIds = clientOrderCounts.map((c) => c._id).filter(Boolean);

    const users = await User.find(filter)
      .select('name phone email addresses createdAt status')
      .limit(Number(limit))
      .lean();

    const orderCountMap = {};
    clientOrderCounts.forEach((c) => {
      orderCountMap[String(c._id)] = c.orderCount;
    });

    const enrichedClients = users.map((u) => {
      const primaryAddress = (u.addresses || []).find((a) => a.isDefault) || u.addresses?.[0] || {};
      return {
        _id: u._id,
        name: u.name || 'Valued Customer',
        phone: u.phone || '',
        email: u.email || '',
        orderCount: orderCountMap[String(u._id)] || 0,
        address: primaryAddress,
        addresses: u.addresses || [],
      };
    });

    // Sort clients: those with orders first
    enrichedClients.sort((a, b) => b.orderCount - a.orderCount);

    res.status(200).json({
      success: true,
      clients: enrichedClients,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-challans/clients/:clientId/eligible-orders
 * Fetch orders for a specific client that are eligible for dispatch.
 * Excludes cancelled/rejected orders and orders that are fully dispatched.
 */
export const getEligibleOrdersByClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }

    const orders = await Order.find({
      user: clientId,
      orderStatus: { $nin: ['Cancelled', 'Rejected', 'Returned'] },
      ...(await orderScopeFilter(req.scope)),
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: 'No eligible orders found for this client',
      });
    }

    // For each order, compute dispatch balances
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const dispatchedMap = await calculateOrderDispatches(order._id);

        let totalOrdered = 0;
        let totalDispatched = 0;
        let totalRemaining = 0;

        const itemsWithBalances = (order.items || []).map((item) => {
          const key = String(item.product || item.variantSku || item.sku || item.name).trim();
          const prevDispatched = dispatchedMap[key] || 0;
          const orderedQty = Number(item.quantity) || 0;
          const remainingQty = Math.max(0, orderedQty - prevDispatched);

          totalOrdered += orderedQty;
          totalDispatched += prevDispatched;
          totalRemaining += remainingQty;

          return {
            ...item,
            previouslyDispatched: prevDispatched,
            remainingQuantity: remainingQty,
          };
        });

        const isFullyDispatched = totalRemaining === 0 && totalOrdered > 0;

        return {
          _id: order._id,
          orderId: order.orderId,
          orderDate: order.createdAt,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          grandTotal: order.grandTotal || order.itemsTotal || 0,
          shippingAddress: order.shippingAddress,
          itemsCount: order.items?.length || 0,
          totalOrderedQuantity: totalOrdered,
          totalDispatchedQuantity: totalDispatched,
          totalRemainingQuantity: totalRemaining,
          isFullyDispatched,
          items: itemsWithBalances,
        };
      })
    );

    // Eligible orders are those not fully dispatched
    const eligibleOrders = enrichedOrders.filter((o) => !o.isFullyDispatched);

    res.status(200).json({
      success: true,
      orders: eligibleOrders,
      allOrdersCount: enrichedOrders.length,
      eligibleCount: eligibleOrders.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-challans/orders/:orderId/dispatch-summary
 * Get detailed product items and remaining dispatchable quantities for an order.
 */
export const getOrderDispatchSummary = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const isMongoId = mongoose.Types.ObjectId.isValid(orderId);
    const order = await Order.findOne(
      isMongoId ? { $or: [{ _id: orderId }, { orderId }] } : { orderId }
    )
      .populate('user', 'name phone email addresses')
      .lean();

    if (!order || !(await orderInScope(req.scope, order))) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const dispatchedMap = await calculateOrderDispatches(order._id);

    // Fetch product details for HSN and SKU fallback
    const productIds = (order.items || [])
      .map((i) => i.product)
      .filter((p) => p && mongoose.Types.ObjectId.isValid(p));

    const products = await Product.find({ _id: { $in: productIds } })
      .select('hsnCode sku unit unitType')
      .lean();

    const productMap = {};
    products.forEach((p) => {
      productMap[String(p._id)] = p;
    });

    const itemsSummary = (order.items || []).map((item) => {
      const key = String(item.product || item.variantSku || item.sku || item.name).trim();
      const prevDispatched = dispatchedMap[key] || 0;
      const orderedQty = Number(item.quantity) || 0;
      const remainingQty = Math.max(0, orderedQty - prevDispatched);

      const pDoc = productMap[String(item.product)] || {};
      const hsn = pDoc.hsnCode || '';
      const unit = pDoc.unit || item.unit || 'Units';
      const sku = item.sku || item.variantSku || pDoc.sku || '';

      return {
        product: item.product,
        name: item.name,
        sku,
        variantSku: item.variantSku || '',
        variantTitle: item.variantTitle || '',
        hsn,
        unit,
        unitPrice: item.price || 0,
        orderedQuantity: orderedQty,
        previouslyDispatchedQuantity: prevDispatched,
        remainingQuantity: remainingQty,
        maxDispatchable: remainingQty,
      };
    });

    // Also get existing challans for this order
    const existingChallans = await DeliveryChallan.find(withScope(req, { order: order._id }))
      .select('challanNumber challanDate status totalDispatchedQuantity createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderDate: order.createdAt,
        orderStatus: order.orderStatus,
        grandTotal: order.grandTotal || 0,
        client: order.user,
        shippingAddress: order.shippingAddress,
      },
      items: itemsSummary,
      existingChallans,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-challans
 * Paginated listing with search and filters
 */
export const getDeliveryChallans = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      status = '',
      clientId = '',
      orderNumber = '',
      startDate = '',
      endDate = '',
    } = req.query;

    const filter = { ...scopeFilter(req) };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.client = clientId;
    }

    if (orderNumber && orderNumber.trim()) {
      filter.orderNumber = { $regex: escapeRe(orderNumber), $options: 'i' };
    }

    if (startDate || endDate) {
      filter.challanDate = {};
      if (startDate) {
        filter.challanDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.challanDate.$lte = eDate;
      }
    }

    if (search && search.trim()) {
      const term = escapeRe(search);
      filter.$or = [
        { challanNumber: { $regex: term, $options: 'i' } },
        { orderNumber: { $regex: term, $options: 'i' } },
        { 'clientSnapshot.name': { $regex: term, $options: 'i' } },
        { 'clientSnapshot.phone': { $regex: term, $options: 'i' } },
        { 'clientSnapshot.companyName': { $regex: term, $options: 'i' } },
        { 'transportDetails.vehicleNumber': { $regex: term, $options: 'i' } },
        { 'transportDetails.lrNumber': { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [challans, totalCount, statusStats] = await Promise.all([
      DeliveryChallan.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DeliveryChallan.countDocuments(filter),
      DeliveryChallan.aggregate([
        { $match: scopeFilter(req) },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQty: { $sum: '$totalDispatchedQuantity' },
          },
        },
      ]),
    ]);

    const stats = {
      total: 0,
      draft: 0,
      dispatched: 0,
      partiallyDelivered: 0,
      delivered: 0,
      cancelled: 0,
    };

    statusStats.forEach((s) => {
      stats.total += s.count;
      if (s._id === 'Draft') stats.draft = s.count;
      if (s._id === 'Dispatched') stats.dispatched = s.count;
      if (s._id === 'Partially Delivered') stats.partiallyDelivered = s.count;
      if (s._id === 'Delivered') stats.delivered = s.count;
      if (s._id === 'Cancelled') stats.cancelled = s.count;
    });

    res.status(200).json({
      success: true,
      challans,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        totalItems: totalCount,
      },
      stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/delivery-challans/:id
 * Single challan details
 */
export const getDeliveryChallanById = async (req, res, next) => {
  try {
    const challan = await findScoped(req, req.params.id)
      .populate('client', 'name phone email')
      .populate('order', 'orderId orderStatus grandTotal createdAt')
      .lean();

    if (!challan) {
      return res.status(404).json({ success: false, message: 'Delivery Challan not found' });
    }

    // Compute live order dispatch balance
    const dispatchedMap = await calculateOrderDispatches(challan.order?._id || challan.order, challan._id);

    res.status(200).json({
      success: true,
      challan,
      dispatchedMap,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/delivery-challans
 * Create new Delivery Challan (Draft or Dispatched)
 */
export const createDeliveryChallan = async (req, res, next) => {
  try {
    const {
      challanNumber: customChallanNumber,
      challanDate = new Date(),
      dispatchDate = new Date(),
      expectedDeliveryDate = null,
      client: clientId,
      clientSnapshot,
      order: orderId,
      orderNumber,
      orderDate,
      orderGrandTotal = 0,
      items = [],
      transportDetails = {},
      purpose = 'Supply on Sale',
      shippingNotes = '',
      termsAndConditions = '',
      status = 'Draft',
    } = req.body;

    if (!req.scope || req.scope.isAll || !req.scope.brandId) {
      return res.status(400).json({
        success: false,
        message: 'Select a specific brand/region before creating a Delivery Challan (not "All Regions").',
      });
    }
    if (!clientId || !orderId || !mongoose.Types.ObjectId.isValid(String(orderId))) {
      return res.status(400).json({
        success: false,
        message: 'Client and Order references are required to create a delivery challan',
      });
    }
    if (!EDITABLE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'A new challan can only be created as Draft or Dispatched.' });
    }

    // The order must exist AND belong to the selected brand (otherwise it is reported as not found).
    const orderDoc = await Order.findById(orderId).lean();
    if (!orderDoc || !(await orderInScope(req.scope, orderDoc))) {
      return res.status(404).json({ success: false, message: 'Referenced order not found' });
    }
    if (String(orderDoc.user) !== String(clientId)) {
      return res.status(400).json({ success: false, message: 'The client does not match the customer of this order.' });
    }

    if (['Cancelled', 'Rejected'].includes(orderDoc.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot issue a delivery challan for an order with status "${orderDoc.orderStatus}"`,
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product item with dispatch quantity is required',
      });
    }

    const dispatchedMap = await calculateOrderDispatches(orderDoc._id);
    const built = buildItemsFromOrder(orderDoc, dispatchedMap, items);
    if (built.error) return res.status(400).json({ success: false, message: built.error });
    const validatedItems = built.items;
    const totalDispatchedQty = built.total;

    if (status === 'Dispatched' && (totalDispatchedQty <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Total dispatch quantity must be greater than 0',
      });
    }

    // The number is always allocated by the server (a client-supplied number is ignored).
    void customChallanNumber;
    const challanNumber = await generateNextChallanNumber();

    const creatorInfo = {
      userId: String(req.user?.id || req.user?._id || ''),
      name: actorName(req),
      role: req.user?.role || '',
    };

    const initialAudit = {
      status,
      action: status === 'Dispatched' ? 'Challan Created & Dispatched' : 'Draft Challan Created',
      changedBy: creatorInfo.name,
      timestamp: new Date(),
      notes: `Created with ${validatedItems.length} items (Total qty: ${totalDispatchedQty})`,
    };

    const newChallan = new DeliveryChallan({
      brandId: req.scope.brandId,
      challanNumber,
      challanDate: new Date(challanDate),
      dispatchDate: new Date(dispatchDate),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      client: orderDoc.user,
      clientSnapshot: clientSnapshot || {},
      order: orderDoc._id,
      orderNumber: orderDoc.orderId,
      orderDate: orderDoc.createdAt,
      orderGrandTotal: orderDoc.grandTotal || 0,
      items: validatedItems,
      totalDispatchedQuantity: totalDispatchedQty,
      transportDetails: transportDetails || {},
      purpose,
      shippingNotes: shippingNotes || '',
      termsAndConditions: termsAndConditions || undefined,
      status,
      createdBy: creatorInfo,
      auditHistory: [initialAudit],
    });

    void orderNumber; void orderDate; void orderGrandTotal;
    await newChallan.save();

    // Concurrent requests can both pass the balance check; undo this one if the order is now over-dispatched.
    if (status === 'Dispatched' && (await orderIsOverDispatched(orderDoc))) {
      await DeliveryChallan.deleteOne({ _id: newChallan._id });
      return res.status(409).json({
        success: false,
        message: 'Another dispatch for this order was recorded at the same time and the quantity is no longer available. Please reload and retry.',
      });
    }

    res.status(201).json({
      success: true,
      message: status === 'Dispatched' ? 'Delivery challan dispatched successfully' : 'Draft challan saved',
      challan: newChallan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/delivery-challans/:id
 * Update draft challan
 */
export const updateDeliveryChallan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const challan = await findScoped(req, id);
    if (!challan) {
      return notFound(res);
    }

    if (challan.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit challan in "${challan.status}" status. Only Draft challans can be modified.`,
      });
    }

    const {
      challanDate,
      dispatchDate,
      expectedDeliveryDate,
      clientSnapshot,
      items = [],
      transportDetails,
      purpose,
      shippingNotes,
      termsAndConditions,
      status = 'Draft',
    } = req.body;

    if (!EDITABLE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'A draft can only be saved as Draft or Dispatched.' });
    }

    // Recalculate balances excluding this challan, from the order's real quantities
    const orderDoc = await Order.findById(challan.order).lean();
    if (!orderDoc) return res.status(404).json({ success: false, message: 'Referenced order not found' });
    const dispatchedMap = await calculateOrderDispatches(challan.order, challan._id);

    let totalDispatchedQty = 0;
    let validatedItems = [];
    if (Array.isArray(items) && items.length > 0) {
      const built = buildItemsFromOrder(orderDoc, dispatchedMap, items);
      if (built.error) return res.status(400).json({ success: false, message: built.error });
      validatedItems = built.items;
      totalDispatchedQty = built.total;
    }
    if (status === 'Dispatched' && (validatedItems.length > 0 ? totalDispatchedQty : challan.totalDispatchedQuantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Total dispatch quantity must be greater than 0' });
    }

    if (challanDate) challan.challanDate = new Date(challanDate);
    if (dispatchDate) challan.dispatchDate = new Date(dispatchDate);
    if (expectedDeliveryDate !== undefined) {
      challan.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    }
    if (clientSnapshot) challan.clientSnapshot = { ...challan.clientSnapshot, ...clientSnapshot };
    if (transportDetails) challan.transportDetails = { ...challan.transportDetails, ...transportDetails };
    if (purpose) challan.purpose = purpose;
    if (shippingNotes !== undefined) challan.shippingNotes = shippingNotes;
    if (termsAndConditions !== undefined) challan.termsAndConditions = termsAndConditions;
    if (validatedItems.length > 0) {
      challan.items = validatedItems;
      challan.totalDispatchedQuantity = totalDispatchedQty;
    }

    const previousStatus = challan.status;
    if (status && status !== previousStatus) {
      challan.status = status;
      challan.auditHistory.push({
        status,
        action: `Status transitioned from ${previousStatus} to ${status}`,
        changedBy: actorName(req),
        timestamp: new Date(),
        notes: 'Challan finalized / updated',
      });
    } else {
      challan.auditHistory.push({
        status: challan.status,
        action: 'Draft Details Updated',
        changedBy: actorName(req),
        timestamp: new Date(),
        notes: 'Draft items or transport details updated',
      });
    }

    await challan.save();

    if (challan.status === 'Dispatched' && (await orderIsOverDispatched(orderDoc))) {
      challan.status = 'Draft';
      await challan.save();
      return res.status(409).json({
        success: false,
        message: 'Another dispatch for this order was recorded at the same time and the quantity is no longer available. The challan stays a Draft.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery challan updated successfully',
      challan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/delivery-challans/:id/finalize
 * Finalize Draft to Dispatched with atomic quantity validation
 */
export const finalizeDeliveryChallan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const challan = await findScoped(req, id);
    if (!challan) {
      return notFound(res);
    }

    if (challan.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: `Challan is already in "${challan.status}" status and cannot be finalized again`,
      });
    }

    // Atomic validation against database
    const dispatchedMap = await calculateOrderDispatches(challan.order, challan._id);

    for (const item of challan.items) {
      const key = String(item.product || item.variantSku || item.sku || item.name).trim();
      const prevDispatched = dispatchedMap[key] || 0;
      const remainingBeforeThis = Math.max(0, item.orderedQuantity - prevDispatched);

      if (item.dispatchedQuantity > remainingBeforeThis) {
        return res.status(400).json({
          success: false,
          message: `Cannot finalize: Product "${item.name}" exceeds remaining dispatchable quantity (${remainingBeforeThis} available, attempted ${item.dispatchedQuantity})`,
        });
      }

      item.previouslyDispatchedQuantity = prevDispatched;
      item.remainingQuantity = Math.max(0, remainingBeforeThis - item.dispatchedQuantity);
    }

    if (!(challan.totalDispatchedQuantity > 0)) {
      return res.status(400).json({ success: false, message: 'Total dispatch quantity must be greater than 0' });
    }
    const finalizeOrder = await Order.findById(challan.order).lean();

    challan.status = 'Dispatched';
    challan.dispatchDate = new Date();
    challan.auditHistory.push({
      status: 'Dispatched',
      action: 'Challan Finalized and Marked as Dispatched',
      changedBy: actorName(req),
      timestamp: new Date(),
      notes: `Finalized with ${challan.totalDispatchedQuantity} total dispatched items`,
    });

    await challan.save();

    if (finalizeOrder && (await orderIsOverDispatched(finalizeOrder))) {
      challan.status = 'Draft';
      await challan.save();
      return res.status(409).json({
        success: false,
        message: 'Another dispatch for this order was recorded at the same time and the quantity is no longer available. The challan stays a Draft.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Delivery challan finalized and dispatched successfully',
      challan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/delivery-challans/:id/status
 * Transition status: Partially Delivered, Delivered
 */
export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, receivedBy, receivedDate, receiverRemarks, receiverPhone } = req.body;

    const allowed = ['Partially Delivered', 'Delivered'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid delivery status. Allowed statuses: ${allowed.join(', ')}`,
      });
    }

    const challan = await findScoped(req, id);
    if (!challan) {
      return notFound(res);
    }

    if (challan.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update delivery status of a cancelled challan',
      });
    }

    if (challan.status === 'Delivered') {
      return res.status(400).json({ success: false, message: 'This challan is already marked Delivered.' });
    }

    if (challan.status === 'Draft') {
      return res.status(400).json({
        success: false,
        message: 'Draft challans must be dispatched before marking as delivered',
      });
    }

    challan.status = status;
    challan.deliveryDetails = {
      receivedBy: receivedBy || challan.deliveryDetails?.receivedBy || '',
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      receiverRemarks: receiverRemarks || '',
      receiverPhone: receiverPhone || '',
    };

    challan.auditHistory.push({
      status,
      action: `Marked as ${status}`,
      changedBy: actorName(req),
      timestamp: new Date(),
      notes: `Received by: ${receivedBy || 'Consignee'}. Remarks: ${receiverRemarks || 'Goods verified in good condition'}`,
    });

    await challan.save();

    res.status(200).json({
      success: true,
      message: `Delivery status updated to ${status}`,
      challan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/delivery-challans/:id/cancel
 * Cancel a delivery challan with audit log
 */
export const cancelDeliveryChallan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reason = String((req.body || {}).reason || '').trim() || 'Cancelled by administrator';

    const challan = await findScoped(req, id);
    if (!challan) {
      return notFound(res);
    }

    if (challan.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Challan is already cancelled' });
    }

    if (challan.status === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'A fully delivered challan cannot be cancelled directly without a return/reverse workflow',
      });
    }

    challan.status = 'Cancelled';
    challan.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: actorName(req),
      reason,
    };

    challan.auditHistory.push({
      status: 'Cancelled',
      action: 'Challan Cancelled',
      changedBy: actorName(req),
      timestamp: new Date(),
      notes: `Reason: ${reason}`,
    });

    await challan.save();

    res.status(200).json({
      success: true,
      message: `Challan #${challan.challanNumber} cancelled successfully`,
      challan,
    });
  } catch (error) {
    next(error);
  }
};

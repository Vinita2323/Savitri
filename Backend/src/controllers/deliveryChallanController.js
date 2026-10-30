import mongoose from 'mongoose';
import DeliveryChallan from '../models/DeliveryChallan.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';

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
  const currentYear = new Date().getFullYear();
  const prefix = `DC-${currentYear}-`;

  const latestChallan = await DeliveryChallan.findOne({
    challanNumber: new RegExp(`^${prefix}\\d+`, 'i'),
  })
    .sort({ challanNumber: -1 })
    .lean();

  let nextSequence = 1;
  if (latestChallan && latestChallan.challanNumber) {
    const parts = latestChallan.challanNumber.split('-');
    if (parts.length >= 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) {
        nextSequence = num + 1;
      }
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
};

/**
 * GET /api/delivery-challans/next-number
 */
export const getNextChallanNumber = async (req, res, next) => {
  try {
    const challanNumber = await generateNextChallanNumber();
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

    if (!order) {
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
    const existingChallans = await DeliveryChallan.find({ order: order._id })
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

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      filter.client = clientId;
    }

    if (orderNumber && orderNumber.trim()) {
      filter.orderNumber = { $regex: orderNumber.trim(), $options: 'i' };
    }

    if (req.scope && !req.scope.isAll && req.scope.city) {
      filter['clientSnapshot.shippingAddress.city'] = new RegExp(`^${req.scope.city.trim()}$`, 'i');
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
      const term = search.trim();
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
    const { id } = req.params;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const challan = await DeliveryChallan.findOne(
      isMongoId ? { $or: [{ _id: id }, { challanNumber: id }] } : { challanNumber: id }
    )
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

    if (!clientId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Client and Order references are required to create a delivery challan',
      });
    }

    // Verify Order exists
    const orderDoc = await Order.findById(orderId).lean();
    if (!orderDoc) {
      return res.status(404).json({ success: false, message: 'Referenced order not found' });
    }

    if (['Cancelled', 'Rejected'].includes(orderDoc.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot issue a delivery challan for an order with status "${orderDoc.orderStatus}"`,
      });
    }

    // Validate Items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product item with dispatch quantity is required',
      });
    }

    // Get live dispatched quantities from DB
    const dispatchedMap = await calculateOrderDispatches(orderDoc._id);

    // Compute item balances and validate
    let totalDispatchedQty = 0;
    const validatedItems = [];

    for (const item of items) {
      const dispatchedQty = Number(item.dispatchedQuantity) || 0;
      if (dispatchedQty <= 0 && status !== 'Draft') {
        return res.status(400).json({
          success: false,
          message: `Dispatched quantity for "${item.name}" must be greater than zero`,
        });
      }

      const key = String(item.product || item.variantSku || item.sku || item.name).trim();
      const prevDispatched = dispatchedMap[key] || 0;
      const orderedQty = Number(item.orderedQuantity) || 0;
      const remainingBeforeThis = Math.max(0, orderedQty - prevDispatched);

      // Strict over-dispatch check if finalizing
      if (status === 'Dispatched' && dispatchedQty > remainingBeforeThis) {
        return res.status(400).json({
          success: false,
          message: `Over-dispatch rejected for "${item.name}": Attempted ${dispatchedQty}, but remaining dispatchable quantity is ${remainingBeforeThis}`,
        });
      }

      totalDispatchedQty += dispatchedQty;

      validatedItems.push({
        product: item.product || null,
        name: item.name,
        sku: item.sku || '',
        variantSku: item.variantSku || '',
        variantTitle: item.variantTitle || '',
        hsn: item.hsn || '',
        unit: item.unit || 'Units',
        unitPrice: Number(item.unitPrice) || 0,
        orderedQuantity: orderedQty,
        previouslyDispatchedQuantity: prevDispatched,
        dispatchedQuantity: dispatchedQty,
        remainingQuantity: Math.max(0, remainingBeforeThis - dispatchedQty),
        notes: item.notes || '',
      });
    }

    if (totalDispatchedQty <= 0 && status === 'Dispatched') {
      return res.status(400).json({
        success: false,
        message: 'Total dispatch quantity must be greater than 0',
      });
    }

    // Generate unique challan number if not provided or exists
    let challanNumber = (customChallanNumber || '').trim().toUpperCase();
    if (!challanNumber) {
      challanNumber = await generateNextChallanNumber();
    } else {
      const existing = await DeliveryChallan.findOne({ challanNumber });
      if (existing) {
        challanNumber = await generateNextChallanNumber();
      }
    }

    const creatorInfo = {
      userId: req.user?.id || req.user?._id || 'admin',
      name: req.user?.name || 'Administrator',
      role: req.user?.role || 'admin',
    };

    const initialAudit = {
      status,
      action: status === 'Dispatched' ? 'Challan Created & Dispatched' : 'Draft Challan Created',
      changedBy: creatorInfo.name,
      timestamp: new Date(),
      notes: `Created with ${validatedItems.length} items (Total qty: ${totalDispatchedQty})`,
    };

    const newChallan = new DeliveryChallan({
      challanNumber,
      challanDate: new Date(challanDate),
      dispatchDate: new Date(dispatchDate),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      client: clientId,
      clientSnapshot: clientSnapshot || {},
      order: orderDoc._id,
      orderNumber: orderNumber || orderDoc.orderId,
      orderDate: orderDate ? new Date(orderDate) : orderDoc.createdAt,
      orderGrandTotal: orderGrandTotal || orderDoc.grandTotal || 0,
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

    await newChallan.save();

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

    const challan = await DeliveryChallan.findById(id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
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

    // Recalculate balances excluding this challan
    const dispatchedMap = await calculateOrderDispatches(challan.order, challan._id);

    let totalDispatchedQty = 0;
    const validatedItems = [];

    for (const item of items) {
      const dispatchedQty = Number(item.dispatchedQuantity) || 0;
      const key = String(item.product || item.variantSku || item.sku || item.name).trim();
      const prevDispatched = dispatchedMap[key] || 0;
      const orderedQty = Number(item.orderedQuantity) || 0;
      const remainingBeforeThis = Math.max(0, orderedQty - prevDispatched);

      if (status === 'Dispatched' && dispatchedQty > remainingBeforeThis) {
        return res.status(400).json({
          success: false,
          message: `Over-dispatch rejected for "${item.name}": Attempted ${dispatchedQty}, max allowed is ${remainingBeforeThis}`,
        });
      }

      totalDispatchedQty += dispatchedQty;
      validatedItems.push({
        product: item.product || null,
        name: item.name,
        sku: item.sku || '',
        variantSku: item.variantSku || '',
        variantTitle: item.variantTitle || '',
        hsn: item.hsn || '',
        unit: item.unit || 'Units',
        unitPrice: Number(item.unitPrice) || 0,
        orderedQuantity: orderedQty,
        previouslyDispatchedQuantity: prevDispatched,
        dispatchedQuantity: dispatchedQty,
        remainingQuantity: Math.max(0, remainingBeforeThis - dispatchedQty),
        notes: item.notes || '',
      });
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
        changedBy: req.user?.name || 'Administrator',
        timestamp: new Date(),
        notes: 'Challan finalized / updated',
      });
    } else {
      challan.auditHistory.push({
        status: challan.status,
        action: 'Draft Details Updated',
        changedBy: req.user?.name || 'Administrator',
        timestamp: new Date(),
        notes: 'Draft items or transport details updated',
      });
    }

    await challan.save();

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

    const challan = await DeliveryChallan.findById(id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
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

    challan.status = 'Dispatched';
    challan.dispatchDate = new Date();
    challan.auditHistory.push({
      status: 'Dispatched',
      action: 'Challan Finalized and Marked as Dispatched',
      changedBy: req.user?.name || 'Administrator',
      timestamp: new Date(),
      notes: `Finalized with ${challan.totalDispatchedQuantity} total dispatched items`,
    });

    await challan.save();

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

    const challan = await DeliveryChallan.findById(id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
    }

    if (challan.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update delivery status of a cancelled challan',
      });
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
      changedBy: req.user?.name || 'Administrator',
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
    const { reason = 'Cancelled by administrator' } = req.body;

    const challan = await DeliveryChallan.findById(id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found' });
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
      cancelledBy: req.user?.name || 'Administrator',
      reason,
    };

    challan.auditHistory.push({
      status: 'Cancelled',
      action: 'Challan Cancelled',
      changedBy: req.user?.name || 'Administrator',
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

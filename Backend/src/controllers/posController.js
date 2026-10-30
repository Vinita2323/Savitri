import mongoose from 'mongoose';
import PosSale from '../models/PosSale.model.js';
import Product from '../models/Product.model.js';
import Seller from '../models/Seller.model.js';
import User from '../models/User.model.js';
import Order from '../models/Order.model.js';
import SellerNotification from '../models/SellerNotification.model.js';
import DeliveryPricing from '../models/DeliveryPricing.model.js';
import { sellerScopeFilter } from '../middleware/scopeMiddleware.js';

// Helper: Atomic inventory stock adjuster (reuses existing project pattern)
const adjustPosStock = async (items, direction = -1) => {
  const adjusted = [];
  for (const it of items) {
    const qty = Number(it.quantity) * direction;
    const filter = it.variantSku
      ? {
          _id: it.product || it.productId,
          'variants.sku': it.variantSku,
          ...(direction < 0 ? { stock: { $gte: it.quantity }, 'variants.stock': { $gte: it.quantity } } : {}),
        }
      : {
          _id: it.product || it.productId,
          ...(direction < 0 ? { stock: { $gte: it.quantity } } : {}),
        };

    const update = it.variantSku
      ? { $inc: { 'variants.$.stock': qty, stock: qty } }
      : { $inc: { stock: qty } };

    const res = await Product.updateOne(filter, update);
    if (res.modifiedCount !== 1) {
      // Rollback already adjusted items if stock was insufficient
      if (direction < 0 && adjusted.length > 0) {
        await adjustPosStock(adjusted, 1);
      }
      const prodDoc = await Product.findById(it.product || it.productId).select('name stock variants');
      const maxAvailable = it.variantSku
        ? prodDoc?.variants?.find((v) => v.sku === it.variantSku)?.stock || 0
        : prodDoc?.stock || 0;

      return {
        success: false,
        failedItem: it.name || prodDoc?.name || 'Product',
        requested: it.quantity,
        available: maxAvailable,
      };
    }
    adjusted.push(it);
  }
  return { success: true };
};

// Helper: Generate collision-safe POS invoice number
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await PosSale.countDocuments({
    invoiceNumber: new RegExp(`^POS-${year}-`),
  });
  const seq = String(count + 1).padStart(5, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `POS-${year}-${seq}-${rand}`;
};

// Helper: Generate unique delivery order ID matching project convention
const generateOrderId = async () => {
  const timestamp = Date.now().toString().slice(-6);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${timestamp}-${randomNum}`;
};

export const getPosStores = async (req, res) => {
  try {
    const scopeQuery = {
      $or: [{ status: 'approved' }, { accountStatus: 'approved' }],
    };
    if (req.scope && !req.scope.isAll) {
      scopeQuery.$and = [sellerScopeFilter(req.scope)];
    }

    const sellers = await Seller.find(scopeQuery)
      .select('_id businessName phone ownerName storeLogo warehouseLocation city address state')
      .lean();

    const formatted = sellers.map((s) => ({
      id: s._id,
      storeName: s.businessName || s.ownerName || 'Store Location',
      phone: s.phone || '',
      city: s.warehouseLocation?.city || s.city || 'Central Hub',
      address: s.warehouseLocation?.storeAddress || s.address || '',
      pincode: s.warehouseLocation?.pincode || '',
      type: 'Seller Warehouse',
    }));

    // Add Central / Default Fulfillment store if list is empty
    if (formatted.length === 0) {
      formatted.push({
        id: 'store_central',
        storeName: 'ShippNex Central Fulfillment Hub',
        phone: '9876543210',
        city: 'Indore',
        address: 'Plot 42, Logistics Park, Ring Road',
        pincode: '452001',
        type: 'Central Warehouse',
      });
    }

    return res.status(200).json({ success: true, stores: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Search and List Products with Store-Specific Stock
export const getPosProducts = async (req, res) => {
  try {
    const { search = '', category = '', storeId = '', page = 1, limit = 50 } = req.query;

    let query = { status: { $ne: 'Draft' } };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      query.$or = [{ sellerId: storeId }, { seller: storeId }];
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { name: regex },
        { sku: regex },
        { brand: regex },
        { category: regex },
        { 'variants.sku': regex },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('name sku mrp salePrice stock category subCategory brand unit taxRate hsnCode mainImage hasVariants variants')
      .sort({ stock: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      products: products.map((p) => {
        let taxNum = 5;
        if (typeof p.taxRate === 'string') {
          taxNum = parseFloat(p.taxRate.replace('%', '')) || 5;
        } else if (typeof p.taxRate === 'number') {
          taxNum = p.taxRate;
        }

        return {
          id: p._id,
          name: p.name,
          sku: p.sku || `SKU-${String(p._id).slice(-6).toUpperCase()}`,
          barcode: p.sku || '',
          mrp: p.mrp || p.salePrice || 0,
          salePrice: p.salePrice || p.mrp || 0,
          stock: p.stock || 0,
          category: p.category || 'General',
          brand: p.brand || '',
          unit: p.unit || '1 pc',
          hsnCode: p.hsnCode || '',
          taxRate: taxNum,
          image: p.mainImage || '',
          hasVariants: Boolean(p.hasVariants && p.variants?.length > 0),
          variants: p.variants || [],
        };
      }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Search and Lookup Customers
export const searchPosCustomers = async (req, res) => {
  try {
    const { query = '' } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(200).json({ success: true, customers: [] });
    }

    const clean = query.trim();
    const regex = new RegExp(clean, 'i');

    const users = await User.find({
      $or: [{ phone: regex }, { name: regex }, { email: regex }],
    })
      .select('name phone email addresses')
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      customers: users.map((u) => ({
        id: u._id,
        name: u.name || 'Customer',
        phone: u.phone,
        email: u.email || '',
        addresses: u.addresses || [],
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Quick-Create Customer from POS Terminal
export const createPosCustomer = async (req, res) => {
  try {
    const { name, phone, email = '', address = {} } = req.body;
    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
    }

    const cleanPhone = phone.trim().slice(-10);
    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      user = new User({
        name: (name || 'Walk-in Customer').trim(),
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        isVerified: true,
        addresses: address.addressLine1
          ? [
              {
                fullName: name || 'Customer',
                phone: cleanPhone,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 || '',
                city: address.city || 'Indore',
                state: address.state || 'Madhya Pradesh',
                pincode: address.pincode || '452001',
              },
            ]
          : [],
      });
      await user.save();
    } else if (address.addressLine1 && user.addresses.length === 0) {
      user.addresses.push({
        fullName: name || user.name,
        phone: cleanPhone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city || 'Indore',
        state: address.state || 'Madhya Pradesh',
        pincode: address.pincode || '452001',
      });
      await user.save();
    }

    return res.status(201).json({
      success: true,
      customer: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        addresses: user.addresses,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Canonical Billing Calculation Endpoint
export const calculatePosBill = async (req, res) => {
  try {
    const { items = [], billDiscountPercent = 0, saleType = 'COUNTER_SALE' } = req.body;

    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let taxableAmount = 0;
    let totalTax = 0;

    const calculatedItems = [];

    for (const it of items) {
      const pDoc = await Product.findById(it.productId).select('name salePrice taxRate hsnCode sku').lean();
      const unitPrice = pDoc?.salePrice || Number(it.salePrice) || 0;
      const qty = Math.max(1, Number(it.quantity) || 1);
      const gross = unitPrice * qty;

      const itemDiscPct = Math.min(100, Math.max(0, Number(it.discountPercent) || 0));
      const itemDiscVal = (gross * itemDiscPct) / 100;
      const netTaxable = gross - itemDiscVal;

      let taxPct = 5;
      if (typeof pDoc?.taxRate === 'string') {
        taxPct = parseFloat(pDoc.taxRate.replace('%', '')) || 5;
      } else if (typeof pDoc?.taxRate === 'number') {
        taxPct = pDoc.taxRate;
      }

      const itemTaxVal = (netTaxable * taxPct) / 100;
      const lineTotal = netTaxable + itemTaxVal;

      subtotal += gross;
      itemDiscountsTotal += itemDiscVal;
      taxableAmount += netTaxable;
      totalTax += itemTaxVal;

      calculatedItems.push({
        productId: it.productId,
        name: it.name || pDoc?.name || 'Product',
        sku: it.sku || pDoc?.sku || '',
        salePrice: unitPrice,
        quantity: qty,
        discountPercent: itemDiscPct,
        discountAmount: itemDiscVal,
        taxRate: taxPct,
        taxAmount: itemTaxVal,
        lineTotal,
      });
    }

    const billDiscPct = Math.min(100, Math.max(0, Number(billDiscountPercent) || 0));
    const billDiscVal = ((taxableAmount) * billDiscPct) / 100;

    let deliveryCharge = 0;
    if (saleType === 'DELIVERY_ORDER') {
      try {
        const pricing = await DeliveryPricing.findOne({ isActive: true });
        deliveryCharge = pricing?.baseFee || 35;
      } catch (e) {
        deliveryCharge = 35;
      }
    }

    const netTaxableTotal = Math.max(0, taxableAmount - billDiscVal);
    const calculatedGrandTotal = Math.round((netTaxableTotal + totalTax + deliveryCharge) * 100) / 100;

    return res.status(200).json({
      success: true,
      breakdown: {
        items: calculatedItems,
        subtotal,
        itemDiscountsTotal,
        billDiscountPercent: billDiscPct,
        billDiscountAmount: billDiscVal,
        taxableAmount: netTaxableTotal,
        totalTax,
        deliveryCharge,
        grandTotal: calculatedGrandTotal,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 6. Complete Counter Sale
export const completeCounterSale = async (req, res) => {
  try {
    const {
      store,
      customer,
      items,
      subtotal,
      itemDiscountsTotal = 0,
      billDiscountPercent = 0,
      billDiscountAmount = 0,
      taxableAmount,
      gstTotal = 0,
      cgstAmount = 0,
      sgstAmount = 0,
      igstAmount = 0,
      grandTotal,
      payment,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart contains no items to bill.' });
    }

    // 1. Concurrency-Safe Atomic Stock Deduction
    const stockResult = await adjustPosStock(items, -1);
    if (!stockResult.success) {
      return res.status(409).json({
        success: false,
        message: `Insufficient stock for "${stockResult.failedItem}". Requested: ${stockResult.requested}, Available: ${stockResult.available}.`,
      });
    }

    // 2. Generate Unique Invoice Number
    const invoiceNumber = await generateInvoiceNumber();

    // 3. Create POS Sale Record
    const posSale = new PosSale({
      invoiceNumber,
      saleType: 'COUNTER_SALE',
      status: 'COMPLETED',
      store: {
        storeId: store?.storeId && mongoose.Types.ObjectId.isValid(store.storeId) ? store.storeId : null,
        storeName: store?.storeName || 'Central Store',
        phone: store?.phone || '',
        address: store?.address || '',
        gstin: store?.gstin || '',
      },
      customer: {
        isWalkIn: customer?.isWalkIn ?? true,
        userId: customer?.userId || null,
        name: customer?.name || 'Walk-in Customer',
        phone: customer?.phone || '',
        email: customer?.email || '',
      },
      items: items.map((it) => ({
        product: it.productId || it.product,
        name: it.name,
        sku: it.sku || '',
        barcode: it.barcode || '',
        image: it.image || '',
        unit: it.unit || '1 pc',
        mrp: it.mrp || it.salePrice,
        salePrice: it.salePrice,
        quantity: it.quantity,
        discountPercent: it.discountPercent || 0,
        discountAmount: it.discountAmount || 0,
        taxRate: it.taxRate || 5,
        taxAmount: it.taxAmount || 0,
        lineTotal: it.lineTotal,
      })),
      subtotal,
      itemDiscountsTotal,
      billDiscountPercent,
      billDiscountAmount,
      taxableAmount,
      cgstAmount: cgstAmount || gstTotal / 2,
      sgstAmount: sgstAmount || gstTotal / 2,
      igstAmount: igstAmount || 0,
      gstTotal,
      deliveryCharge: 0,
      grandTotal,
      payment: {
        method: payment?.method || 'CASH',
        status: payment?.status || 'PAID',
        amountReceived: payment?.amountReceived ?? grandTotal,
        changeReturned: payment?.changeReturned || 0,
        balanceDue: payment?.balanceDue || 0,
        referenceNumber: payment?.referenceNumber || '',
        notes: payment?.notes || '',
      },
      createdBy: {
        adminId: req.user?._id || null,
        name: req.user?.name || 'Super Admin',
      },
    });

    await posSale.save();

    return res.status(201).json({
      success: true,
      message: 'Counter Sale successfully completed.',
      invoiceNumber: posSale.invoiceNumber,
      sale: posSale,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 7. Create Delivery Order via POS
export const createPosDeliveryOrder = async (req, res) => {
  try {
    const {
      store,
      customer,
      items,
      subtotal,
      itemDiscountsTotal = 0,
      billDiscountPercent = 0,
      billDiscountAmount = 0,
      taxableAmount,
      gstTotal = 0,
      deliveryCharge = 35,
      grandTotal,
      payment,
      deliverySlot,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart contains no items to order.' });
    }

    if (!customer?.shippingAddress?.addressLine1) {
      return res.status(400).json({ success: false, message: 'Delivery address is required for Delivery Orders.' });
    }

    // 1. Deduct Stock Atomically
    const stockResult = await adjustPosStock(items, -1);
    if (!stockResult.success) {
      return res.status(409).json({
        success: false,
        message: `Insufficient stock for "${stockResult.failedItem}". Requested: ${stockResult.requested}, Available: ${stockResult.available}.`,
      });
    }

    // 2. Resolve / Create User
    let userId = customer.userId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      const cleanPhone = (customer.phone || '9999999999').replace(/\D/g, '').slice(-10);
      let uDoc = await User.findOne({ phone: cleanPhone });
      if (!uDoc) {
        uDoc = await User.create({
          name: customer.name || 'POS Customer',
          phone: cleanPhone,
          email: customer.email || '',
          isVerified: true,
        });
      }
      userId = uDoc._id;
    }

    const orderId = await generateOrderId();
    const invoiceNumber = await generateInvoiceNumber();

    // 3. Create Real Order Document in Order.model.js
    const newOrder = new Order({
      orderId,
      user: userId,
      orderSource: 'POS',
      posInvoiceNumber: invoiceNumber,
      items: items.map((it) => ({
        product: it.productId || it.product,
        name: it.name,
        price: it.salePrice,
        originalPrice: it.mrp || it.salePrice,
        quantity: it.quantity,
        image: it.image || '',
        seller: store?.storeName || 'ShippNex Official Store',
        sku: it.sku || '',
      })),
      shippingAddress: {
        fullName: customer.name || 'Customer',
        phone: customer.phone || '9999999999',
        email: customer.email || '',
        addressLine1: customer.shippingAddress.addressLine1,
        addressLine2: customer.shippingAddress.addressLine2 || '',
        city: customer.shippingAddress.city || 'Indore',
        state: customer.shippingAddress.state || 'Madhya Pradesh',
        pincode: customer.shippingAddress.pincode || '452001',
        country: 'India',
        addressType: 'Home',
      },
      deliverySlot: deliverySlot || { date: 'Today', time: 'Standard Delivery' },
      paymentMethod: payment?.method || 'COD',
      paymentStatus: payment?.status === 'PAID' ? 'Paid' : 'Pending',
      orderStatus: 'Placed',
      itemsTotal: subtotal,
      shippingFee: deliveryCharge,
      discount: itemDiscountsTotal + billDiscountAmount,
      gst: gstTotal,
      grandTotal,
    });

    await newOrder.save();

    // 4. Create Linked PosSale record
    const posSale = new PosSale({
      invoiceNumber,
      saleType: 'DELIVERY_ORDER',
      status: 'COMPLETED',
      store: {
        storeId: store?.storeId && mongoose.Types.ObjectId.isValid(store.storeId) ? store.storeId : null,
        storeName: store?.storeName || 'Central Store',
        phone: store?.phone || '',
        address: store?.address || '',
      },
      customer: {
        isWalkIn: false,
        userId,
        name: customer.name || 'Customer',
        phone: customer.phone || '',
        email: customer.email || '',
        shippingAddress: customer.shippingAddress,
      },
      items: items.map((it) => ({
        product: it.productId || it.product,
        name: it.name,
        sku: it.sku || '',
        image: it.image || '',
        salePrice: it.salePrice,
        quantity: it.quantity,
        discountPercent: it.discountPercent || 0,
        discountAmount: it.discountAmount || 0,
        taxRate: it.taxRate || 5,
        taxAmount: it.taxAmount || 0,
        lineTotal: it.lineTotal,
      })),
      subtotal,
      itemDiscountsTotal,
      billDiscountPercent,
      billDiscountAmount,
      taxableAmount,
      gstTotal,
      deliveryCharge,
      grandTotal,
      payment: {
        method: payment?.method || 'COD',
        status: payment?.status || 'PENDING',
        amountReceived: payment?.amountReceived || 0,
        balanceDue: payment?.balanceDue ?? grandTotal,
        referenceNumber: payment?.referenceNumber || '',
        notes: payment?.notes || '',
      },
      deliverySlot,
      orderId: newOrder.orderId,
      orderRef: newOrder._id,
      createdBy: {
        adminId: req.user?._id || null,
        name: req.user?.name || 'Super Admin',
      },
    });

    await posSale.save();

    // 5. Trigger Seller Notification (if seller assigned)
    try {
      if (store?.storeId && mongoose.Types.ObjectId.isValid(store.storeId)) {
        await SellerNotification.create({
          sellerId: String(store.storeId),
          sellerName: store.storeName,
          order: newOrder._id,
          orderId: newOrder.orderId,
          items: newOrder.items,
          customerDetails: {
            name: customer.name,
            phone: customer.phone,
          },
          deliveryAddress: newOrder.shippingAddress,
          paymentMethod: newOrder.paymentMethod,
          paymentStatus: newOrder.paymentStatus,
          totalAmount: subtotal,
          status: 'NEW',
        });
      }
    } catch (notifErr) {
      console.warn('POS Delivery Notification Notice:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Delivery Order successfully placed via POS.',
      orderId: newOrder.orderId,
      invoiceNumber: posSale.invoiceNumber,
      order: newOrder,
      sale: posSale,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 8. Save Held Bill / Draft
export const saveHeldBill = async (req, res) => {
  try {
    const { id, heldLabel, store, customer, items, subtotal, billDiscountPercent, grandTotal, saleType } = req.body;

    let invoiceNumber = id;
    let saleDoc = null;

    if (id && (await PosSale.findById(id))) {
      saleDoc = await PosSale.findById(id);
    }

    if (!saleDoc) {
      invoiceNumber = await generateInvoiceNumber();
      saleDoc = new PosSale({
        invoiceNumber,
        saleType: saleType || 'COUNTER_SALE',
        status: 'HELD',
        heldLabel: heldLabel || `Held Bill #${Date.now().toString().slice(-4)}`,
        heldAt: new Date(),
        store,
        customer,
        items: items.map((it) => ({
          product: it.productId || it.product,
          name: it.name,
          sku: it.sku,
          salePrice: it.salePrice,
          quantity: it.quantity,
          lineTotal: it.lineTotal,
        })),
        subtotal: subtotal || 0,
        taxableAmount: subtotal || 0,
        grandTotal: grandTotal || 0,
        createdBy: {
          adminId: req.user?._id || null,
          name: req.user?.name || 'Super Admin',
        },
      });
    } else {
      saleDoc.heldLabel = heldLabel || saleDoc.heldLabel;
      saleDoc.store = store || saleDoc.store;
      saleDoc.customer = customer || saleDoc.customer;
      saleDoc.items = items.map((it) => ({
        product: it.productId || it.product,
        name: it.name,
        sku: it.sku,
        salePrice: it.salePrice,
        quantity: it.quantity,
        lineTotal: it.lineTotal,
      }));
      saleDoc.subtotal = subtotal;
      saleDoc.grandTotal = grandTotal;
      saleDoc.heldAt = new Date();
    }

    await saleDoc.save();

    return res.status(200).json({
      success: true,
      message: 'Bill successfully put on hold.',
      heldBill: saleDoc,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 9. Get Held Bills
export const getHeldBills = async (req, res) => {
  try {
    const bills = await PosSale.find({
      status: { $in: ['HELD', 'DRAFT'] },
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, count: bills.length, bills });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 10. Delete Held Bill
export const deleteHeldBill = async (req, res) => {
  try {
    const { id } = req.params;
    await PosSale.deleteOne({ _id: id, status: { $in: ['HELD', 'DRAFT'] } });
    return res.status(200).json({ success: true, message: 'Held bill removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 11. POS Sales History with Filters
export const getPosHistory = async (req, res) => {
  try {
    const {
      saleType,
      status,
      paymentStatus,
      paymentMethod,
      storeId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { status: { $ne: 'DRAFT' } };

    if (saleType && saleType !== 'ALL') {
      query.saleType = saleType;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      query['payment.status'] = paymentStatus;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      query['payment.method'] = paymentMethod;
    }

    if (req.scope && !req.scope.isAll) {
      // Always constrain to the selected brand's stores; an explicit storeId may only narrow it.
      const matchingSellers = await Seller.find(sellerScopeFilter(req.scope)).select('_id').lean();
      const scopedIds = matchingSellers.map((s) => String(s._id));
      if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
        query['store.storeId'] = scopedIds.includes(String(storeId)) ? storeId : { $in: [] };
      } else {
        query['store.storeId'] = { $in: scopedIds };
      }
    } else if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      query['store.storeId'] = storeId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { invoiceNumber: regex },
        { orderId: regex },
        { 'customer.name': regex },
        { 'customer.phone': regex },
        { 'payment.referenceNumber': regex },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const total = await PosSale.countDocuments(query);
    const sales = await PosSale.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      sales,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 12. POS Dashboard Summary Metrics
export const getPosDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCompleted, allCompletedCounter, allDeliveryOrders, pendingPayments, heldBillsCount] = await Promise.all([
      // Today's completed sales
      PosSale.aggregate([
        { $match: { status: 'COMPLETED', createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      // Counter sales total
      PosSale.aggregate([
        { $match: { saleType: 'COUNTER_SALE', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      // Delivery orders created via POS
      PosSale.aggregate([
        { $match: { saleType: 'DELIVERY_ORDER', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      // Pending / partial payments
      PosSale.aggregate([
        { $match: { status: 'COMPLETED', 'payment.status': { $in: ['PARTIAL', 'PENDING'] } } },
        { $group: { _id: null, balanceDue: { $sum: '$payment.balanceDue' }, count: { $sum: 1 } } },
      ]),
      // Held bills count
      PosSale.countDocuments({ status: { $in: ['HELD', 'DRAFT'] } }),
    ]);

    return res.status(200).json({
      success: true,
      metrics: {
        todaySales: todayCompleted[0]?.total || 0,
        todayTransactionsCount: todayCompleted[0]?.count || 0,
        counterSalesTotal: allCompletedCounter[0]?.total || 0,
        counterSalesCount: allCompletedCounter[0]?.count || 0,
        deliveryOrdersTotal: allDeliveryOrders[0]?.total || 0,
        deliveryOrdersCount: allDeliveryOrders[0]?.count || 0,
        pendingBalanceDue: pendingPayments[0]?.balanceDue || 0,
        pendingPaymentsCount: pendingPayments[0]?.count || 0,
        heldBillsCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

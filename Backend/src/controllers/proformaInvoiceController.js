import mongoose from 'mongoose';
import ProformaInvoice from '../models/ProformaInvoice.model.js';
import User from '../models/User.model.js';
import Product from '../models/Product.model.js';
import Order from '../models/Order.model.js';
import { sendProformaInvoiceEmail } from '../services/proformaInvoiceEmailService.js';

/**
 * Server-side mathematical validation and calculation helper.
 * Never trusts client-computed financials.
 */
export const computeProformaFinancials = (
  rawItems = [],
  overallDiscount = 0,
  shippingCharges = 0,
  additionalCharges = 0,
  advancePercentage = 50,
  manualAdvanceAmount = null,
  buyerState = 'Madhya Pradesh',
  existingPaymentRecords = []
) => {
  let subtotal = 0;
  let lineDiscountTotal = 0;
  let taxableTotal = 0;
  let totalTax = 0;

  const validatedItems = rawItems.map((item, idx) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const baseAmount = qty * unitPrice;

    let discountAmount = 0;
    const discountVal = Math.max(0, Number(item.discountValue) || 0);
    if (item.discountType === 'amount') {
      discountAmount = Math.min(baseAmount, discountVal);
    } else {
      discountAmount = (baseAmount * Math.min(100, discountVal)) / 100;
    }

    const taxableAmount = Math.max(0, baseAmount - discountAmount);
    const gstRate = Number(item.gstRate) || 0;
    const taxAmount = (taxableAmount * gstRate) / 100;
    const lineTotal = taxableAmount + taxAmount;

    subtotal += baseAmount;
    lineDiscountTotal += discountAmount;
    taxableTotal += taxableAmount;
    totalTax += taxAmount;

    return {
      product: item.product && mongoose.Types.ObjectId.isValid(item.product) ? item.product : undefined,
      name: (item.name || `Item ${idx + 1}`).trim(),
      description: (item.description || '').trim(),
      sku: (item.sku || '').trim(),
      hsn: (item.hsn || '').trim(),
      quantity: qty,
      unit: (item.unit || 'Units').trim(),
      unitPrice: Math.round(unitPrice * 100) / 100,
      discountType: item.discountType === 'amount' ? 'amount' : 'percentage',
      discountValue: discountVal,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      gstRate: gstRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
    };
  });

  const parsedOverallDiscount = Math.max(0, Number(overallDiscount) || 0);
  const parsedShipping = Math.max(0, Number(shippingCharges) || 0);
  const parsedAdditional = Math.max(0, Number(additionalCharges) || 0);

  const totalDiscount = Math.round((lineDiscountTotal + parsedOverallDiscount) * 100) / 100;
  const netTaxable = Math.max(0, taxableTotal - parsedOverallDiscount);

  // Check intra-state (MP to MP: CGST 50% + SGST 50%) vs inter-state (IGST 100%)
  const isIntraState =
    !buyerState ||
    buyerState.toLowerCase().trim() === 'madhya pradesh' ||
    buyerState.toLowerCase().trim() === 'mp';

  const cgstAmount = isIntraState ? Math.round((totalTax / 2) * 100) / 100 : 0;
  const sgstAmount = isIntraState ? Math.round((totalTax / 2) * 100) / 100 : 0;
  const igstAmount = isIntraState ? 0 : Math.round(totalTax * 100) / 100;

  const rawGrandTotal = netTaxable + totalTax + parsedShipping + parsedAdditional;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  // Advance calculation
  let computedAdvance = 0;
  const advPct = Math.min(100, Math.max(0, Number(advancePercentage) || 0));
  if (manualAdvanceAmount !== null && manualAdvanceAmount !== undefined && manualAdvanceAmount > 0) {
    computedAdvance = Math.min(grandTotal, Number(manualAdvanceAmount));
  } else if (advPct > 0) {
    computedAdvance = Math.round((grandTotal * advPct) / 100);
  }

  // Payment Tracking
  const totalPaid = existingPaymentRecords.reduce(
    (acc, p) => acc + (Math.max(0, Number(p.amount)) || 0),
    0
  );
  const roundedTotalPaid = Math.round(totalPaid * 100) / 100;
  const balanceDue = Math.max(0, Math.round((grandTotal - roundedTotalPaid) * 100) / 100);

  let paymentStatus = 'Unpaid';
  if (roundedTotalPaid >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (roundedTotalPaid > 0) {
    paymentStatus = 'Partially Paid';
  }

  return {
    items: validatedItems,
    summary: {
      subtotal: Math.round(subtotal * 100) / 100,
      lineDiscountTotal: Math.round(lineDiscountTotal * 100) / 100,
      overallDiscount: parsedOverallDiscount,
      totalDiscount,
      taxableAmount: Math.round(taxableTotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cgstAmount,
      sgstAmount,
      igstAmount,
      shippingCharges: parsedShipping,
      additionalCharges: parsedAdditional,
      roundOff,
      grandTotal,
      advancePercentage: advPct,
      advanceAmount: computedAdvance,
      totalPaid: roundedTotalPaid,
      balanceDue,
    },
    paymentStatus,
  };
};

/**
 * Generate sequential unique Proforma Number: PI-YYYY-XXXX
 */
export const generateNextProformaNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `PI-${currentYear}-`;

  const latestDoc = await ProformaInvoice.findOne({
    proformaNumber: new RegExp(`^${prefix}\\d+`, 'i'),
  })
    .sort({ proformaNumber: -1 })
    .lean();

  let nextSequence = 1;
  if (latestDoc && latestDoc.proformaNumber) {
    const parts = latestDoc.proformaNumber.split('-');
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
 * GET /api/proforma-invoices/next-number
 */
export const getNextProformaNumberHandler = async (req, res, next) => {
  try {
    const proformaNumber = await generateNextProformaNumber();
    res.status(200).json({
      success: true,
      proformaNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/proforma-invoices/clients
 * Fetch registered users / clients with address records for quick prefill
 */
export const getClientsHandler = async (req, res, next) => {
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

    const users = await User.find(filter)
      .select('name email phone addresses')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const formattedClients = users.map((u) => {
      const defaultAddr = (u.addresses || []).find((a) => a.isDefault) || u.addresses?.[0] || {};
      return {
        _id: u._id,
        name: u.name || 'Client',
        companyName: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        billingAddress: {
          fullName: defaultAddr.fullName || u.name || '',
          phone: defaultAddr.phone || u.phone || '',
          email: defaultAddr.email || u.email || '',
          addressLine1: defaultAddr.addressLine1 || '',
          addressLine2: defaultAddr.addressLine2 || '',
          landmark: defaultAddr.landmark || '',
          city: defaultAddr.city || 'Indore',
          state: defaultAddr.state || 'Madhya Pradesh',
          pincode: defaultAddr.pincode || '',
          country: defaultAddr.country || 'India',
        },
        shippingAddress: {
          fullName: defaultAddr.fullName || u.name || '',
          phone: defaultAddr.phone || u.phone || '',
          email: defaultAddr.email || u.email || '',
          addressLine1: defaultAddr.addressLine1 || '',
          addressLine2: defaultAddr.addressLine2 || '',
          landmark: defaultAddr.landmark || '',
          city: defaultAddr.city || 'Indore',
          state: defaultAddr.state || 'Madhya Pradesh',
          pincode: defaultAddr.pincode || '',
          country: defaultAddr.country || 'India',
        },
      };
    });

    res.status(200).json({
      success: true,
      clients: formattedClients,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/proforma-invoices/products
 * Fetch products from database for product picker
 */
export const getProductsHandler = async (req, res, next) => {
  try {
    const { search = '', limit = 100 } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { sku: { $regex: term, $options: 'i' } },
        { hsnCode: { $regex: term, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter)
      .select('name sku hsnCode salePrice mrp taxRate unit description')
      .limit(parseInt(limit, 10))
      .lean();

    const formatted = products.map((p) => {
      // Parse tax rate (e.g. "18%" or 18)
      let tax = 18;
      if (p.taxRate) {
        const parsed = parseFloat(String(p.taxRate).replace('%', ''));
        if (!isNaN(parsed)) tax = parsed;
      }

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku || '',
        hsn: p.hsnCode || '',
        unitPrice: p.salePrice || p.mrp || 0,
        gstRate: tax,
        unit: p.unit || 'Units',
        description: p.description || '',
      };
    });

    res.status(200).json({
      success: true,
      products: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/proforma-invoices
 * Paginated listing with search, date-range, and status filters
 */
export const getProformaInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = '',
      status = '',
      paymentStatus = '',
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Automatic expiration: if validity date has passed and document is Draft, Issued, or Sent
    const now = new Date();
    await ProformaInvoice.updateMany(
      {
        validUntil: { $lt: now },
        status: { $in: ['Draft', 'Issued', 'Sent'] },
      },
      {
        $set: { status: 'Expired' },
        $push: {
          auditLog: {
            action: 'Auto Expired',
            status: 'Expired',
            changedBy: 'System Cron/Trigger',
            details: 'Document validity date has elapsed.',
          },
        },
      }
    );

    // Search filter
    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { proformaNumber: { $regex: term, $options: 'i' } },
        { 'clientSnapshot.companyName': { $regex: term, $options: 'i' } },
        { 'clientSnapshot.contactPerson': { $regex: term, $options: 'i' } },
        { 'clientSnapshot.email': { $regex: term, $options: 'i' } },
        { 'clientSnapshot.phone': { $regex: term, $options: 'i' } },
        { 'referenceQuotation.quotationNumber': { $regex: term, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    // Date range filter on issueDate
    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) {
        filter.issueDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.issueDate.$lte = end;
      }
    }

    const [invoices, totalItems] = await Promise.all([
      ProformaInvoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProformaInvoice.countDocuments(filter),
    ]);

    // KPI Metrics for dashboard cards
    const [stats] = await ProformaInvoice.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] } },
          issued: { $sum: { $cond: [{ $eq: ['$status', 'Issued'] }, 1, 0] } },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'Sent'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'Expired'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          unpaidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Unpaid'] }, 1, 0] } },
          paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] } },
          totalValue: { $sum: '$summary.grandTotal' },
          totalBalanceDue: { $sum: '$summary.balanceDue' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
      },
      stats: stats || {
        total: 0,
        draft: 0,
        issued: 0,
        sent: 0,
        confirmed: 0,
        expired: 0,
        cancelled: 0,
        unpaidCount: 0,
        paidCount: 0,
        totalValue: 0,
        totalBalanceDue: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/proforma-invoices/:id
 */
export const getProformaInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let invoice;

    if (mongoose.Types.ObjectId.isValid(id)) {
      invoice = await ProformaInvoice.findById(id).lean();
    } else {
      invoice = await ProformaInvoice.findOne({ proformaNumber: id.toUpperCase() }).lean();
    }

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices
 * Create new Proforma Invoice (Draft or Issued)
 */
export const createProformaInvoice = async (req, res, next) => {
  try {
    const {
      proformaNumber: customNumber,
      issueDate,
      validUntil,
      client,
      clientSnapshot,
      referenceQuotation,
      referenceOrder,
      items,
      overallDiscount,
      shippingCharges,
      additionalCharges,
      advancePercentage,
      manualAdvanceAmount,
      currency,
      paymentTerms,
      deliveryTerms,
      notes,
      termsAndConditions,
      status = 'Draft',
    } = req.body;

    // Validate client details
    if (!clientSnapshot || !clientSnapshot.companyName || !clientSnapshot.phone || !clientSnapshot.email) {
      return res.status(400).json({
        success: false,
        message: 'Client company name, phone, and email are required.',
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientSnapshot.email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client email address format.',
      });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product item is required in the Proforma Invoice.',
      });
    }

    // Proforma number assignment & uniqueness
    let docNumber = customNumber && customNumber.trim() ? customNumber.trim().toUpperCase() : await generateNextProformaNumber();

    const existing = await ProformaInvoice.findOne({ proformaNumber: docNumber });
    if (existing) {
      // Re-generate if conflict
      docNumber = await generateNextProformaNumber();
    }

    const buyerState =
      clientSnapshot.billingAddress?.state ||
      clientSnapshot.shippingAddress?.state ||
      'Madhya Pradesh';

    // Strict backend recalculation
    const { items: validatedItems, summary, paymentStatus } = computeProformaFinancials(
      items,
      overallDiscount,
      shippingCharges,
      additionalCharges,
      advancePercentage,
      manualAdvanceAmount,
      buyerState,
      []
    );

    const validUntilDate = validUntil
      ? new Date(validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newInvoice = new ProformaInvoice({
      proformaNumber: docNumber,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      validUntil: validUntilDate,
      client: client && mongoose.Types.ObjectId.isValid(client) ? client : undefined,
      clientSnapshot: {
        ...clientSnapshot,
        companyName: clientSnapshot.companyName.trim(),
        phone: clientSnapshot.phone.trim(),
        email: clientSnapshot.email.trim().toLowerCase(),
      },
      referenceQuotation: {
        quotationNumber: referenceQuotation?.quotationNumber || '',
        quotationId: referenceQuotation?.quotationId || '',
        quotationDate: referenceQuotation?.quotationDate || null,
      },
      referenceOrder: {
        orderId: referenceOrder?.orderId && mongoose.Types.ObjectId.isValid(referenceOrder.orderId) ? referenceOrder.orderId : null,
        orderNumber: referenceOrder?.orderNumber || '',
      },
      items: validatedItems,
      summary,
      currency: currency || 'INR',
      paymentTerms: paymentTerms || '50% Advance with Purchase Order, 50% prior to dispatch',
      deliveryTerms: deliveryTerms || 'Door Delivery within 7-10 working days upon realization of advance payment',
      notes: notes || '',
      termsAndConditions: termsAndConditions || undefined,
      status: status === 'Issued' ? 'Issued' : 'Draft',
      paymentStatus,
      emailStatus: 'Not Sent',
      createdBy: {
        userId: req.user?.id || '',
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super-admin',
      },
      auditLog: [
        {
          action: status === 'Issued' ? 'Created and Issued' : 'Created as Draft',
          status: status === 'Issued' ? 'Issued' : 'Draft',
          paymentStatus,
          changedBy: req.user?.name || 'Super Admin',
          details: `Document #${docNumber} created with Grand Total ₹${summary.grandTotal}`,
        },
      ],
    });

    await newInvoice.save();

    res.status(201).json({
      success: true,
      message: `Proforma Invoice ${docNumber} successfully created.`,
      invoice: newInvoice,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A Proforma Invoice with this number already exists. Please use a unique number.',
      });
    }
    next(error);
  }
};

/**
 * PUT /api/proforma-invoices/:id
 * Update Draft Proforma Invoice. Non-drafts are locked from editing.
 */
export const updateProformaInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ProformaInvoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    if (invoice.status !== 'Draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit document in '${invoice.status}' status. Only Draft documents can be edited. To make revisions to issued or sent documents, duplicate the document.`,
      });
    }

    const {
      issueDate,
      validUntil,
      clientSnapshot,
      referenceQuotation,
      referenceOrder,
      items,
      overallDiscount,
      shippingCharges,
      additionalCharges,
      advancePercentage,
      manualAdvanceAmount,
      currency,
      paymentTerms,
      deliveryTerms,
      notes,
      termsAndConditions,
      status,
    } = req.body;

    if (clientSnapshot) {
      invoice.clientSnapshot = {
        ...invoice.clientSnapshot,
        ...clientSnapshot,
        email: clientSnapshot.email ? clientSnapshot.email.trim().toLowerCase() : invoice.clientSnapshot.email,
      };
    }

    if (issueDate) invoice.issueDate = new Date(issueDate);
    if (validUntil) invoice.validUntil = new Date(validUntil);
    if (currency) invoice.currency = currency;
    if (paymentTerms !== undefined) invoice.paymentTerms = paymentTerms;
    if (deliveryTerms !== undefined) invoice.deliveryTerms = deliveryTerms;
    if (notes !== undefined) invoice.notes = notes;
    if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;

    if (referenceQuotation) {
      invoice.referenceQuotation = {
        quotationNumber: referenceQuotation.quotationNumber || '',
        quotationId: referenceQuotation.quotationId || '',
        quotationDate: referenceQuotation.quotationDate || null,
      };
    }

    if (referenceOrder) {
      invoice.referenceOrder = {
        orderId: referenceOrder.orderId || null,
        orderNumber: referenceOrder.orderNumber || '',
      };
    }

    const buyerState =
      invoice.clientSnapshot.billingAddress?.state ||
      invoice.clientSnapshot.shippingAddress?.state ||
      'Madhya Pradesh';

    // Recalculate financial breakdown
    const itemsToCompute = items && Array.isArray(items) && items.length > 0 ? items : invoice.items;
    const { items: validatedItems, summary, paymentStatus } = computeProformaFinancials(
      itemsToCompute,
      overallDiscount !== undefined ? overallDiscount : invoice.summary.overallDiscount,
      shippingCharges !== undefined ? shippingCharges : invoice.summary.shippingCharges,
      additionalCharges !== undefined ? additionalCharges : invoice.summary.additionalCharges,
      advancePercentage !== undefined ? advancePercentage : invoice.summary.advancePercentage,
      manualAdvanceAmount,
      buyerState,
      invoice.paymentRecords
    );

    invoice.items = validatedItems;
    invoice.summary = summary;
    invoice.paymentStatus = paymentStatus;

    if (status === 'Issued') {
      invoice.status = 'Issued';
    }

    invoice.auditLog.push({
      action: 'Updated Draft',
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      changedBy: req.user?.name || 'Super Admin',
      details: 'Draft details and calculations updated.',
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Proforma Invoice ${invoice.proformaNumber} updated successfully.`,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices/:id/send-email
 * Send PDF via Email and record audit log and historical snapshot.
 */
export const sendProformaEmailHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipientEmail, recipientName, emailSubject, emailBody, pdfBase64 } = req.body;

    const invoice = await ProformaInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    if (invoice.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send a cancelled Proforma Invoice.',
      });
    }

    const targetEmail = (recipientEmail || invoice.clientSnapshot.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!targetEmail || !emailRegex.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        message: `Invalid recipient email address: "${targetEmail}".`,
      });
    }

    invoice.emailStatus = 'Sending';
    await invoice.save();

    const formattedIssueDate = new Date(invoice.issueDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedValidDate = new Date(invoice.validUntil).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Execute SMTP delivery
    const result = await sendProformaInvoiceEmail({
      proformaNumber: invoice.proformaNumber,
      recipientEmail: targetEmail,
      recipientName: (recipientName || invoice.clientSnapshot.contactPerson || invoice.clientSnapshot.companyName).trim(),
      companyName: invoice.clientSnapshot.companyName,
      emailSubject: (emailSubject || `Proforma Invoice #${invoice.proformaNumber} — ${invoice.clientSnapshot.companyName}`).trim(),
      emailBody: emailBody || '',
      grandTotal: invoice.summary.grandTotal,
      advanceRequired: invoice.summary.advanceAmount,
      balanceDue: invoice.summary.balanceDue,
      issueDate: formattedIssueDate,
      validUntil: formattedValidDate,
      bankDetails: invoice.issuingCompany.bankDetails,
      pdfAttachmentBase64: pdfBase64 || null,
      pdfFileName: `Proforma_Invoice_${invoice.proformaNumber}.pdf`,
    });

    const emailHistoryEntry = {
      recipientEmail: targetEmail,
      recipientName: recipientName || invoice.clientSnapshot.contactPerson || '',
      subject: emailSubject || `Proforma Invoice #${invoice.proformaNumber}`,
      sentAt: new Date(),
      status: result.success ? 'Sent' : 'Failed',
      messageId: result.messageId || '',
      errorDetails: result.error || '',
      sentBy: {
        userId: req.user?.id || '',
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super-admin',
      },
    };

    invoice.emailHistory.push(emailHistoryEntry);

    if (result.success) {
      invoice.emailStatus = 'Sent';

      // Transition document status from Draft/Issued to Sent
      if (invoice.status === 'Draft' || invoice.status === 'Issued') {
        invoice.status = 'Sent';
      }

      // Preserve historical snapshot of the exact sent version
      const snapshotVersion = invoice.historicalSnapshots.length + 1;
      invoice.historicalSnapshots.push({
        version: snapshotVersion,
        capturedAt: new Date(),
        reason: `Email Sent to ${targetEmail}`,
        snapshotData: {
          proformaNumber: invoice.proformaNumber,
          issueDate: invoice.issueDate,
          validUntil: invoice.validUntil,
          clientSnapshot: invoice.clientSnapshot,
          items: invoice.items,
          summary: invoice.summary,
          paymentTerms: invoice.paymentTerms,
          deliveryTerms: invoice.deliveryTerms,
          notes: invoice.notes,
          termsAndConditions: invoice.termsAndConditions,
        },
      });

      invoice.auditLog.push({
        action: 'Email Sent',
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        changedBy: req.user?.name || 'Super Admin',
        details: `Dispatched email to ${targetEmail} (messageId: ${result.messageId})`,
      });

      await invoice.save();

      return res.status(200).json({
        success: true,
        message: `Proforma Invoice #${invoice.proformaNumber} successfully sent to ${targetEmail}.`,
        messageId: result.messageId,
        invoice,
      });
    } else {
      invoice.emailStatus = 'Failed';
      invoice.auditLog.push({
        action: 'Email Delivery Failed',
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        changedBy: req.user?.name || 'Super Admin',
        details: `SMTP rejected message: ${result.error}`,
      });
      await invoice.save();

      return res.status(500).json({
        success: false,
        message: result.error
          ? `Email delivery failed: ${result.error}`
          : 'Email delivery failed. Please verify your SMTP server configuration.',
        invoice,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices/:id/record-confirmation
 * Manually record client purchase order / commercial confirmation
 */
export const recordConfirmationHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { poNumber, confirmedBy, confirmedAt, expectedPaymentDate, notes } = req.body;

    const invoice = await ProformaInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    if (invoice.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot record confirmation on a cancelled document.',
      });
    }

    invoice.confirmation = {
      isConfirmed: true,
      confirmedAt: confirmedAt ? new Date(confirmedAt) : new Date(),
      confirmedBy: (confirmedBy || invoice.clientSnapshot.contactPerson || 'Client Authorized Representative').trim(),
      poNumber: (poNumber || '').trim(),
      expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate) : null,
      notes: (notes || '').trim(),
      recordedBy: {
        userId: req.user?.id || '',
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super-admin',
      },
    };

    if (invoice.status !== 'Converted to Invoice') {
      invoice.status = 'Confirmed';
    }

    invoice.auditLog.push({
      action: 'Client Confirmation Recorded',
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      changedBy: req.user?.name || 'Super Admin',
      details: `PO Reference: ${poNumber || 'Confirmed without PO'} by ${confirmedBy || 'Client'}`,
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Client confirmation recorded successfully for #${invoice.proformaNumber}.`,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices/:id/record-payment
 * Manually record verified payment transaction (e.g. advance, milestone, or full payment)
 */
export const recordPaymentHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentType, paymentMethod, referenceNumber, bankName, notes } = req.body;

    const invoice = await ProformaInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    if (invoice.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot record payments on a cancelled document.',
      });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero.',
      });
    }

    const newPaymentRecord = {
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amount: Math.round(payAmount * 100) / 100,
      paymentType: paymentType || 'Advance',
      paymentMethod: paymentMethod || 'NEFT/RTGS',
      referenceNumber: (referenceNumber || '').trim(),
      bankName: (bankName || '').trim(),
      notes: (notes || '').trim(),
      recordedBy: {
        userId: req.user?.id || '',
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super-admin',
      },
    };

    invoice.paymentRecords.push(newPaymentRecord);

    // Recalculate totalPaid and balanceDue
    const totalPaid = invoice.paymentRecords.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const grandTotal = invoice.summary.grandTotal;
    const roundedTotalPaid = Math.round(totalPaid * 100) / 100;
    const balanceDue = Math.max(0, Math.round((grandTotal - roundedTotalPaid) * 100) / 100);

    invoice.summary.totalPaid = roundedTotalPaid;
    invoice.summary.balanceDue = balanceDue;

    if (roundedTotalPaid >= grandTotal && grandTotal > 0) {
      invoice.paymentStatus = 'Paid';
    } else if (roundedTotalPaid > 0) {
      invoice.paymentStatus = 'Partially Paid';
    } else {
      invoice.paymentStatus = 'Unpaid';
    }

    invoice.auditLog.push({
      action: 'Payment Recorded',
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      changedBy: req.user?.name || 'Super Admin',
      details: `Received ₹${payAmount} via ${paymentMethod || 'NEFT/RTGS'} (Ref: ${referenceNumber || 'N/A'}). Balance: ₹${balanceDue}`,
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Payment of ₹${payAmount} successfully recorded.`,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices/:id/cancel
 * Cancel Proforma Invoice with audit reason
 */
export const cancelProformaInvoiceHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await ProformaInvoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    if (invoice.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This document is already cancelled.',
      });
    }

    if (invoice.status === 'Converted to Invoice') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a Proforma Invoice that has already been converted to a Tax Invoice.',
      });
    }

    invoice.status = 'Cancelled';
    invoice.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: {
        userId: req.user?.id || '',
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super-admin',
      },
      reason: (reason || 'Cancelled by Super Admin').trim(),
    };

    invoice.auditLog.push({
      action: 'Cancelled',
      status: 'Cancelled',
      paymentStatus: invoice.paymentStatus,
      changedBy: req.user?.name || 'Super Admin',
      details: `Document cancelled. Reason: ${reason || 'Not specified'}`,
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: `Proforma Invoice #${invoice.proformaNumber} has been cancelled.`,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices/:id/duplicate
 * Duplicate an existing Proforma Invoice into a new Draft
 */
export const duplicateProformaInvoiceHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const source = await ProformaInvoice.findById(id).lean();

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source Proforma Invoice not found.',
      });
    }

    const nextDocNumber = await generateNextProformaNumber();
    const today = new Date();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const duplicated = new ProformaInvoice({
      ...source,
      _id: undefined,
      proformaNumber: nextDocNumber,
      issueDate: today,
      validUntil,
      status: 'Draft',
      paymentStatus: 'Unpaid',
      emailStatus: 'Not Sent',
      emailHistory: [],
      confirmation: {
        isConfirmed: false,
        confirmedAt: null,
        confirmedBy: '',
        poNumber: '',
        expectedPaymentDate: null,
        notes: '',
      },
      paymentRecords: [],
      conversion: {
        isConverted: false,
        convertedAt: null,
        invoiceNumber: '',
      },
      cancellation: {
        cancelledAt: null,
        reason: '',
      },
      historicalSnapshots: [],
      summary: {
        ...source.summary,
        totalPaid: 0,
        balanceDue: source.summary.grandTotal,
      },
      notes: `${source.notes ? source.notes + ' ' : ''}(Duplicated from ${source.proformaNumber})`,
      createdBy: {
        userId: req.user?.id || '',
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super-admin',
      },
      auditLog: [
        {
          action: 'Duplicated from ' + source.proformaNumber,
          status: 'Draft',
          paymentStatus: 'Unpaid',
          changedBy: req.user?.name || 'Super Admin',
          details: `Duplicated as new draft #${nextDocNumber}`,
        },
      ],
    });

    await duplicated.save();

    res.status(201).json({
      success: true,
      message: `Duplicated as new draft #${nextDocNumber}.`,
      invoice: duplicated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/proforma-invoices/:id/convert-to-invoice
 * Convert to actual tax invoice if invoice system exists; prevents duplicate conversion
 */
export const convertToInvoiceHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await ProformaInvoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Proforma Invoice not found.',
      });
    }

    if (invoice.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot convert a cancelled Proforma Invoice.',
      });
    }

    if (invoice.conversion?.isConverted) {
      return res.status(400).json({
        success: false,
        message: `This Proforma Invoice was already converted to Tax Invoice #${invoice.conversion.invoiceNumber || 'INV'} on ${new Date(invoice.conversion.convertedAt).toLocaleDateString('en-IN')}. Duplicate conversion is prevented.`,
      });
    }

    // Check if an actual Tax Invoice module exists in the application
    // Since the application does not currently have an active Tax Invoice module,
    // we clearly report that conversion requires a dedicated Tax Invoice workflow.
    return res.status(422).json({
      success: false,
      message: 'Conversion requires a separate Tax Invoice workflow. The application does not currently have an active Tax Invoice module. Proforma invoices are preliminary commercial documents and cannot be used as tax invoices under GST law.',
      requiresTaxInvoiceModule: true,
    });
  } catch (error) {
    next(error);
  }
};

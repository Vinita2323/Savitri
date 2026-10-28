import mongoose from 'mongoose';

const proformaItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  sku: {
    type: String,
    default: '',
    trim: true,
  },
  hsn: {
    type: String,
    default: '',
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  unit: {
    type: String,
    default: 'Units',
    trim: true,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'amount'],
    default: 'percentage',
  },
  discountValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  taxableAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  gstRate: {
    type: Number,
    default: 18,
    min: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lineTotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const paymentRecordSchema = new mongoose.Schema({
  paymentDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  paymentType: {
    type: String,
    enum: ['Advance', 'Milestone', 'Full', 'Balance', 'Part Payment'],
    default: 'Advance',
  },
  paymentMethod: {
    type: String,
    enum: ['NEFT/RTGS', 'Bank Transfer', 'Cheque', 'UPI', 'Cash', 'Credit Card', 'Other'],
    default: 'NEFT/RTGS',
  },
  referenceNumber: {
    type: String,
    default: '',
    trim: true,
  },
  bankName: {
    type: String,
    default: '',
    trim: true,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  recordedBy: {
    userId: { type: String, default: '' },
    name: { type: String, default: 'Super Admin' },
    role: { type: String, default: 'super-admin' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const emailHistorySchema = new mongoose.Schema({
  recipientEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  recipientName: {
    type: String,
    default: '',
    trim: true,
  },
  subject: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Sent', 'Failed'],
    required: true,
  },
  messageId: {
    type: String,
    default: '',
  },
  errorDetails: {
    type: String,
    default: '',
  },
  sentBy: {
    userId: { type: String, default: '' },
    name: { type: String, default: 'Super Admin' },
    role: { type: String, default: 'super-admin' },
  },
});

const proformaInvoiceSchema = new mongoose.Schema(
  {
    proformaNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },

    // Client / Buyer Linkage
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    clientSnapshot: {
      companyName: { type: String, required: true, trim: true },
      contactPerson: { type: String, default: '', trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      gstin: { type: String, default: '', trim: true, uppercase: true },
      pan: { type: String, default: '', trim: true, uppercase: true },
      billingAddress: {
        fullName: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        addressLine1: { type: String, default: '' },
        addressLine2: { type: String, default: '' },
        landmark: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: 'Madhya Pradesh' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' },
      },
      shippingAddress: {
        fullName: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        addressLine1: { type: String, default: '' },
        addressLine2: { type: String, default: '' },
        landmark: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: 'Madhya Pradesh' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' },
      },
    },

    // Issuing Company Information (Savitri B2B)
    issuingCompany: {
      name: { type: String, default: 'SAVITRI B2B ENTERPRISE' },
      legalName: { type: String, default: 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform' },
      address: { type: String, default: 'Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015' },
      phone: { type: String, default: '+91 731 498 7720' },
      email: { type: String, default: 'billing@savitri.com' },
      gstin: { type: String, default: '23AAACS9981K1ZP' },
      pan: { type: String, default: 'AAACS9981K' },
      cin: { type: String, default: 'U74999MP2025PTC049102' },
      fssai: { type: String, default: '11425850000122' },
      bankDetails: {
        bankName: { type: String, default: 'HDFC Bank Ltd.' },
        accountName: { type: String, default: 'Savitri Enterprise B2B Solutions' },
        accountNumber: { type: String, default: '50200088921473' },
        ifscCode: { type: String, default: 'HDFC0001248' },
        branch: { type: String, default: 'Sanwer Road Industrial Area, Indore' },
        upiId: { type: String, default: 'savitrient@hdfcbank' },
      },
    },

    // References
    referenceQuotation: {
      quotationNumber: { type: String, default: '', trim: true, index: true },
      quotationId: { type: String, default: '', trim: true },
      quotationDate: { type: Date, default: null },
    },
    referenceOrder: {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
      orderNumber: { type: String, default: '', trim: true },
    },

    // Itemized Products
    items: [proformaItemSchema],

    // Calculations & Pricing Breakdown
    summary: {
      subtotal: { type: Number, required: true, default: 0 },
      lineDiscountTotal: { type: Number, default: 0 },
      overallDiscount: { type: Number, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      taxableAmount: { type: Number, required: true, default: 0 },
      totalTax: { type: Number, required: true, default: 0 },
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0 },
      shippingCharges: { type: Number, default: 0 },
      additionalCharges: { type: Number, default: 0 },
      roundOff: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true, default: 0 },
      advancePercentage: { type: Number, default: 50, min: 0, max: 100 },
      advanceAmount: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      balanceDue: { type: Number, default: 0 },
    },

    currency: {
      type: String,
      default: 'INR',
    },

    // Commercial Terms
    paymentTerms: {
      type: String,
      default: '50% Advance with Purchase Order, 50% prior to dispatch',
    },
    deliveryTerms: {
      type: String,
      default: 'Door Delivery within 7-10 working days upon realization of advance payment',
    },
    notes: {
      type: String,
      default: 'Thank you for your commercial inquiry. Please remit the advance payment using the bank details provided below to initiate order procurement and priority allocation.',
    },
    termsAndConditions: {
      type: String,
      default: '1. This is a Proforma Invoice and represents a commercial quotation / preliminary demand note. It is NOT a tax invoice under Section 31 of CGST Act, 2017.\n2. Goods allocation and dispatch will be initiated strictly upon receipt of advance payment.\n3. Quoted prices and tax rates are firm until the validity date indicated above.\n4. Official GST Tax Invoice will be issued upon dispatch of goods.\n5. Jurisdiction: Subject to Indore (MP) courts only.',
    },

    // Status Management
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Sent', 'Confirmed', 'Expired', 'Converted to Invoice', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
      index: true,
    },
    emailStatus: {
      type: String,
      enum: ['Not Sent', 'Sending', 'Sent', 'Failed'],
      default: 'Not Sent',
      index: true,
    },

    // Email Communication Audit Log
    emailHistory: [emailHistorySchema],

    // Client Confirmation Record
    confirmation: {
      isConfirmed: { type: Boolean, default: false },
      confirmedAt: { type: Date, default: null },
      confirmedBy: { type: String, default: '' },
      poNumber: { type: String, default: '', trim: true },
      expectedPaymentDate: { type: Date, default: null },
      notes: { type: String, default: '' },
      recordedBy: {
        userId: { type: String, default: '' },
        name: { type: String, default: '' },
        role: { type: String, default: '' },
      },
    },

    // Verified Payment Transactions
    paymentRecords: [paymentRecordSchema],

    // Conversion Reference
    conversion: {
      isConverted: { type: Boolean, default: false },
      convertedAt: { type: Date, default: null },
      invoiceNumber: { type: String, default: '' },
      invoiceId: { type: String, default: '' },
      notes: { type: String, default: '' },
      convertedBy: {
        userId: { type: String, default: '' },
        name: { type: String, default: '' },
        role: { type: String, default: '' },
      },
    },

    // Cancellation Record
    cancellation: {
      cancelledAt: { type: Date, default: null },
      cancelledBy: {
        userId: { type: String, default: '' },
        name: { type: String, default: '' },
        role: { type: String, default: '' },
      },
      reason: { type: String, default: '' },
    },

    // Historical Snapshots (Preserves frozen document data whenever sent to client)
    historicalSnapshots: [
      {
        version: { type: Number, default: 1 },
        capturedAt: { type: Date, default: Date.now },
        reason: { type: String, default: 'Email Sent' },
        snapshotData: { type: mongoose.Schema.Types.Mixed },
      },
    ],

    // Creator & Audit Trail
    createdBy: {
      userId: { type: String, default: '' },
      name: { type: String, default: 'Super Admin' },
      role: { type: String, default: 'super-admin' },
    },

    auditLog: [
      {
        action: { type: String, required: true },
        status: { type: String, default: '' },
        paymentStatus: { type: String, default: '' },
        changedBy: { type: String, default: 'Super Admin' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High performance query indexes
proformaInvoiceSchema.index({ client: 1, createdAt: -1 });
proformaInvoiceSchema.index({ status: 1, createdAt: -1 });
proformaInvoiceSchema.index({ paymentStatus: 1, createdAt: -1 });
proformaInvoiceSchema.index({ issueDate: -1 });
proformaInvoiceSchema.index({ validUntil: 1 });
proformaInvoiceSchema.index({ createdAt: -1 });
proformaInvoiceSchema.index({ 'clientSnapshot.companyName': 1 });

const ProformaInvoice = mongoose.model('ProformaInvoice', proformaInvoiceSchema);
export default ProformaInvoice;

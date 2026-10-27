import mongoose from 'mongoose';

const challanItemSchema = new mongoose.Schema({
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
  sku: {
    type: String,
    default: '',
    trim: true,
  },
  variantSku: {
    type: String,
    default: '',
    trim: true,
  },
  variantTitle: {
    type: String,
    default: '',
    trim: true,
  },
  hsn: {
    type: String,
    default: '',
    trim: true,
  },
  unit: {
    type: String,
    default: 'Units',
    trim: true,
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  orderedQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  previouslyDispatchedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  dispatchedQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  remainingQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
});

const deliveryChallanSchema = new mongoose.Schema(
  {
    challanNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    challanDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    dispatchDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    // Client / Buyer
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientSnapshot: {
      name: { type: String, required: true },
      companyName: { type: String, default: '' },
      phone: { type: String, required: true },
      email: { type: String, default: '' },
      gstin: { type: String, default: '' },
      billingAddress: {
        fullName: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        addressLine1: { type: String, default: '' },
        addressLine2: { type: String, default: '' },
        landmark: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
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
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' },
      },
    },

    // Issuing Company (Savitri B2B)
    issuingCompany: {
      name: { type: String, default: 'SAVITRI B2B ENTERPRISE' },
      legalName: { type: String, default: 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform' },
      address: { type: String, default: 'Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015' },
      phone: { type: String, default: '+91 731 498 7720' },
      email: { type: String, default: 'dispatch@savitri.com' },
      gstin: { type: String, default: '23AAACS9981K1ZP' },
      cin: { type: String, default: 'U74999MP2025PTC049102' },
      fssai: { type: String, default: '11425850000122' },
    },

    // Linked Order
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    orderGrandTotal: {
      type: Number,
      default: 0,
    },

    // Goods / Items
    items: [challanItemSchema],
    totalDispatchedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 1,
    },

    // Transport & Logistics
    transportDetails: {
      transporterName: { type: String, default: '' },
      vehicleNumber: { type: String, default: '' },
      lrNumber: { type: String, default: '' },
      lrDate: { type: Date, default: null },
      ewayBillNumber: { type: String, default: '' },
      driverName: { type: String, default: '' },
      driverPhone: { type: String, default: '' },
    },

    // Purpose of Delivery Challan
    purpose: {
      type: String,
      enum: [
        'Supply on Sale',
        'Job Work',
        'Exhibition / Demo',
        'For Approval',
        'Transfer / Shift',
        'Replacement',
        'Returnable',
        'Others',
      ],
      default: 'Supply on Sale',
    },

    shippingNotes: {
      type: String,
      default: '',
    },
    termsAndConditions: {
      type: String,
      default: '1. Goods dispatched are under delivery challan as per Rule 55 of CGST Rules, 2017.\n2. Please verify goods description, seal, and quantities upon delivery.\n3. Discrepancies must be endorsed on this challan copy and notified within 24 hours.',
    },

    // Lifecycle Status
    status: {
      type: String,
      enum: ['Draft', 'Dispatched', 'Partially Delivered', 'Delivered', 'Cancelled'],
      default: 'Draft',
      index: true,
    },

    // Delivery confirmation
    deliveryDetails: {
      receivedBy: { type: String, default: '' },
      receivedDate: { type: Date, default: null },
      receiverRemarks: { type: String, default: '' },
      receiverPhone: { type: String, default: '' },
    },

    // Cancellation
    cancellation: {
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: String, default: '' },
      reason: { type: String, default: '' },
    },

    // Creator & Audit Trail
    createdBy: {
      userId: { type: String, default: '' },
      name: { type: String, default: 'Administrator' },
      role: { type: String, default: 'admin' },
    },
    auditHistory: [
      {
        status: { type: String, required: true },
        action: { type: String, required: true },
        changedBy: { type: String, default: 'System' },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Targeted query indexes
deliveryChallanSchema.index({ client: 1, createdAt: -1 });
deliveryChallanSchema.index({ order: 1, createdAt: -1 });
deliveryChallanSchema.index({ status: 1, createdAt: -1 });
deliveryChallanSchema.index({ challanDate: -1 });
deliveryChallanSchema.index({ createdAt: -1 });

const DeliveryChallan = mongoose.model('DeliveryChallan', deliveryChallanSchema);
export default DeliveryChallan;

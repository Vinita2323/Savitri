import mongoose from 'mongoose';

const posSaleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  barcode: { type: String, default: '' },
  hsnCode: { type: String, default: '' },
  image: { type: String, default: '' },
  unit: { type: String, default: '1 pc' },
  mrp: { type: Number, default: 0 },
  salePrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 }, // e.g., 5, 12, 18
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
  variantSku: { type: String, default: '' },
  variantTitle: { type: String, default: '' },
});

const posSaleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    saleType: {
      type: String,
      enum: ['COUNTER_SALE', 'DELIVERY_ORDER'],
      default: 'COUNTER_SALE',
      index: true,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'HELD', 'DRAFT', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    store: {
      storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
      storeName: { type: String, required: true, default: 'Central Store' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      gstin: { type: String, default: '' },
    },
    customer: {
      isWalkIn: { type: Boolean, default: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      name: { type: String, default: 'Walk-in Customer' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      shippingAddress: {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
      },
    },
    items: [posSaleItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    itemDiscountsTotal: { type: Number, default: 0 },
    billDiscountPercent: { type: Number, default: 0 },
    billDiscountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    payment: {
      method: {
        type: String,
        enum: ['CASH', 'UPI', 'CARD', 'NETBANKING', 'COD', 'WALLET', 'SPLIT'],
        default: 'CASH',
      },
      status: {
        type: String,
        enum: ['PAID', 'PARTIAL', 'PENDING', 'FAILED'],
        default: 'PAID',
      },
      amountReceived: { type: Number, default: 0 },
      changeReturned: { type: Number, default: 0 },
      balanceDue: { type: Number, default: 0 },
      referenceNumber: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    deliverySlot: {
      date: { type: String, default: 'Today' },
      time: { type: String, default: 'Standard Delivery' },
    },
    orderId: { type: String, default: null, index: true }, // if DELIVERY_ORDER
    orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    heldLabel: { type: String, default: '' },
    heldAt: { type: Date, default: null },
    createdBy: {
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: 'Super Admin' },
    },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

posSaleSchema.index({ createdAt: -1 });
posSaleSchema.index({ 'store.storeId': 1, createdAt: -1 });
posSaleSchema.index({ 'customer.phone': 1 });

const PosSale = mongoose.model('PosSale', posSaleSchema);
export default PosSale;

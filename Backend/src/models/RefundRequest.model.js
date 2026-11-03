import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userPhone: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'],
      default: 'REQUESTED',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: '',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    gatewayRefundId: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    // How the money goes back to the customer.
    //  RAZORPAY - refunded through the gateway (Razorpay refund API); completed ONLY by Razorpay's own
    //             processed confirmation, never by an admin typing a reference.
    //  MANUAL   - paid outside the gateway (COD / bank transfer); admin records the payment.
    //  WALLET   - credited to the customer's in-app wallet (item returns); no money leaves the company.
    refundMode: { type: String, enum: ['RAZORPAY', 'MANUAL', 'WALLET'], default: 'MANUAL', index: true },
    source: { type: String, enum: ['CUSTOMER_RETURN', 'ITEM_RETURN', 'GATEWAY_DASHBOARD'], default: 'CUSTOMER_RETURN' },
    gatewayRefund: {
      razorpayPaymentId: { type: String, default: '' },
      razorpayRefundId: { type: String, default: '', index: true },
      status: { type: String, enum: ['', 'initiating', 'initiated', 'processed', 'failed'], default: '' },
      amountPaise: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 },
      initiatedAt: { type: Date },
      processedAt: { type: Date },
      failureReason: { type: String, default: '' },
      initiatedBy: { id: String, email: String, role: String },
    },
    treasuryAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', default: null },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

refundRequestSchema.index({ orderId: 1, createdAt: -1 });
refundRequestSchema.index({ userId: 1, createdAt: -1 });
refundRequestSchema.index({ status: 1, createdAt: -1 });
refundRequestSchema.index({ createdAt: -1 });

const RefundRequest = mongoose.model('RefundRequest', refundRequestSchema);
export default RefundRequest;

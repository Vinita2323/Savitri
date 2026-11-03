import mongoose from 'mongoose';

/**
 * One document per Razorpay payment (money collected from a customer by the gateway).
 * It is the payment audit trail: identifiers, gateway state and every verification / webhook event
 * that touched the payment. Created only from server-verified data (payment fetched from Razorpay
 * or a signature-verified webhook) - never from a frontend "payment succeeded" message.
 */
const auditSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    source: { type: String, enum: ['VERIFY', 'WEBHOOK', 'SYNC', 'SYSTEM'], default: 'SYSTEM' },
    event: { type: String, default: '' },
    eventId: { type: String, default: '' },
    status: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const gatewayPaymentSchema = new mongoose.Schema(
  {
    razorpayPaymentId: { type: String, required: true },
    razorpayOrderId: { type: String, default: '', index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    orderNumber: { type: String, default: '', index: true },
    brandId: { type: String, default: '', index: true },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, default: '' },
    status: {
      type: String,
      enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
      default: 'created',
      index: true,
    },
    capturedAt: { type: Date },
    failedAt: { type: Date },
    failureCode: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    // Fee and tax as reported by Razorpay on the payment entity (informational; the settlement is the source of truth)
    reportedFeePaise: { type: Number, default: null },
    reportedTaxPaise: { type: Number, default: null },
    refundedPaise: { type: Number, default: 0, min: 0 }, // refunds Razorpay has PROCESSED
    refundPendingPaise: { type: Number, default: 0, min: 0 }, // refunds initiated and not yet processed
    settlementId: { type: String, default: '', index: true },
    captureEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    audit: { type: [auditSchema], default: [] },
  },
  { timestamps: true }
);

gatewayPaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true });

export default mongoose.model('GatewayPayment', gatewayPaymentSchema);

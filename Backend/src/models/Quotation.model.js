import mongoose from 'mongoose';

export const QUOTATION_STATUSES = [
  'Draft',
  'Ready to Send',
  'Sent',
  'Under Review',
  'Revision Requested',
  'Accepted',
  'Rejected',
  'Expired',
  'Cancelled',
  'Converted to Order',
];

/** Allowed status moves. Terminal statuses have no outgoing moves (use "duplicate" to start over). */
export const QUOTATION_TRANSITIONS = {
  Draft: ['Ready to Send', 'Sent', 'Cancelled'],
  'Ready to Send': ['Draft', 'Sent', 'Cancelled'],
  Sent: ['Under Review', 'Revision Requested', 'Accepted', 'Rejected', 'Expired', 'Cancelled'],
  'Under Review': ['Revision Requested', 'Accepted', 'Rejected', 'Expired', 'Cancelled'],
  'Revision Requested': ['Sent', 'Accepted', 'Rejected', 'Expired', 'Cancelled'],
  Accepted: ['Converted to Order', 'Cancelled'],
  Rejected: [],
  Expired: [],
  Cancelled: [],
  'Converted to Order': [],
};

const emailLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    recipientEmail: { type: String, default: '' },
    subject: { type: String, default: '' },
    success: { type: Boolean, default: false },
    error: { type: String, default: null },
    messageId: { type: String, default: null },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    // Brand the quotation belongs to (set from the validated brand scope, never from the client).
    brandId: { type: String, required: true, index: true, trim: true },
    quotationNumber: { type: String, required: true, unique: true, trim: true },

    quotationDate: { type: String, default: '' },
    validUntil: { type: String, default: '' },
    quotationType: { type: String, default: 'Government', trim: true },
    referenceNumber: { type: String, default: '', trim: true },
    subject: { type: String, default: '', trim: true },
    assignedSeller: { type: String, default: '', trim: true },

    status: { type: String, enum: QUOTATION_STATUSES, default: 'Draft', index: true },
    originatingRequestId: { type: String, default: null },

    // Commercial document body (shape owned by the quotation builder UI).
    buyer: { type: mongoose.Schema.Types.Mixed, default: {} },
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    commercialTerms: { type: mongoose.Schema.Types.Mixed, default: {} },
    governmentInfo: { type: mongoose.Schema.Types.Mixed, default: null },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    termsAndConditions: { type: mongoose.Schema.Types.Mixed, default: '' },
    internalNotes: { type: String, default: '' },

    grandTotal: { type: Number, default: 0, index: true }, // denormalised from summary for queries
    buyerName: { type: String, default: '', index: true }, // denormalised for search

    emailStatus: { type: String, enum: ['Not Sent', 'Sending', 'Sent', 'Failed'], default: 'Not Sent' },
    emailLog: { type: [emailLogSchema], default: [] },
    sentAt: { type: Date, default: null },
    lastEmailSentAt: { type: Date, default: null },

    cancellationReason: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    purchaseOrderNumber: { type: String, default: '' },
    convertedAt: { type: Date, default: null },

    createdBy: {
      id: { type: String, default: '' },
      email: { type: String, default: '' },
      role: { type: String, default: '' },
    },
    updatedBy: {
      id: { type: String, default: '' },
      email: { type: String, default: '' },
      role: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

quotationSchema.index({ brandId: 1, createdAt: -1 });
quotationSchema.index({ brandId: 1, status: 1 });

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;

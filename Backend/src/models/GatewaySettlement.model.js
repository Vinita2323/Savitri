import mongoose from 'mongoose';

/**
 * A Razorpay settlement: a batch payout of collected funds (minus fees, tax and refunds) to the company
 * bank account. Created ONLY from Razorpay data (settlement.processed webhook or the settlements API),
 * never inferred from the fact that payments were captured.
 *
 * Amount model (all paise, as reported by Razorpay):
 *   netPaise   - the amount actually sent to the bank   (settlement.amount)
 *   feePaise   - total fees deducted, tax included       (settlement.fees)
 *   taxPaise   - the tax part of feePaise                (settlement.tax)
 *   clearing released = netPaise + feePaise   (= payments settled minus refunds / adjustments deducted)
 */
const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['payment', 'refund', 'adjustment', 'other'], default: 'other' },
    entityId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    amountPaise: { type: Number, default: 0 }, // gross for payments / refunds
    feePaise: { type: Number, default: 0 }, // fee including tax
    taxPaise: { type: Number, default: 0 },
    brandId: { type: String, default: '' },
  },
  { _id: false }
);

const gatewaySettlementSchema = new mongoose.Schema(
  {
    razorpaySettlementId: { type: String, required: true },
    status: { type: String, enum: ['created', 'processed', 'failed'], default: 'created', index: true },
    settledAt: { type: Date, index: true },
    utr: { type: String, default: '', index: true }, // bank reference number
    netPaise: { type: Number, required: true, min: 0 },
    feePaise: { type: Number, default: 0, min: 0 },
    taxPaise: { type: Number, default: 0, min: 0 },
    grossPaise: { type: Number, default: 0 }, // payments in this settlement (itemized only)
    refundPaise: { type: Number, default: 0 }, // refunds deducted (itemized only)
    adjustmentPaise: { type: Number, default: 0 },
    itemized: { type: Boolean, default: false },
    items: { type: [itemSchema], default: [] },
    brandBreakdown: [{ _id: false, brandId: String, clearingPaise: Number, feePaise: Number }],
    destinationAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', default: null },
    brandId: { type: String, default: '', index: true }, // brand of the destination account (or MULTI / unassigned)
    postedEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    postedAt: { type: Date },
    reconStatus: { type: String, enum: ['PENDING', 'MATCHED', 'PARTIAL', 'DISCREPANCY'], default: 'PENDING', index: true },
    matchedStatementId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankStatementEntry', default: null },
    discrepancyPaise: { type: Number, default: 0 },
    discrepancyNote: { type: String, default: '' },
    source: { type: String, enum: ['WEBHOOK', 'SYNC'], default: 'WEBHOOK' },
    postedBy: { id: String, email: String, role: String },
  },
  { timestamps: true }
);

gatewaySettlementSchema.index({ razorpaySettlementId: 1 }, { unique: true });

export default mongoose.model('GatewaySettlement', gatewaySettlementSchema);

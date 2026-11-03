import mongoose from 'mongoose';

/**
 * A movement that arrived from OUTSIDE the ledger and is waiting to be matched or allocated.
 * This is what the Cash and Bank screen calls "Unlinked Transactions":
 *   - bank statement lines entered or imported by an admin (used to reconcile Razorpay settlements)
 *   - payouts marked paid, COD cash collections and POS takings that still need a treasury account
 *
 * A statement line is EVIDENCE, not an accounting entry. Matching it to a settlement posts nothing
 * (the settlement already produced the bank credit), so money is never counted twice. Allocating a
 * non-settlement line to an account posts one journal entry (BANK_LINK) and marks it LINKED.
 */
const bankStatementEntrySchema = new mongoose.Schema(
  {
    brandId: { type: String, required: true, index: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', default: null, index: true },
    entryDate: { type: Date, required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    direction: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    description: { type: String, default: '', maxlength: 300 },
    reference: { type: String, default: '', index: true }, // UTR / cheque / reference number
    source: {
      type: String,
      enum: ['BANK_STATEMENT', 'SELLER_PAYOUT', 'CAPTAIN_PAYOUT', 'COD_CASH', 'POS'],
      default: 'BANK_STATEMENT',
      index: true,
    },
    sourceRef: { type: String, default: '' },
    suggestedCategory: { type: String, default: '' },
    status: { type: String, enum: ['UNMATCHED', 'MATCHED', 'LINKED', 'IGNORED'], default: 'UNMATCHED', index: true },
    matchedSettlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'GatewaySettlement', default: null },
    linkedEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    dedupeKey: { type: String, required: true },
    createdBy: { id: String, email: String, role: String },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

bankStatementEntrySchema.index({ dedupeKey: 1 }, { unique: true });

export default mongoose.model('BankStatementEntry', bankStatementEntrySchema);

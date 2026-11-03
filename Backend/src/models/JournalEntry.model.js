import mongoose from 'mongoose';

/**
 * Immutable double-entry journal. One document = one balanced entry (debits equal credits, in paise).
 * Posted entries can never be edited or deleted - mistakes are corrected with a reversal entry
 * (sourceModule REVERSAL, reversalOf pointing at the original). Only the original's status flips
 * POSTED -> REVERSED, and only through JournalEntry.markReversed().
 */
export const SOURCE_MODULES = [
  'OPENING_BALANCE', 'MANUAL', 'TRANSFER', 'RAZORPAY_PAYMENT', 'RAZORPAY_SETTLEMENT', 'RAZORPAY_REFUND',
  'BANK_LINK', 'SELLER_PAYOUT', 'CAPTAIN_PAYOUT', 'COD_CASH', 'POS', 'EXPENSE', 'REVERSAL',
];
export const SYSTEM_ACCOUNTS = [
  'CUSTOMER_RECEIPTS', 'CUSTOMER_REFUNDS', 'OPENING_EQUITY', 'MANUAL_ADJUSTMENT', 'SELLER_PAYOUTS',
  'CAPTAIN_PAYOUTS', 'COD_COLLECTIONS', 'EXPENSES', 'OTHER_INCOME', 'POS_SALES',
];

const lineSchema = new mongoose.Schema(
  {
    accountKind: { type: String, enum: ['TREASURY', 'SYSTEM'], required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', default: null },
    systemCode: { type: String, default: null },
    brandId: { type: String, default: '' },
    debitPaise: { type: Number, default: 0, min: 0 },
    creditPaise: { type: Number, default: 0, min: 0 },
    memo: { type: String, default: '' },
  },
  { _id: false }
);

const actorSchema = new mongoose.Schema({ id: String, email: String, role: String }, { _id: false });

const journalEntrySchema = new mongoose.Schema(
  {
    entryNumber: { type: String, required: true },
    brandId: { type: String, default: '', index: true }, // MULTI when the entry touches several brands
    entryDate: { type: Date, required: true, index: true },
    description: { type: String, required: true, maxlength: 500 },
    sourceModule: { type: String, enum: SOURCE_MODULES, required: true, index: true },
    sourceRef: { type: String, default: '', index: true }, // payment id, settlement id, refund id, payout id
    idempotencyKey: { type: String, required: true },
    lines: { type: [lineSchema], validate: [(v) => Array.isArray(v) && v.length >= 2, 'An entry needs at least two lines'] },
    totalPaise: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['POSTED', 'REVERSED'], default: 'POSTED', index: true },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    reversalReason: { type: String, default: '' },
    createdBy: actorSchema,
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

journalEntrySchema.index({ idempotencyKey: 1 }, { unique: true });
journalEntrySchema.index({ entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ 'lines.accountId': 1, entryDate: -1 });
journalEntrySchema.index({ sourceModule: 1, sourceRef: 1 });

// ── Immutability ───────────────────────────────────────────────────────────────
const blocked = (what) => function () {
  throw new Error(`Journal entries are immutable: ${what} is not allowed. Post a reversal entry instead.`);
};
journalEntrySchema.pre('save', function () {
  if (!this.isNew) throw new Error('Journal entries are immutable. Post a reversal entry instead.');
});
['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'].forEach((op) => journalEntrySchema.pre(op, blocked(op)));
['deleteMany', 'findOneAndDelete'].forEach((op) => journalEntrySchema.pre(op, blocked(op)));
journalEntrySchema.pre('deleteOne', blocked('deleteOne'));
journalEntrySchema.pre('deleteOne', { document: true, query: false }, blocked('deleteOne'));

/** The single, narrow exception: flag an entry as reversed (POSTED -> REVERSED only). */
journalEntrySchema.statics.markReversed = async function (originalId, reversalId, reason, session) {
  const res = await this.collection.updateOne(
    { _id: originalId, status: 'POSTED' },
    { $set: { status: 'REVERSED', reversedBy: reversalId, reversalReason: reason || '' } },
    session ? { session } : undefined
  );
  return res.modifiedCount === 1;
};

export default mongoose.model('JournalEntry', journalEntrySchema);

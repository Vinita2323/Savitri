import mongoose from 'mongoose';

/**
 * A treasury account in the double-entry book. Balances are NEVER stored here - they are derived
 * from posted JournalEntry lines, so a balance can never drift from the ledger.
 *
 *  CASH / CURRENT / SAVINGS / ESCROW  - real money the company holds
 *  GATEWAY_CLEARING                   - money Razorpay has collected for us but not yet settled to a bank
 *                                        (a receivable from the gateway - NOT a bank account)
 *  GATEWAY_FEE                        - cumulative Razorpay fees and fee taxes deducted at settlement (expense)
 */
export const ACCOUNT_TYPES = ['CASH', 'CURRENT', 'SAVINGS', 'ESCROW', 'GATEWAY_CLEARING', 'GATEWAY_FEE'];
export const REAL_MONEY_TYPES = ['CASH', 'CURRENT', 'SAVINGS', 'ESCROW'];

const actorSchema = new mongoose.Schema({ id: String, email: String, role: String }, { _id: false });

const treasuryAccountSchema = new mongoose.Schema(
  {
    brandId: { type: String, required: true, index: true }, // brand id, or PLATFORM for shared accounts
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ACCOUNT_TYPES, required: true, index: true },
    isSystem: { type: Boolean, default: false }, // auto-created clearing / fee accounts
    systemKey: { type: String }, // unique per brand and type for system accounts
    isActive: { type: Boolean, default: true, index: true },
    isSettlementAccount: { type: Boolean, default: false }, // default destination for Razorpay settlements
    // Bumped inside a transaction by every outflow so two concurrent withdrawals conflict and the second
    // one re-reads the balance (prevents overdrawing an account through a race).
    ledgerVersion: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    openingBalancePaise: { type: Number, default: 0, min: 0 },
    openingBalanceDate: { type: Date },
    // Bank details are stored MASKED only. The full account number is never persisted.
    bank: {
      bankName: { type: String, default: '', trim: true },
      accountHolder: { type: String, default: '', trim: true },
      last4: { type: String, default: '' },
      maskedNumber: { type: String, default: '' },
      ifsc: { type: String, default: '', uppercase: true, trim: true },
      branch: { type: String, default: '', trim: true },
    },
    notes: { type: String, default: '', maxlength: 500 },
    createdBy: actorSchema,
    updatedBy: actorSchema,
  },
  { timestamps: true }
);

treasuryAccountSchema.index({ systemKey: 1 }, { unique: true, sparse: true });
treasuryAccountSchema.index({ brandId: 1, type: 1, isActive: 1 });

export default mongoose.model('TreasuryAccount', treasuryAccountSchema);

import mongoose from 'mongoose';

/**
 * Permanent, append-only record of a stock change caused by an Admin purchase (and its reversal).
 * previousStock / newStock are the product's (or variant's) stock immediately before / after this change.
 * `refKey` is unique, so the same change can never be recorded twice.
 */
const schema = new mongoose.Schema(
  {
    refKey: { type: String, required: true, unique: true }, // e.g. APU-...:0:in
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, default: '' },
    sku: { type: String, default: '' },
    variantSku: { type: String, default: '' },
    owner: {
      kind: { type: String, enum: ['ADMIN', 'PLATFORM'], required: true },
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    },
    type: { type: String, enum: ['PURCHASE', 'PURCHASE_REVERSAL', 'PURCHASE_ROLLBACK'], required: true, index: true },
    change: { type: Number, required: true }, // +100 / -100
    previousStock: { type: Number, default: null },
    newStock: { type: Number, default: null },
    referenceType: { type: String, default: 'ADMIN_PURCHASE' },
    referenceId: { type: String, required: true, index: true }, // purchaseId
    lineIndex: { type: Number, default: 0 },
    unitCostPaise: { type: Number, default: 0 },
    note: { type: String, default: '' },
    actor: { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' }, role: { type: String, default: '' } },
    recovered: { type: Boolean, default: false }, // stock was applied before this record could be written (crash recovery)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ 'owner.adminId': 1, createdAt: -1 });

export default mongoose.models.StockMovement || mongoose.model('StockMovement', schema);

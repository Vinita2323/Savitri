import mongoose from 'mongoose';

const bulkImportRowSchema = new mongoose.Schema(
  {
    importId: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkImport', required: true },
    rowNumber: { type: Number, required: true }, // 1-based sheet row (header = row 1)
    // The row exactly as uploaded (strings), so the failed-row report can be re-uploaded as it is
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    // The cleaned values the import will write (validated rows only)
    data: { type: mongoose.Schema.Types.Mixed, default: null },
    action: { type: String, enum: ['create', 'update', 'none'], default: 'none' },
    status: { type: String, enum: ['valid', 'invalid', 'skipped', 'imported', 'failed'], default: 'invalid' },
    // (not named `errors`: Mongoose reserves that name on documents)
    problems: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bulkImportRowSchema.index({ importId: 1, rowNumber: 1 }, { unique: true });
bulkImportRowSchema.index({ importId: 1, status: 1, rowNumber: 1 });

const BulkImportRow = mongoose.model('BulkImportRow', bulkImportRowSchema);
export default BulkImportRow;

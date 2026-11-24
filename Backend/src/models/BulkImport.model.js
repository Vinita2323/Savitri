import mongoose from 'mongoose';

/**
 * One bulk product upload. Rows live in BulkImportRow (a collection of their own) so a large file never
 * approaches the 16MB document limit and the preview / failed-row report can be paged.
 */
const bulkImportSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
    sellerName: { type: String, default: '' },
    brandId: { type: String, default: '', index: true },
    fileName: { type: String, default: '' },
    imagesZipName: { type: String, default: '' },
    fileHash: { type: String, default: '' },
    mode: { type: String, enum: ['CREATE', 'UPDATE'], default: 'CREATE' },
    status: {
      type: String,
      enum: ['validating', 'validated', 'importing', 'completed', 'completed_with_errors', 'failed', 'discarded'],
      default: 'validating',
      index: true,
    },
    // Counters; `valid`/`invalid` are filled by validation, the rest by the import itself
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    successRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    skippedRows: { type: Number, default: 0 },
    publishedRows: { type: Number, default: 0 },
    createdRows: { type: Number, default: 0 },
    updatedRows: { type: Number, default: 0 },
    phase: { type: String, enum: ['validating', 'importing', 'idle'], default: 'idle' },
    processed: { type: Number, default: 0 }, // rows handled in the current phase
    // where a failed run stopped: only a run that failed while importing can be resumed
    failedPhase: { type: String, enum: ['', 'validating', 'importing'], default: '' },
    tempDir: { type: String, default: '' }, // staged upload folder (outside the public uploads directory)
    errorSummary: { type: String, default: '' }, // fatal error (whole file rejected / import crashed)
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null }, // an un-imported validated upload is discarded after this
  },
  { timestamps: true }
);

bulkImportSchema.index({ seller: 1, createdAt: -1 });
bulkImportSchema.index({ seller: 1, fileHash: 1, mode: 1 });
bulkImportSchema.index({ status: 1, updatedAt: 1 });

const BulkImport = mongoose.model('BulkImport', bulkImportSchema);
export default BulkImport;

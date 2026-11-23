import mongoose from 'mongoose';

export const ADMIN_DOC_CATEGORIES = ['Identity proof', 'Address proof', 'PAN / Tax', 'Passport', 'Driving licence', 'Insurance / Medical', 'Emergency contact', 'Bank', 'Legal / Agreement', 'Other'];

/** A personal document of ONE admin / super admin. Private to its owner: the file lives outside the public uploads folder. */
const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, enum: ADMIN_DOC_CATEGORIES, default: 'Other' },
    documentNumber: { type: String, default: '', trim: true, maxlength: 60 },
    expiryDate: { type: String, default: '' }, // YYYY-MM-DD, optional
    notes: { type: String, default: '', trim: true, maxlength: 500 },
    fileKey: { type: String, required: true },
    fileName: { type: String, default: 'document' }, // original name, sanitised, used only as the download name
    mime: { type: String, required: true },
    size: { type: Number, required: true },
    hash: { type: String, default: '' },
  },
  { timestamps: true }
);
schema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('AdminDocument', schema);

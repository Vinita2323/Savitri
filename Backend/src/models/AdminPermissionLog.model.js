import mongoose from 'mongoose';

const who = { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' }, email: { type: String, default: '' } };

/** Permanent record of every permission change of an Admin in a brand. Rows are only ever added. */
const schema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    admin: who,
    brandId: { type: String, required: true, index: true },
    brandName: { type: String, default: '' },
    action: { type: String, enum: ['CONFIGURED', 'UPDATED', 'REVOKED'], required: true },
    before: { roleProfile: { type: String, default: '' }, permissions: { type: mongoose.Schema.Types.Mixed, default: null } },
    after: { roleProfile: { type: String, default: '' }, permissions: { type: mongoose.Schema.Types.Mixed, default: null } },
    changedBy: who,
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false }
);
schema.index({ createdAt: -1 });

export default mongoose.model('AdminPermissionLog', schema);

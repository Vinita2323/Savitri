import mongoose from 'mongoose';

const who = { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' }, email: { type: String, default: '' } };

/**
 * What one Admin may do inside one brand. Whether the admin HAS the brand is still decided by Admin.authorizedBrands; this
 * record only says what may be done there. No active record = nothing may be done.
 */
const schema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    brandId: { type: String, required: true, trim: true },
    roleProfile: { type: String, enum: ['ADMIN', 'SUB_ADMIN', 'CUSTOM'], default: 'CUSTOM' },
    permissions: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }, // { products: ['view','edit'], ... }
    isActive: { type: Boolean, default: true }, // false after the brand is taken away from the admin
    createdBy: who,
    updatedBy: who,
  },
  { timestamps: true, minimize: false }
);
schema.index({ adminId: 1, brandId: 1 }, { unique: true });

const AdminBrandAccess = mongoose.model('AdminBrandAccess', schema);

let indexReady = null;
/** autoIndex is off in this project: create the unique index before the first write. */
export const ensureAdminBrandAccessIndexes = () => {
  if (!indexReady) {
    indexReady = AdminBrandAccess.collection
      .createIndex({ adminId: 1, brandId: 1 }, { unique: true })
      .catch((e) => { indexReady = null; throw e; });
  }
  return indexReady;
};

export default AdminBrandAccess;

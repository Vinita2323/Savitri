import mongoose from 'mongoose';

const who = { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' }, email: { type: String, default: '' } };

/** Permanent record of every change to which Admin manages which brand. Rows are only ever added. */
const schema = new mongoose.Schema(
  {
    brandId: { type: String, required: true, index: true },
    brandName: { type: String, default: '' },
    action: { type: String, enum: ['ASSIGNED', 'REMOVED', 'TRANSFERRED', 'SHARED'], required: true },
    previousAdmin: who, // empty when the brand was not taken from anyone
    newAdmin: who, // empty when the brand was only removed
    changedBy: who,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ createdAt: -1 });

export default mongoose.model('AdminAssignmentLog', schema);

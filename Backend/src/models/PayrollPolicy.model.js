import mongoose from 'mongoose';

/** Payroll approval / permission policy. A brand row overrides GLOBAL. Managed by Super Admin only. */
const policySchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, unique: true, trim: true }, // 'GLOBAL' or a brandId
    adminCanApprove: { type: Boolean, default: false }, // false = only Super Admin approves (maker-checker)
    adminCanRecordPayments: { type: Boolean, default: true },
    allowSelfApproval: { type: Boolean, default: false }, // an Admin may approve a payroll they submitted
    overtimeApproval: { type: String, enum: ['MANUAL', 'AUTO'], default: 'MANUAL' }, // MANUAL: overtime pays only the minutes an admin approves
    updatedBy: { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' } },
  },
  { timestamps: true }
);

export default mongoose.model('PayrollPolicy', policySchema);

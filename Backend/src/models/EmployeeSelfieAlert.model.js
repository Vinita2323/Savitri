import mongoose from 'mongoose';

/** Alerts for Admins / Super Admins about selfie verification (there was no admin notification store before). */
const employeeSelfieAlertSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['LOGIN_MISSED', 'VERIFICATION_MISSED', 'REPEATED_MISSED'], required: true },
    brandId: { type: String, default: '', index: true }, // visible to Super Admins and to admins of this brand
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: { type: String, default: '' },
    employeeName: { type: String, default: '' },
    workDate: { type: String, default: '' },
    message: { type: String, required: true },
    selfie: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeSelfie', default: null },
    // One alert per fact: re-running the scheduler can never create it twice
    dedupeKey: { type: String, required: true, unique: true },
    readBy: [{ adminId: { type: String }, at: { type: Date, default: Date.now }, _id: false }],
  },
  { timestamps: true }
);

employeeSelfieAlertSchema.index({ brandId: 1, createdAt: -1 });

export default mongoose.models.EmployeeSelfieAlert || mongoose.model('EmployeeSelfieAlert', employeeSelfieAlertSchema);

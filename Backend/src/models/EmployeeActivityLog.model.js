import mongoose from 'mongoose';

/** Append-only log of important employee-module actions. */
const employeeActivityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    actor: {
      type: { type: String, enum: ['employee', 'admin', 'super_admin', 'system'], default: 'system' },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    employeeCode: { type: String, default: '' },
    brandId: { type: String, default: '', index: true },
    entity: { type: String, default: '' },
    entityId: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

employeeActivityLogSchema.index({ createdAt: -1 });
employeeActivityLogSchema.index({ brandId: 1, createdAt: -1 });

const EmployeeActivityLog = mongoose.model('EmployeeActivityLog', employeeActivityLogSchema);
export default EmployeeActivityLog;

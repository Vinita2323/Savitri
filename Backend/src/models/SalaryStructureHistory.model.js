import mongoose from 'mongoose';
import { salaryStructureFields, actorSchema } from './salaryStructureFields.js';

/** Immutable snapshots of every salary structure an employee ever had. Only effectiveTo is closed when a newer version starts. */
const historySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: { type: String, required: true },
    brandId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    ...salaryStructureFields,
    reason: { type: String, default: '' },
    createdBy: { type: actorSchema, default: () => ({}) },
    closedBy: { type: actorSchema, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
historySchema.index({ employee: 1, version: 1 }, { unique: true });
historySchema.index({ employee: 1, effectiveFrom: 1 });

export default mongoose.model('SalaryStructureHistory', historySchema);

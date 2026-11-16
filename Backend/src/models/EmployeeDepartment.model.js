import mongoose from 'mongoose';

/** Departments and their designations. brandId 'ALL' = available to every brand. */
const employeeDepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brandId: { type: String, default: 'ALL', index: true },
    designations: { type: [String], default: [] },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeDepartmentSchema.index({ brandId: 1, name: 1 }, { unique: true });

const EmployeeDepartment = mongoose.model('EmployeeDepartment', employeeDepartmentSchema);
export default EmployeeDepartment;

import mongoose from 'mongoose';
import { salaryStructureFields, actorSchema } from './salaryStructureFields.js';

/** The CURRENT salary structure of an employee (one per employee). Every change also writes an immutable SalaryStructureHistory row. */
const employeeSalarySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    employeeCode: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    brandId: { type: String, required: true, index: true },
    version: { type: Number, default: 1 },
    ...salaryStructureFields,
    updatedBy: { type: actorSchema, default: () => ({}) },
    createdBy: { type: actorSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model('EmployeeSalary', employeeSalarySchema);

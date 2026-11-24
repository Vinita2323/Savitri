import mongoose from 'mongoose';
import { actorSchema } from './salaryStructureFields.js';

export const ADJUSTMENT_TYPES = ['BONUS', 'INCENTIVE', 'DEDUCTION', 'ADVANCE'];

/**
 * One-off earnings / deductions and salary advances.
 *  BONUS, INCENTIVE -> added to the next payroll
 *  DEDUCTION        -> an approved other deduction taken from the next payroll
 *  ADVANCE          -> money already given; recovered from payrolls (all at once or in instalments)
 */
const adjustmentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true },
    brandId: { type: String, required: true, index: true },
    type: { type: String, enum: ADJUSTMENT_TYPES, required: true },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    date: { type: String, required: true }, // YYYY-MM-DD it belongs to (an advance: the day it was given)
    description: { type: String, default: '', trim: true, maxlength: 300 },
    status: { type: String, enum: ['ACTIVE', 'ATTACHED', 'APPLIED', 'CANCELLED'], default: 'ACTIVE', index: true },
    // BONUS / INCENTIVE / DEDUCTION: the payroll it is attached to (ATTACHED while that payroll is a draft, APPLIED once approved)
    payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', default: null, index: true },
    // ADVANCE only
    recoveryMode: { type: String, enum: ['FULL', 'INSTALLMENT'], default: 'FULL' },
    installmentPaise: { type: Number, default: 0, min: 0 },
    recoveredPaise: { type: Number, default: 0, min: 0 },
    recoveries: [
      {
        payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },
        amountPaise: { type: Number },
        at: { type: Date, default: Date.now },
        reversed: { type: Boolean, default: false },
      },
    ],
    createdBy: { type: actorSchema, default: () => ({}) },
    cancelledBy: { type: actorSchema, default: null },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('SalaryAdjustment', adjustmentSchema);

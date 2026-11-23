import mongoose from 'mongoose';
import { SALARY_TYPES, PAYMENT_FREQUENCIES, actorSchema } from './salaryStructureFields.js';

export const PAYROLL_STATUSES = ['DRAFT', 'CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];

/** One employee's payroll for one period. Totals are integer paise. */
const payrollSchema = new mongoose.Schema(
  {
    payrollCode: { type: String, required: true, unique: true },
    batchId: { type: String, default: '', index: true }, // the "run" that created it (one click for many employees)
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },
    brandId: { type: String, required: true, index: true },
    periodFrom: { type: String, required: true }, // YYYY-MM-DD
    periodTo: { type: String, required: true },
    salaryType: { type: String, enum: SALARY_TYPES, required: true },
    paymentFrequency: { type: String, enum: PAYMENT_FREQUENCIES, required: true },
    paymentDueDate: { type: String, default: '' },
    activeKey: { type: String, default: undefined }, // employee|from|to while the payroll is live; removed on cancel (backs the unique index)
    structures: { type: [mongoose.Schema.Types.Mixed], default: [] }, // the salary structure version(s) used, frozen at calculation time
    status: { type: String, enum: PAYROLL_STATUSES, default: 'DRAFT', index: true },

    summary: { type: mongoose.Schema.Types.Mixed, default: {} }, // attendance counts, payable days / minutes, overtime
    days: { type: [mongoose.Schema.Types.Mixed], default: [] }, // per-day classification used for the calculation
    warnings: { type: [String], default: [] },
    selfieMissedCount: { type: Number, default: 0 }, // audit indicator only: never affects pay

    overtimeCandidateMinutes: { type: Number, default: 0 },
    overtimeApprovedMinutes: { type: Number, default: 0 },

    grossPaise: { type: Number, default: 0 },
    deductionsPaise: { type: Number, default: 0 }, // all deductions incl. advance recovery
    advanceRecoveryPaise: { type: Number, default: 0 }, // part of deductionsPaise
    netPaise: { type: Number, default: 0 },
    shortfallPaise: { type: Number, default: 0 }, // deductions that exceeded earnings (not recovered; net is never negative)
    paidPaise: { type: Number, default: 0 },

    calculatedAt: { type: Date, default: null },
    calculatedBy: { type: actorSchema, default: null },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: actorSchema, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: actorSchema, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: actorSchema, default: null },
    cancelReason: { type: String, default: '' },
    lockedAt: { type: Date, default: null }, // set on approval: the period's attendance can no longer change
    createdBy: { type: actorSchema, default: () => ({}) },
    history: [
      {
        at: { type: Date, default: Date.now },
        action: { type: String },
        by: { type: actorSchema, default: null },
        note: { type: String, default: '' },
        data: { type: mongoose.Schema.Types.Mixed, default: null },
      },
    ],
  },
  { timestamps: true }
);

// One live payroll per employee and period (cancelled ones do not count)
payrollSchema.index({ activeKey: 1 }, { unique: true, sparse: true });
payrollSchema.index({ brandId: 1, periodFrom: 1, status: 1 });
payrollSchema.index({ employee: 1, periodTo: -1 });

export default mongoose.model('Payroll', payrollSchema);

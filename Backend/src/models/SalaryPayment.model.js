import mongoose from 'mongoose';
import { PAYMENT_METHODS, actorSchema } from './salaryStructureFields.js';

/** A payment transaction against a payroll. A payroll can have many (partial payments). Recorded manually: nothing here moves real money. */
const paymentSchema = new mongoose.Schema(
  {
    paymentCode: { type: String, required: true, unique: true },
    payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true },
    employeeName: { type: String, default: '' },
    brandId: { type: String, required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isInteger },
    paidOn: { type: String, required: true }, // YYYY-MM-DD
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    reference: { type: String, default: '', trim: true, maxlength: 80 }, // transaction / UTR / receipt no.
    remarks: { type: String, default: '', trim: true, maxlength: 300 },
    status: { type: String, enum: ['RECORDED', 'REVERSED'], default: 'RECORDED', index: true },
    idempotencyKey: { type: String, default: undefined },
    recordedBy: { type: actorSchema, default: () => ({}) },
    reversedBy: { type: actorSchema, default: null },
    reversedAt: { type: Date, default: null },
    reverseReason: { type: String, default: '' },
  },
  { timestamps: true }
);
// The same reference can not be recorded twice on one payroll, and a retried request (same key) can not pay twice
paymentSchema.index({ payroll: 1, reference: 1 }, { unique: true, partialFilterExpression: { reference: { $gt: '' }, status: 'RECORDED' } });
paymentSchema.index({ payroll: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });

export default mongoose.model('SalaryPayment', paymentSchema);

import mongoose from 'mongoose';

/** One line of a payroll (an earning or a deduction), so every rupee in a payroll can be traced. */
const itemSchema = new mongoose.Schema(
  {
    payroll: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    brandId: { type: String, required: true, index: true },
    kind: { type: String, enum: ['EARNING', 'DEDUCTION'], required: true },
    code: { type: String, required: true }, // BASIC, OVERTIME, BONUS, INCENTIVE, ABSENT, UNPAID_LEAVE, HALF_DAY, LATE, ADVANCE_RECOVERY, OTHER_DEDUCTION
    label: { type: String, required: true },
    quantity: { type: Number, default: 0 }, // see unit
    unit: { type: String, default: '' }, // DAY_CENTI (100 = one day) | MINUTE | COUNT | ''
    amountPaise: { type: Number, required: true, validate: Number.isInteger },
    source: { type: String, enum: ['SYSTEM', 'ADJUSTMENT', 'ADVANCE'], default: 'SYSTEM' },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('PayrollItem', itemSchema);

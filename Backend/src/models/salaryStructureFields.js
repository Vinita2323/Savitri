import mongoose from 'mongoose';

export const SALARY_TYPES = ['MONTHLY', 'WEEKLY', 'DAILY', 'HOURLY'];
export const PAYMENT_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];
export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER'];
export const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave', 'Maternity/Paternity', 'Compensatory Off'];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The fields that describe ONE salary structure (shared by the current structure and its history snapshots). All money is integer paise. */
export const salaryStructureFields = {
  salaryType: { type: String, enum: SALARY_TYPES, required: true },
  baseAmountPaise: { type: Number, required: true, min: 0, validate: Number.isInteger }, // per month / week / day / hour, depending on salaryType
  paymentFrequency: { type: String, enum: PAYMENT_FREQUENCIES, required: true },
  customPeriodDays: { type: Number, default: 0, min: 0, max: 92 }, // paymentFrequency CUSTOM
  paymentDay: { type: String, default: '' }, // MONTHLY: day of month ("1".."28" or "LAST"); WEEKLY: weekday name; others unused
  effectiveFrom: { type: String, required: true }, // YYYY-MM-DD (IST)
  effectiveTo: { type: String, default: null }, // YYYY-MM-DD, null = open ended
  workingDaysPerWeek: { type: Number, default: 6, min: 1, max: 7 },
  weeklyOffDays: { type: [String], default: ['Sunday'] },
  workingMinutesPerDay: { type: Number, default: 480, min: 60, max: 1440 },
  monthlyBasis: { type: String, enum: ['CALENDAR_DAYS', 'WORKING_DAYS'], default: 'CALENDAR_DAYS' }, // MONTHLY: how a day's value is derived
  weeklyMode: { type: String, enum: ['FIXED_WEEKLY', 'DAILY_RATE'], default: 'FIXED_WEEKLY' }, // WEEKLY only
  overtimeEnabled: { type: Boolean, default: false },
  overtimeRateType: { type: String, enum: ['MULTIPLIER', 'FIXED_PER_HOUR'], default: 'MULTIPLIER' },
  overtimeMultiplierX100: { type: Number, default: 150, min: 100, max: 1000 }, // 150 = 1.5x
  overtimeFixedPerHourPaise: { type: Number, default: 0, min: 0 },
  lateDeductionEnabled: { type: Boolean, default: false },
  lateAllowedPerPeriod: { type: Number, default: 3, min: 0, max: 31 }, // free late arrivals per payroll period
  lateDeductionPercent: { type: Number, default: 25, min: 1, max: 100 }, // % of one day's pay per extra late
  halfDayDeductionEnabled: { type: Boolean, default: true },
  unpaidLeaveDeductionEnabled: { type: Boolean, default: true },
  absentDeductionEnabled: { type: Boolean, default: true },
  paidLeaveTypes: { type: [String], default: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity', 'Compensatory Off'] },
  paidWeeklyOffs: { type: Boolean, default: false }, // DAILY / HOURLY: pay weekly off days
  paidHolidays: { type: Boolean, default: false }, // DAILY / HOURLY: pay public holidays
  paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'BANK_TRANSFER' },
  bank: {
    accountHolder: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    ifsc: { type: String, default: '', trim: true, uppercase: true },
    bankName: { type: String, default: '', trim: true },
  },
  upiId: { type: String, default: '', trim: true },
};

export const actorSchema = new mongoose.Schema(
  { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' }, role: { type: String, default: '' } },
  { _id: false }
);

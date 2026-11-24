import mongoose from 'mongoose';
import crypto from 'crypto';
import Employee from '../models/Employee.model.js';
import EmployeeSalary from '../models/EmployeeSalary.model.js';
import SalaryStructureHistory from '../models/SalaryStructureHistory.model.js';
import PayrollPolicy from '../models/PayrollPolicy.model.js';
import SalaryAdjustment from '../models/SalaryAdjustment.model.js';
import Payroll from '../models/Payroll.model.js';
import PayrollItem from '../models/PayrollItem.model.js';
import SalaryPayment from '../models/SalaryPayment.model.js';
import { WEEKDAYS, PAYMENT_FREQUENCIES, SALARY_TYPES, PAYMENT_METHODS, LEAVE_TYPES } from '../models/salaryStructureFields.js';
import { toPaise, MoneyError, ratio } from '../utils/payrollMoney.js';
import { istDateString, isValidDateString, addDays, logActivity, weekdayOfDateString } from './employeeCore.js';

export class PayrollError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/**
 * The app disables mongoose autoIndex, and the unique indexes (one live payroll per employee and period, one payment per
 * reference, one salary row per employee) are what make duplicate prevention safe. Guarantee they exist before the first payroll operation.
 */
let indexesReady = null;
export const ensurePayrollIndexes = () => {
  if (!indexesReady) {
    indexesReady = Promise.all([EmployeeSalary, SalaryStructureHistory, PayrollPolicy, SalaryAdjustment, Payroll, PayrollItem, SalaryPayment].map((m) => m.createIndexes())).catch((err) => {
      indexesReady = null;
      throw err;
    });
  }
  return indexesReady;
};

export const toActor = (a) => ({ id: a?.id || null, name: a?.name || a?.email || '', role: a?.type || a?.role || '' });

/** Brand scope as a Mongo filter (Admin: their brand only; Super Admin consolidated: everything). */
export const brandFilter = (scope) => (scope && !scope.isAll ? { brandId: scope.brandId } : {});
export const assertInScope = (scope, brandId) => {
  if (scope && !scope.isAll && scope.brandId !== brandId) throw new PayrollError(404, 'Employee not found.');
};

/** Run fn in a transaction when the database supports it (replica set); otherwise run it plainly (every critical step is also an atomic conditional update). */
let txnSupported = null;
const supportsTransactions = async () => {
  if (txnSupported !== null) return txnSupported;
  try {
    const h = await mongoose.connection.db.admin().command({ hello: 1 });
    txnSupported = Boolean(h.setName || h.msg === 'isdbgrid'); // replica set member or mongos
  } catch {
    txnSupported = false;
  }
  return txnSupported;
};

export const withTxn = async (fn) => {
  if (!(await supportsTransactions())) return fn(null);
  const session = await mongoose.startSession();
  try {
    let out;
    await session.withTransaction(async () => { out = await fn(session); });
    return out;
  } finally {
    await session.endSession().catch(() => {});
  }
};

// ───────────────────────── policy ─────────────────────────

export const DEFAULT_POLICY = { adminCanApprove: false, adminCanRecordPayments: true, allowSelfApproval: false, overtimeApproval: 'MANUAL' };

export const getPolicy = async (brandId) => {
  const docs = await PayrollPolicy.find({ scope: { $in: [brandId, 'GLOBAL'].filter(Boolean) } }).lean();
  const by = Object.fromEntries(docs.map((d) => [d.scope, d]));
  const doc = by[brandId] || by.GLOBAL;
  return { ...DEFAULT_POLICY, ...(doc ? { adminCanApprove: doc.adminCanApprove, adminCanRecordPayments: doc.adminCanRecordPayments, allowSelfApproval: doc.allowSelfApproval, overtimeApproval: doc.overtimeApproval } : {}), source: by[brandId] ? brandId : by.GLOBAL ? 'GLOBAL' : 'DEFAULT' };
};

export const savePolicy = async ({ scope, body, actor }) => {
  const set = {
    adminCanApprove: Boolean(body.adminCanApprove),
    adminCanRecordPayments: body.adminCanRecordPayments === undefined ? true : Boolean(body.adminCanRecordPayments),
    allowSelfApproval: Boolean(body.allowSelfApproval),
    overtimeApproval: body.overtimeApproval === 'AUTO' ? 'AUTO' : 'MANUAL',
    updatedBy: { id: actor.id, name: actor.name },
  };
  await PayrollPolicy.findOneAndUpdate({ scope }, { $set: set, $setOnInsert: { scope } }, { upsert: true });
  await logActivity({ action: 'payroll_policy_saved', actor, brandId: scope === 'GLOBAL' ? '' : scope, entity: 'PayrollPolicy', entityId: scope, details: set });
  return getPolicy(scope === 'GLOBAL' ? null : scope);
};

// ───────────────────────── salary structure ─────────────────────────

const bool = (v, d = false) => (v === undefined || v === null || v === '' ? d : v === true || v === 'true' || v === 1 || v === '1');
const int = (v, d) => (v === undefined || v === null || v === '' ? d : Number(v));
const need = (cond, msg) => { if (!cond) throw new PayrollError(400, msg); };

/** "1.5" -> 150 ; "8" -> 800 (two decimals, exact, no float) */
const x100 = (v, label) => {
  const s = String(v).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new PayrollError(400, `${label} must be a number with at most 2 decimals.`);
  const [a, b = ''] = s.split('.');
  return Number(a) * 100 + Number(b.padEnd(2, '0'));
};

/** Request body (rupees as strings, hours as numbers) -> structure fields (paise, minutes). Throws a clear 400 for anything invalid. */
export const normalizeStructure = (b) => {
  const out = {};
  need(SALARY_TYPES.includes(b.salaryType), 'Choose a salary type (Monthly, Weekly, Daily or Hourly).');
  out.salaryType = b.salaryType;
  try { out.baseAmountPaise = toPaise(b.baseAmount, { allowZero: false }); } catch (e) { throw new PayrollError(400, `Base salary: ${e.message}`); }
  need(PAYMENT_FREQUENCIES.includes(b.paymentFrequency), 'Choose a payment frequency.');
  out.paymentFrequency = b.paymentFrequency;
  out.customPeriodDays = int(b.customPeriodDays, 0);
  if (out.paymentFrequency === 'CUSTOM') need(Number.isInteger(out.customPeriodDays) && out.customPeriodDays >= 1 && out.customPeriodDays <= 92, 'For a custom frequency enter the period length in days (1 to 92).');
  else out.customPeriodDays = 0;
  out.paymentDay = String(b.paymentDay || '').trim();
  if (out.paymentFrequency === 'MONTHLY' && out.paymentDay) need(out.paymentDay === 'LAST' || (/^\d{1,2}$/.test(out.paymentDay) && +out.paymentDay >= 1 && +out.paymentDay <= 28), 'The monthly payment day must be 1 to 28, or LAST.');
  if (out.paymentFrequency === 'WEEKLY' && out.paymentDay) need(WEEKDAYS.includes(out.paymentDay), 'The weekly payment day must be a weekday name.');
  need(isValidDateString(b.effectiveFrom), 'Enter the date the salary starts from.');
  out.effectiveFrom = b.effectiveFrom;
  if (b.effectiveTo) { need(isValidDateString(b.effectiveTo), 'The end date is not valid.'); need(b.effectiveTo >= b.effectiveFrom, 'The end date must not be before the start date.'); out.effectiveTo = b.effectiveTo; } else out.effectiveTo = null;
  const offs = Array.isArray(b.weeklyOffDays) ? b.weeklyOffDays : ['Sunday'];
  need(offs.every((d) => WEEKDAYS.includes(d)) && new Set(offs).size === offs.length, 'Weekly off days are not valid.');
  need(offs.length <= 6, 'At least one working day a week is needed.');
  out.weeklyOffDays = offs;
  out.workingDaysPerWeek = int(b.workingDaysPerWeek, 7 - offs.length);
  need(Number.isInteger(out.workingDaysPerWeek) && out.workingDaysPerWeek === 7 - offs.length, `Working days per week (${out.workingDaysPerWeek}) must match the weekly offs (${7 - offs.length} working days).`);
  const hrs = x100(int(b.workingHoursPerDay, 8), 'Working hours per day');
  const mins = Math.round(hrs * 60 / 100);
  need(mins >= 60 && mins <= 1440 && (hrs * 60) % 100 === 0, 'Working hours per day must be between 1 and 24 (in steps of 1/60 hour, e.g. 7.5).');
  out.workingMinutesPerDay = mins;
  out.monthlyBasis = b.monthlyBasis === 'WORKING_DAYS' ? 'WORKING_DAYS' : 'CALENDAR_DAYS';
  out.weeklyMode = b.weeklyMode === 'DAILY_RATE' ? 'DAILY_RATE' : 'FIXED_WEEKLY';
  out.overtimeEnabled = bool(b.overtimeEnabled);
  out.overtimeRateType = b.overtimeRateType === 'FIXED_PER_HOUR' ? 'FIXED_PER_HOUR' : 'MULTIPLIER';
  if (out.overtimeEnabled) {
    if (out.overtimeRateType === 'MULTIPLIER') {
      out.overtimeMultiplierX100 = x100(b.overtimeRate ?? 1.5, 'Overtime rate');
      need(out.overtimeMultiplierX100 >= 100 && out.overtimeMultiplierX100 <= 1000, 'The overtime multiplier must be between 1 and 10.');
    } else {
      try { out.overtimeFixedPerHourPaise = toPaise(b.overtimeRate, { allowZero: false }); } catch (e) { throw new PayrollError(400, `Overtime rate: ${e.message}`); }
    }
  }
  out.lateDeductionEnabled = bool(b.lateDeductionEnabled);
  if (out.lateDeductionEnabled) {
    out.lateAllowedPerPeriod = int(b.lateAllowedPerPeriod, 3);
    out.lateDeductionPercent = int(b.lateDeductionPercent, 25);
    need(Number.isInteger(out.lateAllowedPerPeriod) && out.lateAllowedPerPeriod >= 0 && out.lateAllowedPerPeriod <= 31, 'Free late arrivals must be 0 to 31.');
    need(Number.isInteger(out.lateDeductionPercent) && out.lateDeductionPercent >= 1 && out.lateDeductionPercent <= 100, 'The late deduction must be 1 to 100 percent of a day.');
  }
  out.halfDayDeductionEnabled = bool(b.halfDayDeductionEnabled, true);
  out.unpaidLeaveDeductionEnabled = bool(b.unpaidLeaveDeductionEnabled, true);
  out.absentDeductionEnabled = bool(b.absentDeductionEnabled, true);
  const paid = Array.isArray(b.paidLeaveTypes) ? b.paidLeaveTypes : ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity', 'Compensatory Off'];
  need(paid.every((t) => LEAVE_TYPES.includes(t)), 'A paid leave type is not valid.');
  out.paidLeaveTypes = paid.filter((t) => t !== 'Unpaid Leave');
  out.paidWeeklyOffs = bool(b.paidWeeklyOffs);
  out.paidHolidays = bool(b.paidHolidays);
  need(PAYMENT_METHODS.includes(b.paymentMethod || 'BANK_TRANSFER'), 'Choose a payment method.');
  out.paymentMethod = b.paymentMethod || 'BANK_TRANSFER';
  const bank = b.bank || {};
  out.bank = { accountHolder: String(bank.accountHolder || '').trim(), accountNumber: String(bank.accountNumber || '').replace(/\s/g, ''), ifsc: String(bank.ifsc || '').trim().toUpperCase(), bankName: String(bank.bankName || '').trim() };
  out.upiId = String(b.upiId || '').trim();
  if (out.paymentMethod === 'BANK_TRANSFER') {
    need(out.bank.accountHolder, 'Enter the bank account holder name.');
    need(/^\d{6,24}$/.test(out.bank.accountNumber), 'Enter a valid bank account number (6 to 24 digits).');
    need(/^[A-Z]{4}0[A-Z0-9]{6}$/.test(out.bank.ifsc), 'Enter a valid IFSC code (for example HDFC0001234).');
  }
  if (out.paymentMethod === 'UPI') need(/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(out.upiId), 'Enter a valid UPI ID (for example name@bank).');
  return out;
};

const maskAccount = (n) => (n && n.length > 4 ? `${'•'.repeat(n.length - 4)}${n.slice(-4)}` : n ? '••••' : '');

/** Shape a structure for the API. Bank details are masked unless `full` (admin screens that edit them). */
export const shapeStructure = (s, { full = false } = {}) => {
  if (!s) return null;
  const o = s.toObject ? s.toObject() : { ...s };
  const base = o.baseAmountPaise;
  return {
    id: String(o._id || ''),
    version: o.version,
    salaryType: o.salaryType,
    baseAmountPaise: base,
    paymentFrequency: o.paymentFrequency,
    customPeriodDays: o.customPeriodDays,
    paymentDay: o.paymentDay,
    effectiveFrom: o.effectiveFrom,
    effectiveTo: o.effectiveTo,
    workingDaysPerWeek: o.workingDaysPerWeek,
    weeklyOffDays: o.weeklyOffDays,
    workingHoursPerDay: o.workingMinutesPerDay / 60,
    monthlyBasis: o.monthlyBasis,
    weeklyMode: o.weeklyMode,
    overtimeEnabled: o.overtimeEnabled,
    overtimeRateType: o.overtimeRateType,
    overtimeRate: o.overtimeRateType === 'MULTIPLIER' ? o.overtimeMultiplierX100 / 100 : null,
    overtimeFixedPerHourPaise: o.overtimeFixedPerHourPaise,
    lateDeductionEnabled: o.lateDeductionEnabled,
    lateAllowedPerPeriod: o.lateAllowedPerPeriod,
    lateDeductionPercent: o.lateDeductionPercent,
    halfDayDeductionEnabled: o.halfDayDeductionEnabled,
    unpaidLeaveDeductionEnabled: o.unpaidLeaveDeductionEnabled,
    absentDeductionEnabled: o.absentDeductionEnabled,
    paidLeaveTypes: o.paidLeaveTypes,
    paidWeeklyOffs: o.paidWeeklyOffs,
    paidHolidays: o.paidHolidays,
    paymentMethod: o.paymentMethod,
    bank: full ? o.bank : { ...o.bank, accountNumber: maskAccount(o.bank?.accountNumber) },
    upiId: o.upiId,
    reason: o.reason || '',
    createdAt: o.createdAt,
  };
};

/** Engine shape (raw minutes / x100 fields) of a stored structure */
export const engineStructure = (s) => {
  const o = s.toObject ? s.toObject() : s;
  return { ...o, _id: undefined };
};

const lastPayrollDate = async (employeeId) => {
  const p = await Payroll.findOne({ employee: employeeId, status: { $ne: 'CANCELLED' } }).sort({ periodTo: -1 }).select('periodTo').lean();
  return p ? p.periodTo : null;
};

export const getSalary = async ({ scope, employeeId }) => {
  const emp = await Employee.findById(employeeId).select('_id employeeId fullName brandId department designation joiningDate employmentStatus').lean();
  if (!emp) throw new PayrollError(404, 'Employee not found.');
  assertInScope(scope, emp.brandId);
  const [current, history] = await Promise.all([EmployeeSalary.findOne({ employee: emp._id }), SalaryStructureHistory.find({ employee: emp._id }).sort({ version: -1 }).lean()]);
  return {
    employee: { id: String(emp._id), employeeId: emp.employeeId, name: emp.fullName, brandId: emp.brandId, department: emp.department, designation: emp.designation, joiningDate: emp.joiningDate, employmentStatus: emp.employmentStatus },
    salary: shapeStructure(current, { full: true }),
    history: history.map((h) => shapeStructure(h, { full: false })),
    lockedThrough: await lastPayrollDate(emp._id),
  };
};

/** Create or update a salary structure. History is preserved: an update starts a NEW version on its effective date. */
export const saveSalary = async ({ scope, employeeId, body, actor }) => {
  const emp = await Employee.findById(employeeId).select('_id employeeId fullName brandId').lean();
  if (!emp) throw new PayrollError(404, 'Employee not found.');
  assertInScope(scope, emp.brandId);
  const fields = normalizeStructure(body);
  const by = toActor(actor);
  const current = await EmployeeSalary.findOne({ employee: emp._id });
  const locked = await lastPayrollDate(emp._id);
  const reason = String(body.reason || '').trim().slice(0, 200);

  if (!current) {
    const doc = { employee: emp._id, employeeCode: emp.employeeId, employeeName: emp.fullName, brandId: emp.brandId, version: 1, ...fields, createdBy: by, updatedBy: by };
    await EmployeeSalary.create(doc);
    await SalaryStructureHistory.create({ ...doc, reason: reason || 'Initial salary', updatedBy: undefined });
    await logActivity({ action: 'salary_config_created', actor, employee: emp, brandId: emp.brandId, entity: 'EmployeeSalary', entityId: emp._id, details: { version: 1, salaryType: fields.salaryType, baseAmountPaise: fields.baseAmountPaise, effectiveFrom: fields.effectiveFrom } });
    return getSalary({ scope, employeeId });
  }

  // Correcting the very first structure while no payroll exists is allowed (a typo); otherwise a new version starts on its effective date
  if (body.correction === true && !locked && current.version === 1) {
    Object.assign(current, fields, { updatedBy: by });
    await current.save();
    await SalaryStructureHistory.findOneAndUpdate({ employee: emp._id, version: 1 }, { $set: { ...fields } });
    await logActivity({ action: 'salary_config_corrected', actor, employee: emp, brandId: emp.brandId, entity: 'EmployeeSalary', entityId: emp._id, details: { version: 1 } });
    return getSalary({ scope, employeeId });
  }
  if (locked && fields.effectiveFrom <= locked) throw new PayrollError(409, `Payroll already exists up to ${locked}. A salary change can only start after that date (or cancel the payroll first).`);
  if (fields.effectiveFrom <= current.effectiveFrom) throw new PayrollError(409, `The new salary must start after the current one (which started on ${current.effectiveFrom}). History is never overwritten.`);

  const version = current.version + 1;
  const closeTo = addDays(fields.effectiveFrom, -1);
  await SalaryStructureHistory.updateMany(
    { employee: emp._id, $or: [{ effectiveTo: null }, { effectiveTo: { $gt: closeTo } }] },
    { $set: { effectiveTo: closeTo, closedBy: by, closedAt: new Date() } }
  );
  await SalaryStructureHistory.create({ employee: emp._id, employeeCode: emp.employeeId, brandId: emp.brandId, version, ...fields, reason: reason || 'Salary revised', createdBy: by });
  Object.assign(current, fields, { version, updatedBy: by });
  await current.save();
  await logActivity({ action: 'salary_config_updated', actor, employee: emp, brandId: emp.brandId, entity: 'EmployeeSalary', entityId: emp._id, details: { version, effectiveFrom: fields.effectiveFrom, salaryType: fields.salaryType, baseAmountPaise: fields.baseAmountPaise, reason } });
  return getSalary({ scope, employeeId });
};

/** All stored versions of an employee as engine structures */
export const loadStructures = async (employeeId) => (await SalaryStructureHistory.find({ employee: employeeId }).sort({ version: 1 }).lean()).map((s) => ({ ...s }));

export const structureInForce = (structures, ds) => {
  let hit = null;
  for (const s of structures) if (s.effectiveFrom <= ds && (!s.effectiveTo || ds <= s.effectiveTo) && (!hit || s.version > hit.version)) hit = s;
  return hit;
};

// ───────────────────────── payment dates & periods ─────────────────────────

const lastDayOfMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const monthDay = (ym, day) => `${ym}-${String(day === 'LAST' ? lastDayOfMonth(ym) : Math.min(Number(day), lastDayOfMonth(ym))).padStart(2, '0')}`;
const nextMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };

/** The first date on or after `from` that satisfies the structure's payment day rule */
export const paymentDateOnOrAfter = (s, from) => {
  const f = s.paymentFrequency;
  if (f === 'DAILY' || f === 'CUSTOM') return from;
  if (f === 'WEEKLY') {
    const want = s.paymentDay && WEEKDAYS.includes(s.paymentDay) ? s.paymentDay : 'Saturday';
    let d = from;
    for (let i = 0; i < 7 && weekdayOfDateString(d) !== want; i += 1) d = addDays(d, 1);
    return d;
  }
  const day = s.paymentDay || '1';
  let ym = from.slice(0, 7);
  let d = monthDay(ym, day);
  if (d < from) { ym = nextMonth(ym); d = monthDay(ym, day); }
  return d;
};

/** Payment date of a payroll whose period ended on `periodTo` */
export const paymentDueFor = (s, periodTo) => (s ? paymentDateOnOrAfter(s, addDays(periodTo, 1)) : '');

/** The next payment date for an employee as seen from `today` */
export const nextPaymentDate = (s, today = istDateString()) => {
  if (!s) return null;
  if (s.paymentFrequency === 'DAILY') return today;
  if (s.paymentFrequency === 'CUSTOM') {
    const n = s.customPeriodDays || 1;
    let end = addDays(s.effectiveFrom, n - 1);
    let guard = 0;
    while (end < addDays(today, -1) && guard < 1000) { end = addDays(end, n); guard += 1; }
    return addDays(end, 1);
  }
  // the payroll that will be paid next is for the last completed period
  if (s.paymentFrequency === 'WEEKLY') return paymentDateOnOrAfter(s, today);
  return paymentDateOnOrAfter(s, today);
};

/** Suggested payroll period: the last COMPLETED month / week (Mon-Sun) / day. */
export const suggestPeriod = (frequency, today = istDateString(), custom = {}) => {
  if (frequency === 'DAILY') { const d = addDays(today, -1); return { periodFrom: d, periodTo: d }; }
  if (frequency === 'WEEKLY') {
    let monday = today;
    for (let i = 0; i < 7 && weekdayOfDateString(monday) !== 'Monday'; i += 1) monday = addDays(monday, -1);
    return { periodFrom: addDays(monday, -7), periodTo: addDays(monday, -1) };
  }
  if (frequency === 'CUSTOM' && custom.days && custom.start) {
    // periods of `days` days counted from `start`; the latest one that has already ended
    const n = custom.days;
    let from = custom.start;
    let guard = 0;
    while (addDays(from, 2 * n - 1) < today && guard < 2000) { from = addDays(from, n); guard += 1; }
    return { periodFrom: from, periodTo: addDays(from, n - 1) };
  }
  const first = `${today.slice(0, 7)}-01`;
  const prevLast = addDays(first, -1);
  return { periodFrom: `${prevLast.slice(0, 7)}-01`, periodTo: prevLast };
};

// ───────────────────────── adjustments & advances ─────────────────────────

const ADJ_LABEL = { BONUS: 'Bonus', INCENTIVE: 'Incentive', DEDUCTION: 'Other deduction', ADVANCE: 'Advance' };

export const shapeAdjustment = (a) => ({
  id: String(a._id), employee: String(a.employee), employeeCode: a.employeeCode, type: a.type, typeLabel: ADJ_LABEL[a.type], amountPaise: a.amountPaise, date: a.date,
  description: a.description, status: a.status, payroll: a.payroll ? String(a.payroll) : null, recoveryMode: a.recoveryMode, installmentPaise: a.installmentPaise,
  recoveredPaise: a.recoveredPaise, outstandingPaise: a.type === 'ADVANCE' ? Math.max(0, a.amountPaise - a.recoveredPaise) : 0, createdBy: a.createdBy, createdAt: a.createdAt,
});

export const createAdjustment = async ({ scope, employeeId, body, actor }) => {
  const emp = await Employee.findById(employeeId).select('_id employeeId fullName brandId').lean();
  if (!emp) throw new PayrollError(404, 'Employee not found.');
  assertInScope(scope, emp.brandId);
  need(['BONUS', 'INCENTIVE', 'DEDUCTION', 'ADVANCE'].includes(body.type), 'Choose bonus, incentive, deduction or advance.');
  let amountPaise;
  try { amountPaise = toPaise(body.amount, { allowZero: false }); } catch (e) { throw new PayrollError(400, e.message); }
  const date = body.date || istDateString();
  need(isValidDateString(date), 'Enter a valid date.');
  const doc = { employee: emp._id, employeeCode: emp.employeeId, brandId: emp.brandId, type: body.type, amountPaise, date, description: String(body.description || '').trim().slice(0, 300), createdBy: toActor(actor) };
  if (body.type === 'DEDUCTION' || body.type === 'BONUS' || body.type === 'INCENTIVE') need(doc.description, 'Add a short reason.');
  if (body.type === 'ADVANCE') {
    doc.recoveryMode = body.recoveryMode === 'INSTALLMENT' ? 'INSTALLMENT' : 'FULL';
    if (doc.recoveryMode === 'INSTALLMENT') {
      try { doc.installmentPaise = toPaise(body.installment, { allowZero: false }); } catch (e) { throw new PayrollError(400, `Instalment: ${e.message}`); }
      need(doc.installmentPaise <= amountPaise, 'The instalment cannot be more than the advance.');
    }
  }
  const row = await SalaryAdjustment.create(doc);
  await logActivity({ action: `payroll_${body.type.toLowerCase()}_added`, actor, employee: emp, brandId: emp.brandId, entity: 'SalaryAdjustment', entityId: row._id, details: { amountPaise, date, description: doc.description } });
  return shapeAdjustment(row);
};

export const cancelAdjustment = async ({ scope, id, reason, actor }) => {
  const a = await SalaryAdjustment.findById(id);
  if (!a) throw new PayrollError(404, 'Not found.');
  assertInScope(scope, a.brandId);
  if (a.status === 'APPLIED' || a.status === 'ATTACHED') throw new PayrollError(409, 'This entry is already part of a payroll. Remove it from the payroll first (draft) or cancel that payroll.');
  if (a.type === 'ADVANCE' && a.recoveredPaise > 0) throw new PayrollError(409, 'Part of this advance has already been recovered and can not be cancelled.');
  if (a.status === 'CANCELLED') return shapeAdjustment(a);
  a.status = 'CANCELLED'; a.cancelledBy = toActor(actor); a.cancelReason = String(reason || '').slice(0, 200);
  await a.save();
  await logActivity({ action: 'payroll_adjustment_cancelled', actor, brandId: a.brandId, entity: 'SalaryAdjustment', entityId: a._id, details: { type: a.type, amountPaise: a.amountPaise } });
  return shapeAdjustment(a);
};

export const listAdjustments = async ({ scope, employeeId, type, status, page = 1, limit = 50 }) => {
  const q = { ...brandFilter(scope) };
  if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) q.employee = employeeId;
  if (type) q.type = type;
  if (status) q.status = status;
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  const pg = Math.max(1, Number(page) || 1);
  const [rows, total] = await Promise.all([SalaryAdjustment.find(q).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(), SalaryAdjustment.countDocuments(q)]);
  return { adjustments: rows.map(shapeAdjustment), total, page: pg, pages: Math.max(1, Math.ceil(total / lim)) };
};

export const newCode = (prefix) => `${prefix}-${istDateString().slice(2, 4)}${istDateString().slice(5, 7)}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/** Monthly-equivalent of a structure, for the "estimated payroll" figure (an estimate, never used to pay anyone) */
export const monthlyEstimatePaise = (s) => {
  if (!s) return 0;
  const b = s.baseAmountPaise;
  if (s.salaryType === 'MONTHLY') return b;
  if (s.salaryType === 'WEEKLY') return ratio([b, 52], [12]);
  if (s.salaryType === 'DAILY') return ratio([b, s.workingDaysPerWeek, 52], [12]);
  return ratio([b, s.workingDaysPerWeek, s.workingMinutesPerDay, 52], [60 * 12]);
};

export { MoneyError };

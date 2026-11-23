import mongoose from 'mongoose';
import crypto from 'crypto';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import Holiday from '../models/Holiday.model.js';
import EmployeeSalary from '../models/EmployeeSalary.model.js';
import EmployeeSelfie from '../models/EmployeeSelfie.model.js';
import Payroll from '../models/Payroll.model.js';
import PayrollItem from '../models/PayrollItem.model.js';
import SalaryPayment from '../models/SalaryPayment.model.js';
import SalaryAdjustment from '../models/SalaryAdjustment.model.js';
import Brand from '../models/Brand.model.js';
import { calculateAttendancePay, totalsFromLines, eachDay } from './payrollEngine.js';
import {
  PayrollError, toActor, brandFilter, assertInScope, withTxn, getPolicy, loadStructures, structureInForce, shapeStructure, shapeAdjustment,
  paymentDueFor, nextPaymentDate, monthlyEstimatePaise, newCode,
} from './payrollSalary.js';
import { toPaise } from '../utils/payrollMoney.js';
import { istDateString, isValidDateString, addDays, logActivity, notifyEmployee, istMidnight } from './employeeCore.js';

const MAX_PERIOD_DAYS = 93;
const LIVE = ['DRAFT', 'CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID'];
const FINAL = ['APPROVED', 'PARTIALLY_PAID', 'PAID'];
const EDITABLE = ['DRAFT', 'CALCULATED'];

const hist = (action, actor, note = '', data = null) => ({ at: new Date(), action, by: toActor(actor), note, data });

// ───────────────────────── attendance lock ─────────────────────────

/** The approved payroll (if any) that covers a date for an employee. Attendance of such a day must not change. */
export const findLockingPayroll = async (employeeId, dateString) =>
  Payroll.findOne({ employee: employeeId, status: { $in: FINAL }, periodFrom: { $lte: dateString }, periodTo: { $gte: dateString } }).select('payrollCode periodFrom periodTo status').lean();

/** Throws 423 when the date is inside an approved payroll period. Called by every code path that edits attendance. */
export const assertAttendanceUnlocked = async (employeeId, dates) => {
  for (const ds of [].concat(dates)) {
    // eslint-disable-next-line no-await-in-loop
    const p = await findLockingPayroll(employeeId, ds);
    if (p) throw new PayrollError(423, `Attendance for ${ds} is locked: payroll ${p.payrollCode} (${p.periodFrom} to ${p.periodTo}) is already ${p.status.toLowerCase().replace('_', ' ')}. A Super Admin must cancel that payroll before this day can change.`);
  }
};

// ───────────────────────── calculation ─────────────────────────

const loadInputs = async (emp, periodFrom, periodTo) => {
  const [recs, leaves, holidays, structures] = await Promise.all([
    Attendance.find({ employee: emp._id, dateString: { $gte: periodFrom, $lte: periodTo } }).lean(),
    LeaveRequest.find({ employee: emp._id, status: 'Approved', startDate: { $lte: istMidnight(periodTo) }, endDate: { $gte: istMidnight(periodFrom) } }).lean(),
    Holiday.find({ dateString: { $gte: periodFrom, $lte: periodTo }, brandId: { $in: [emp.brandId, 'ALL'] }, isOptional: { $ne: true } }).select('dateString').lean(),
    loadStructures(emp._id),
  ]);
  return {
    records: new Map(recs.map((r) => [r.dateString, r])),
    leaves: leaves.map((l) => ({ leaveType: l.leaveType, startDate: istDateString(l.startDate), endDate: istDateString(l.endDate), isHalfDay: Boolean(l.isHalfDay) })),
    holidays: new Set(holidays.map((h) => h.dateString)),
    structures,
  };
};

/**
 * Full calculation for one employee and period: the attendance engine plus bonuses, other deductions and advance recovery.
 * Nothing is written here. `payrollId` lets a recalculation re-use what is already attached to that payroll.
 */
export const computePayroll = async ({ emp, periodFrom, periodTo, overtimeMinutes = null, payrollId = null, policy }) => {
  const inputs = await loadInputs(emp, periodFrom, periodTo);
  if (!inputs.structures.length) throw new PayrollError(422, 'No salary has been configured for this employee.');
  const overtime = policy.overtimeApproval === 'AUTO' ? { mode: 'AUTO' } : { mode: 'MANUAL', approvedMinutes: overtimeMinutes || 0 };
  const joining = emp.joiningDate ? istDateString(emp.joiningDate) : null;
  const r = calculateAttendancePay({ periodFrom, periodTo, structures: inputs.structures, joiningDate: joining, records: inputs.records, leaves: inputs.leaves, holidays: inputs.holidays, overtime });
  const lines = r.lines.map((l) => ({ ...l }));

  // bonuses / incentives / other deductions: unattached ones dated up to the period end, plus those already attached to this payroll
  const adjQ = { employee: emp._id, type: { $in: ['BONUS', 'INCENTIVE', 'DEDUCTION'] }, $or: [{ status: 'ACTIVE', date: { $lte: periodTo } }, ...(payrollId ? [{ payroll: payrollId, status: 'ATTACHED' }] : [])] };
  const adjustments = await SalaryAdjustment.find(adjQ).sort({ date: 1, createdAt: 1 });
  for (const a of adjustments) {
    lines.push({
      kind: a.type === 'DEDUCTION' ? 'DEDUCTION' : 'EARNING',
      code: a.type === 'DEDUCTION' ? 'OTHER_DEDUCTION' : a.type,
      label: `${a.type === 'BONUS' ? 'Bonus' : a.type === 'INCENTIVE' ? 'Incentive' : 'Deduction'}${a.description ? `: ${a.description}` : ''}`,
      quantity: 1, unit: 'COUNT', amountPaise: a.amountPaise, source: 'ADJUSTMENT', refId: a._id,
    });
  }

  // advance recovery, limited to what is left after the other deductions (net pay never goes below zero because of an advance)
  const before = totalsFromLines(lines);
  let room = Math.max(0, before.grossPaise - before.deductionsPaise);
  const advances = await SalaryAdjustment.find({ employee: emp._id, type: 'ADVANCE', $or: [{ status: 'ACTIVE' }, ...(payrollId ? [{ 'recoveries.payroll': payrollId, status: 'APPLIED' }] : [])] }).sort({ date: 1 });
  const recoveries = [];
  for (const a of advances) {
    const mine = a.recoveries.filter((x) => !x.reversed && payrollId && String(x.payroll) === String(payrollId)).reduce((t, x) => t + x.amountPaise, 0);
    const outstanding = a.amountPaise - (a.recoveredPaise - mine);
    if (outstanding <= 0 || a.date > periodTo) continue;
    const want = a.recoveryMode === 'INSTALLMENT' ? Math.min(outstanding, a.installmentPaise) : outstanding;
    const take = Math.min(want, room);
    if (take <= 0) continue;
    room -= take;
    recoveries.push({ advance: a._id, amountPaise: take });
    lines.push({ kind: 'DEDUCTION', code: 'ADVANCE_RECOVERY', label: `Advance recovery${a.description ? `: ${a.description}` : ''} (given ${a.date})`, quantity: 1, unit: 'COUNT', amountPaise: take, source: 'ADVANCE', refId: a._id });
  }

  const totals = totalsFromLines(lines);
  const warnings = [...r.warnings];
  if (totals.shortfallPaise > 0) warnings.push('Deductions are more than earnings. Net pay is limited to zero; the uncovered amount is not carried forward.');
  const missedSelfies = await EmployeeSelfie.countDocuments({ employee: emp._id, workDate: { $gte: periodFrom, $lte: periodTo }, missedAt: { $ne: null } });
  const used = [...new Set(r.days.filter((d) => d.cls !== 'NO_STRUCTURE' && d.cls !== 'NOT_JOINED').map((d) => structureInForce(inputs.structures, d.date)?.version))].filter(Boolean);
  return {
    lines, totals, summary: r.summary, days: r.days, warnings, adjustments: adjustments.map((a) => a._id), recoveries,
    overtimeCandidateMinutes: r.overtimeCandidateMinutes, overtimeApprovedMinutes: r.overtimeApprovedMinutes, selfieMissedCount: missedSelfies,
    structures: inputs.structures.filter((s) => used.includes(s.version)).map((s) => ({ ...s, _id: undefined, createdBy: undefined, closedBy: undefined })),
    structure: structureInForce(inputs.structures, periodTo) || inputs.structures[inputs.structures.length - 1],
  };
};

const validatePeriod = (periodFrom, periodTo, today = istDateString()) => {
  if (!isValidDateString(periodFrom) || !isValidDateString(periodTo)) throw new PayrollError(400, 'Choose a valid payroll period.');
  if (periodFrom > periodTo) throw new PayrollError(400, 'The period start must not be after its end.');
  if (periodTo >= today) throw new PayrollError(400, 'A payroll period must be completely over (it can end yesterday at the latest), so attendance is final.');
  if (eachDay(periodFrom, periodTo).length > MAX_PERIOD_DAYS) throw new PayrollError(400, `A payroll period can be at most ${MAX_PERIOD_DAYS} days.`);
};

/** Replace the stored lines of a payroll and re-attach bonuses / advance recoveries consistently */
const persistCalculation = async (payroll, calc, { attach = true } = {}) => {
  await PayrollItem.deleteMany({ payroll: payroll._id });
  if (calc.lines.length) {
    await PayrollItem.insertMany(calc.lines.map((l) => ({ payroll: payroll._id, employee: payroll.employee, brandId: payroll.brandId, kind: l.kind, code: l.code, label: l.label, quantity: l.quantity || 0, unit: l.unit || '', amountPaise: l.amountPaise, source: l.source || 'SYSTEM', refId: l.refId || null })));
  }
  if (attach) {
    // free what this payroll held, then take what it uses now
    await SalaryAdjustment.updateMany({ payroll: payroll._id, status: 'ATTACHED' }, { $set: { status: 'ACTIVE', payroll: null } });
    if (calc.adjustments.length) await SalaryAdjustment.updateMany({ _id: { $in: calc.adjustments } }, { $set: { status: 'ATTACHED', payroll: payroll._id } });
    const held = await SalaryAdjustment.find({ type: 'ADVANCE', 'recoveries.payroll': payroll._id });
    for (const a of held) {
      a.recoveries = a.recoveries.filter((x) => String(x.payroll) !== String(payroll._id));
      a.recoveredPaise = a.recoveries.filter((x) => !x.reversed).reduce((t, x) => t + x.amountPaise, 0);
      a.status = 'ACTIVE';
      // eslint-disable-next-line no-await-in-loop
      await a.save();
    }
    for (const rc of calc.recoveries) {
      // eslint-disable-next-line no-await-in-loop
      const a = await SalaryAdjustment.findById(rc.advance);
      a.recoveries.push({ payroll: payroll._id, amountPaise: rc.amountPaise });
      a.recoveredPaise = a.recoveries.filter((x) => !x.reversed).reduce((t, x) => t + x.amountPaise, 0);
      a.status = a.recoveredPaise >= a.amountPaise ? 'APPLIED' : 'ACTIVE';
      // eslint-disable-next-line no-await-in-loop
      await a.save();
    }
  }
};

const applyCalcToDoc = (p, calc) => {
  p.summary = calc.summary;
  p.days = calc.days;
  p.warnings = calc.warnings;
  p.structures = calc.structures;
  p.selfieMissedCount = calc.selfieMissedCount;
  p.overtimeCandidateMinutes = calc.overtimeCandidateMinutes;
  p.overtimeApprovedMinutes = calc.overtimeApprovedMinutes;
  p.grossPaise = calc.totals.grossPaise;
  p.deductionsPaise = calc.totals.deductionsPaise;
  p.advanceRecoveryPaise = calc.totals.advanceRecoveryPaise;
  p.netPaise = calc.totals.netPaise;
  p.shortfallPaise = calc.totals.shortfallPaise;
  p.salaryType = calc.structure.salaryType;
  p.paymentFrequency = calc.structure.paymentFrequency;
  p.paymentDueDate = paymentDueFor(calc.structure, p.periodTo);
};

// ───────────────────────── generate / recalculate / edit ─────────────────────────

export const previewPayroll = async ({ scope, employeeId, periodFrom, periodTo }) => {
  validatePeriod(periodFrom, periodTo);
  const emp = await Employee.findById(employeeId).lean();
  if (!emp) throw new PayrollError(404, 'Employee not found.');
  assertInScope(scope, emp.brandId);
  const policy = await getPolicy(emp.brandId);
  const calc = await computePayroll({ emp, periodFrom, periodTo, policy });
  return { employee: { id: String(emp._id), employeeId: emp.employeeId, name: emp.fullName }, periodFrom, periodTo, lines: calc.lines, ...calc.totals, summary: calc.summary, warnings: calc.warnings, days: calc.days };
};

export const generatePayrolls = async ({ scope, employeeIds, all = false, department, periodFrom, periodTo, actor }) => {
  validatePeriod(periodFrom, periodTo);
  const q = { ...brandFilter(scope), registrationStatus: { $ne: 'Pending' } };
  if (all) { if (department) q.department = department; } else {
    const ids = (employeeIds || []).filter((x) => mongoose.Types.ObjectId.isValid(x));
    if (!ids.length) throw new PayrollError(400, 'Select at least one employee.');
    q._id = { $in: ids };
  }
  const emps = await Employee.find(q).lean();
  if (!emps.length) throw new PayrollError(404, 'No matching employees.');
  const batchId = newCode('RUN');
  const results = [];
  for (const emp of emps) {
    const base = { employee: String(emp._id), employeeId: emp.employeeId, name: emp.fullName };
    try {
      // eslint-disable-next-line no-await-in-loop
      const overlap = await Payroll.findOne({ employee: emp._id, status: { $ne: 'CANCELLED' }, periodFrom: { $lte: periodTo }, periodTo: { $gte: periodFrom } }).select('payrollCode periodFrom periodTo').lean();
      if (overlap) { results.push({ ...base, ok: false, reason: `Payroll ${overlap.payrollCode} already exists for ${overlap.periodFrom} to ${overlap.periodTo}.`, code: 'DUPLICATE' }); continue; }
      // eslint-disable-next-line no-await-in-loop
      const policy = await getPolicy(emp.brandId);
      // eslint-disable-next-line no-await-in-loop
      const calc = await computePayroll({ emp, periodFrom, periodTo, policy });
      if (!calc.summary.eligibleDays) { results.push({ ...base, ok: false, reason: 'No salary structure covers this period (or the employee had not joined yet).', code: 'NO_SALARY' }); continue; }
      const p = new Payroll({
        payrollCode: newCode('PAY'), batchId, employee: emp._id, employeeCode: emp.employeeId, employeeName: emp.fullName, department: emp.department, designation: emp.designation,
        brandId: emp.brandId, periodFrom, periodTo, activeKey: `${emp._id}|${periodFrom}|${periodTo}`, salaryType: calc.structure.salaryType, paymentFrequency: calc.structure.paymentFrequency, status: 'DRAFT', createdBy: toActor(actor),
      });
      applyCalcToDoc(p, calc);
      p.status = 'CALCULATED'; p.calculatedAt = new Date(); p.calculatedBy = toActor(actor);
      p.history.push(hist('DRAFT', actor), hist('CALCULATED', actor, 'Calculated from approved attendance'));
      // eslint-disable-next-line no-await-in-loop
      await p.save();
      // eslint-disable-next-line no-await-in-loop
      await persistCalculation(p, calc);
      // eslint-disable-next-line no-await-in-loop
      await logActivity({ action: 'payroll_generated', actor, employee: emp, brandId: emp.brandId, entity: 'Payroll', entityId: p._id, details: { payrollCode: p.payrollCode, periodFrom, periodTo, netPaise: p.netPaise } });
      results.push({ ...base, ok: true, payroll: String(p._id), payrollCode: p.payrollCode, netPaise: p.netPaise });
    } catch (err) {
      if (err?.code === 11000) results.push({ ...base, ok: false, reason: 'A payroll for this employee and period already exists.', code: 'DUPLICATE' });
      else if (err instanceof PayrollError) results.push({ ...base, ok: false, reason: err.message, code: err.status === 422 ? 'NO_SALARY' : 'ERROR' });
      else throw err;
    }
  }
  return { batchId, periodFrom, periodTo, created: results.filter((r) => r.ok).length, skipped: results.filter((r) => !r.ok).length, results };
};

const loadPayroll = async (id, scope, { lean = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new PayrollError(404, 'Payroll not found.');
  const p = await (lean ? Payroll.findById(id).lean() : Payroll.findById(id));
  if (!p) throw new PayrollError(404, 'Payroll not found.');
  assertInScope(scope, p.brandId);
  return p;
};

export const shapePayroll = (p, extra = {}) => {
  const o = p.toObject ? p.toObject() : p;
  return {
    id: String(o._id), payrollCode: o.payrollCode, batchId: o.batchId, employee: String(o.employee), employeeCode: o.employeeCode, employeeName: o.employeeName, department: o.department, designation: o.designation,
    brandId: o.brandId, periodFrom: o.periodFrom, periodTo: o.periodTo, salaryType: o.salaryType, paymentFrequency: o.paymentFrequency, paymentDueDate: o.paymentDueDate, status: o.status,
    grossPaise: o.grossPaise, deductionsPaise: o.deductionsPaise, advanceRecoveryPaise: o.advanceRecoveryPaise, netPaise: o.netPaise, shortfallPaise: o.shortfallPaise, paidPaise: o.paidPaise, balancePaise: Math.max(0, o.netPaise - o.paidPaise),
    overtimeCandidateMinutes: o.overtimeCandidateMinutes, overtimeApprovedMinutes: o.overtimeApprovedMinutes, selfieMissedCount: o.selfieMissedCount, warnings: o.warnings,
    calculatedAt: o.calculatedAt, calculatedBy: o.calculatedBy, submittedAt: o.submittedAt, submittedBy: o.submittedBy, approvedAt: o.approvedAt, approvedBy: o.approvedBy, cancelledAt: o.cancelledAt, cancelledBy: o.cancelledBy, cancelReason: o.cancelReason,
    locked: Boolean(o.lockedAt), createdAt: o.createdAt, ...extra,
  };
};

export const getPayrollDetail = async ({ scope, id, forEmployee = null }) => {
  const p = await loadPayroll(id, scope);
  if (forEmployee && String(p.employee) !== String(forEmployee)) throw new PayrollError(404, 'Payroll not found.');
  const [items, payments, policy] = await Promise.all([
    PayrollItem.find({ payroll: p._id }).sort({ kind: 1, createdAt: 1 }).lean(),
    SalaryPayment.find({ payroll: p._id }).sort({ createdAt: 1 }).lean(),
    getPolicy(p.brandId),
  ]);
  return {
    ...shapePayroll(p),
    summary: p.summary, days: p.days, structures: (p.structures || []).map((s) => shapeStructure(s)),
    items: items.map((i) => ({ id: String(i._id), kind: i.kind, code: i.code, label: i.label, quantity: i.quantity, unit: i.unit, amountPaise: i.amountPaise, source: i.source, refId: i.refId ? String(i.refId) : null })),
    payments: payments.map(shapePayment),
    history: forEmployee ? undefined : p.history,
    policy: forEmployee ? undefined : { adminCanApprove: policy.adminCanApprove, adminCanRecordPayments: policy.adminCanRecordPayments, overtimeApproval: policy.overtimeApproval },
  };
};

export const recalculatePayroll = async ({ scope, id, actor, overtimeApprovedMinutes = undefined, note = 'Recalculated' }) => {
  const p = await loadPayroll(id, scope);
  if (!EDITABLE.includes(p.status)) throw new PayrollError(409, 'Only a payroll that is not yet submitted can be recalculated. Send it back from approval first.');
  const emp = await Employee.findById(p.employee).lean();
  const policy = await getPolicy(p.brandId);
  const ot = overtimeApprovedMinutes === undefined ? p.overtimeApprovedMinutes : overtimeApprovedMinutes;
  const calc = await computePayroll({ emp, periodFrom: p.periodFrom, periodTo: p.periodTo, overtimeMinutes: ot, payrollId: p._id, policy });
  applyCalcToDoc(p, calc);
  p.status = 'CALCULATED'; p.calculatedAt = new Date(); p.calculatedBy = toActor(actor);
  p.history.push(hist('RECALCULATED', actor, note, { netPaise: p.netPaise }));
  await p.save();
  await persistCalculation(p, calc);
  await logActivity({ action: 'payroll_recalculated', actor, employee: emp, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { note, netPaise: p.netPaise } });
  return getPayrollDetail({ scope, id });
};

export const setOvertime = async ({ scope, id, minutes, actor }) => {
  const m = Number(minutes);
  if (!Number.isInteger(m) || m < 0) throw new PayrollError(400, 'Enter the approved overtime in whole minutes.');
  const p = await loadPayroll(id, scope);
  if (!EDITABLE.includes(p.status)) throw new PayrollError(409, 'Overtime can only be approved before the payroll is submitted.');
  if (m > p.overtimeCandidateMinutes) throw new PayrollError(400, `Only ${p.overtimeCandidateMinutes} minutes of overtime were worked.`);
  p.history.push(hist('OVERTIME_APPROVED', actor, `${m} of ${p.overtimeCandidateMinutes} minutes`, { before: p.overtimeApprovedMinutes, after: m }));
  await p.save();
  return recalculatePayroll({ scope, id, actor, overtimeApprovedMinutes: m, note: `Overtime approved: ${m} min` });
};

export const addPayrollAdjustment = async ({ scope, id, body, actor }) => {
  const p = await loadPayroll(id, scope);
  if (!EDITABLE.includes(p.status)) throw new PayrollError(409, 'Adjustments can only be changed before the payroll is submitted.');
  if (!['BONUS', 'INCENTIVE', 'DEDUCTION'].includes(body.type)) throw new PayrollError(400, 'Choose bonus, incentive or deduction.');
  let amountPaise;
  try { amountPaise = toPaise(body.amount, { allowZero: false }); } catch (e) { throw new PayrollError(400, e.message); }
  const description = String(body.description || '').trim().slice(0, 300);
  if (!description) throw new PayrollError(400, 'Add a short reason. It is kept in the audit trail.');
  const a = await SalaryAdjustment.create({ employee: p.employee, employeeCode: p.employeeCode, brandId: p.brandId, type: body.type, amountPaise, date: p.periodTo, description, status: 'ACTIVE', createdBy: toActor(actor) });
  p.history.push(hist('ADJUSTMENT_ADDED', actor, `${body.type} ${description}`, { amountPaise, adjustment: String(a._id) }));
  await p.save();
  await logActivity({ action: 'payroll_adjusted', actor, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { type: body.type, amountPaise, description } });
  return recalculatePayroll({ scope, id, actor, note: `${body.type} added` });
};

export const removePayrollAdjustment = async ({ scope, id, adjustmentId, actor }) => {
  const p = await loadPayroll(id, scope);
  if (!EDITABLE.includes(p.status)) throw new PayrollError(409, 'Adjustments can only be changed before the payroll is submitted.');
  const a = await SalaryAdjustment.findOne({ _id: adjustmentId, payroll: p._id, status: 'ATTACHED' });
  if (!a) throw new PayrollError(404, 'That entry is not part of this payroll.');
  a.status = 'CANCELLED'; a.cancelledBy = toActor(actor); a.cancelReason = 'Removed from payroll';
  a.payroll = null;
  await a.save();
  p.history.push(hist('ADJUSTMENT_REMOVED', actor, `${a.type} ${a.description}`, { amountPaise: a.amountPaise }));
  await p.save();
  await logActivity({ action: 'payroll_adjusted', actor, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { removed: a.type, amountPaise: a.amountPaise } });
  return recalculatePayroll({ scope, id, actor, note: 'Entry removed' });
};

// ───────────────────────── workflow ─────────────────────────

const roleOf = (actor) => String(actor?.type || actor?.role || '').replace(/-/g, '_');
const isSuper = (actor) => roleOf(actor) === 'super_admin';

export const submitPayroll = async ({ scope, id, actor }) => {
  const p = await loadPayroll(id, scope);
  const r = await Payroll.findOneAndUpdate({ _id: p._id, status: 'CALCULATED' }, { $set: { status: 'PENDING_APPROVAL', submittedAt: new Date(), submittedBy: toActor(actor) }, $push: { history: hist('PENDING_APPROVAL', actor, 'Submitted for approval') } }, { new: true });
  if (!r) throw new PayrollError(409, `Only a calculated payroll can be submitted (this one is ${p.status.toLowerCase().replace('_', ' ')}).`);
  await logActivity({ action: 'payroll_submitted', actor, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { payrollCode: p.payrollCode } });
  return getPayrollDetail({ scope, id });
};

export const rejectPayroll = async ({ scope, id, reason, actor }) => {
  const p = await loadPayroll(id, scope);
  const policy = await getPolicy(p.brandId);
  if (!isSuper(actor) && !policy.adminCanApprove) throw new PayrollError(403, 'You are not allowed to review payroll approvals.');
  if (!String(reason || '').trim()) throw new PayrollError(400, 'Tell the preparer why it is sent back.');
  const r = await Payroll.findOneAndUpdate({ _id: p._id, status: 'PENDING_APPROVAL' }, { $set: { status: 'CALCULATED', submittedAt: null, submittedBy: null }, $push: { history: hist('SENT_BACK', actor, String(reason).slice(0, 300)) } }, { new: true });
  if (!r) throw new PayrollError(409, 'Only a payroll waiting for approval can be sent back.');
  await logActivity({ action: 'payroll_rejected', actor, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { reason } });
  return getPayrollDetail({ scope, id });
};

export const approvePayroll = async ({ scope, id, actor }) => {
  const p = await loadPayroll(id, scope);
  const policy = await getPolicy(p.brandId);
  if (!isSuper(actor)) {
    if (!policy.adminCanApprove) throw new PayrollError(403, 'Only a Super Admin can approve payroll. (A Super Admin can allow Admins to approve in the payroll policy.)');
    if (!policy.allowSelfApproval && String(p.submittedBy?.id) === String(actor.id)) throw new PayrollError(403, 'You submitted this payroll, so someone else must approve it.');
  }
  await withTxn(async (session) => {
    const opt = session ? { session } : {};
    const done = await Payroll.findOneAndUpdate(
      { _id: p._id, status: 'PENDING_APPROVAL' },
      { $set: { status: p.netPaise === 0 ? 'PAID' : 'APPROVED', approvedAt: new Date(), approvedBy: toActor(actor), lockedAt: new Date() }, $push: { history: hist('APPROVED', actor, 'Approved. Attendance for this period is now locked') } },
      { new: true, ...opt }
    );
    if (!done) throw new PayrollError(409, 'Only a payroll waiting for approval can be approved.');
    await SalaryAdjustment.updateMany({ payroll: p._id, status: 'ATTACHED' }, { $set: { status: 'APPLIED' } }, opt);
  });
  await logActivity({ action: 'payroll_approved', actor, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { payrollCode: p.payrollCode, netPaise: p.netPaise } });
  const emp = await Employee.findById(p.employee).select('_id employeeId brandId').lean();
  if (emp) await notifyEmployee(emp, { type: 'general', title: 'Salary approved', message: `Your salary for ${p.periodFrom} to ${p.periodTo} has been approved.`, link: '/employee/salary' }).catch(() => {});
  return getPayrollDetail({ scope, id });
};

export const cancelPayroll = async ({ scope, id, reason, actor }) => {
  const p = await loadPayroll(id, scope);
  if (p.status === 'CANCELLED') throw new PayrollError(409, 'This payroll is already cancelled.');
  if (!String(reason || '').trim()) throw new PayrollError(400, 'Give a reason for cancelling.');
  if (FINAL.includes(p.status) && !isSuper(actor)) throw new PayrollError(403, 'Only a Super Admin can cancel an approved payroll.');
  const active = await SalaryPayment.countDocuments({ payroll: p._id, status: 'RECORDED' });
  if (active) throw new PayrollError(409, 'Payments are recorded against this payroll. Reverse them first (Super Admin), then cancel.');
  await withTxn(async (session) => {
    const opt = session ? { session } : {};
    const done = await Payroll.findOneAndUpdate({ _id: p._id, status: { $in: ['DRAFT', 'CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID'] } }, { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: toActor(actor), cancelReason: String(reason).slice(0, 300), lockedAt: null }, $unset: { activeKey: 1 }, $push: { history: hist('CANCELLED', actor, String(reason).slice(0, 300)) } }, { new: true, ...opt });
    if (!done) throw new PayrollError(409, 'This payroll can no longer be cancelled.');
    // give back bonuses / deductions and advance recoveries, so the next payroll picks them up again
    await SalaryAdjustment.updateMany({ payroll: p._id, status: { $in: ['ATTACHED', 'APPLIED'] }, type: { $ne: 'ADVANCE' } }, { $set: { status: 'ACTIVE', payroll: null } }, opt);
    const held = await SalaryAdjustment.find({ type: 'ADVANCE', 'recoveries.payroll': p._id }, null, opt);
    for (const a of held) {
      a.recoveries = a.recoveries.filter((x) => String(x.payroll) !== String(p._id));
      a.recoveredPaise = a.recoveries.filter((x) => !x.reversed).reduce((t, x) => t + x.amountPaise, 0);
      a.status = 'ACTIVE';
      // eslint-disable-next-line no-await-in-loop
      await a.save(opt);
    }
  });
  await logActivity({ action: 'payroll_cancelled', actor, brandId: p.brandId, entity: 'Payroll', entityId: p._id, details: { payrollCode: p.payrollCode, reason } });
  return getPayrollDetail({ scope, id });
};

// ───────────────────────── payments ─────────────────────────

export const shapePayment = (x) => ({
  id: String(x._id), paymentCode: x.paymentCode, payroll: String(x.payroll), employee: String(x.employee), employeeCode: x.employeeCode, employeeName: x.employeeName, amountPaise: x.amountPaise,
  paidOn: x.paidOn, method: x.method, reference: x.reference, remarks: x.remarks, status: x.status, recordedBy: x.recordedBy, recordedAt: x.createdAt, reversedAt: x.reversedAt, reverseReason: x.reverseReason,
});

/** status derived from the stored paid total in ONE atomic step, so two payments recorded at the same moment can not leave a wrong status */
const syncPaidStatus = async (id) => {
  const r = await Payroll.findOneAndUpdate({ _id: id, status: { $in: ['APPROVED', 'PARTIALLY_PAID', 'PAID'] } }, [{ $set: { status: { $cond: [{ $gte: ['$paidPaise', '$netPaise'] }, 'PAID', { $cond: [{ $gt: ['$paidPaise', 0] }, 'PARTIALLY_PAID', 'APPROVED'] }] } } }], { new: true, updatePipeline: true });
  return r?.status;
};

export const recordPayment = async ({ scope, id, body, actor }) => {
  const p = await loadPayroll(id, scope);
  const policy = await getPolicy(p.brandId);
  if (!isSuper(actor) && !policy.adminCanRecordPayments) throw new PayrollError(403, 'You are not allowed to record salary payments.');
  if (!['APPROVED', 'PARTIALLY_PAID'].includes(p.status)) throw new PayrollError(409, p.status === 'PAID' ? 'This payroll is already fully paid.' : 'Payments can only be recorded against an approved payroll.');
  let amountPaise;
  try { amountPaise = toPaise(body.amount, { allowZero: false }); } catch (e) { throw new PayrollError(400, `Amount: ${e.message}`); }
  const balance = p.netPaise - p.paidPaise;
  if (amountPaise > balance) throw new PayrollError(400, `The amount is more than the balance due (${(balance / 100).toFixed(2)}).`);
  const paidOn = body.paidOn || istDateString();
  if (!isValidDateString(paidOn)) throw new PayrollError(400, 'Enter a valid payment date.');
  if (paidOn > istDateString()) throw new PayrollError(400, 'The payment date cannot be in the future.');
  const method = String(body.method || '');
  if (!['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER'].includes(method)) throw new PayrollError(400, 'Choose how it was paid.');
  const reference = String(body.reference || '').trim().slice(0, 80);
  if ((method === 'BANK_TRANSFER' || method === 'UPI') && !reference) throw new PayrollError(400, 'Enter the transaction reference. It is how the payment is traced later.');
  const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey).slice(0, 80) : undefined;
  if (idempotencyKey) {
    const same = await SalaryPayment.findOne({ payroll: p._id, idempotencyKey });
    if (same) return { duplicate: true, payment: shapePayment(same), payroll: await getPayrollDetail({ scope, id }) };
  }

  // atomic: the paid total can never exceed the net, even with two admins clicking at once
  const bumped = await Payroll.findOneAndUpdate(
    { _id: p._id, status: { $in: ['APPROVED', 'PARTIALLY_PAID'] }, $expr: { $lte: [{ $add: ['$paidPaise', amountPaise] }, '$netPaise'] } },
    { $inc: { paidPaise: amountPaise } },
    { new: true }
  );
  if (!bumped) throw new PayrollError(409, 'The balance changed. Reload the payroll and try again.');
  let payment;
  try {
    payment = await SalaryPayment.create({
      paymentCode: newCode('PMT'), payroll: p._id, employee: p.employee, employeeCode: p.employeeCode, employeeName: p.employeeName, brandId: p.brandId, amountPaise, paidOn, method, reference,
      remarks: String(body.remarks || '').trim().slice(0, 300), idempotencyKey, recordedBy: toActor(actor),
    });
  } catch (err) {
    await Payroll.updateOne({ _id: p._id }, { $inc: { paidPaise: -amountPaise } });
    if (err?.code === 11000) throw new PayrollError(409, 'This payment looks like a duplicate: the same transaction reference was already recorded for this payroll.');
    throw err;
  }
  const status = await syncPaidStatus(p._id);
  await Payroll.updateOne({ _id: p._id }, { $push: { history: hist('PAYMENT', actor, `${(amountPaise / 100).toFixed(2)} by ${method}`, { payment: payment.paymentCode, reference }) } });
  await logActivity({ action: 'payroll_payment_recorded', actor, brandId: p.brandId, entity: 'SalaryPayment', entityId: payment._id, details: { payrollCode: p.payrollCode, amountPaise, method, reference, status } });
  const emp = await Employee.findById(p.employee).select('_id employeeId brandId').lean();
  if (emp) await notifyEmployee(emp, { type: 'general', title: 'Salary payment recorded', message: `A salary payment of Rs ${(amountPaise / 100).toFixed(2)} was recorded for ${p.periodFrom} to ${p.periodTo}.`, link: '/employee/salary' }).catch(() => {});
  return { duplicate: false, payment: shapePayment(payment), payroll: await getPayrollDetail({ scope, id }) };
};

export const reversePayment = async ({ scope, paymentId, reason, actor }) => {
  if (!isSuper(actor)) throw new PayrollError(403, 'Only a Super Admin can reverse a recorded payment.');
  if (!String(reason || '').trim()) throw new PayrollError(400, 'Give a reason for reversing the payment.');
  const pay = await SalaryPayment.findById(paymentId);
  if (!pay) throw new PayrollError(404, 'Payment not found.');
  assertInScope(scope, pay.brandId);
  const flipped = await SalaryPayment.findOneAndUpdate({ _id: pay._id, status: 'RECORDED' }, { $set: { status: 'REVERSED', reversedBy: toActor(actor), reversedAt: new Date(), reverseReason: String(reason).slice(0, 300) } }, { new: true });
  if (!flipped) throw new PayrollError(409, 'This payment was already reversed.');
  const p = await Payroll.findOneAndUpdate({ _id: pay.payroll }, { $inc: { paidPaise: -pay.amountPaise } }, { new: true });
  await syncPaidStatus(p._id);
  await Payroll.updateOne({ _id: p._id }, { $push: { history: hist('PAYMENT_REVERSED', actor, String(reason).slice(0, 300), { payment: pay.paymentCode }) } });
  await logActivity({ action: 'payroll_payment_reversed', actor, brandId: p.brandId, entity: 'SalaryPayment', entityId: pay._id, details: { payrollCode: p.payrollCode, amountPaise: pay.amountPaise, reason } });
  return getPayrollDetail({ scope, id: String(p._id) });
};

// ───────────────────────── lists ─────────────────────────

const payrollQuery = (scope, f = {}) => {
  const q = { ...brandFilter(scope) };
  if (f.employeeId && mongoose.Types.ObjectId.isValid(f.employeeId)) q.employee = f.employeeId;
  if (f.department) q.department = f.department;
  if (f.salaryType) q.salaryType = f.salaryType;
  if (f.status) q.status = f.status; else if (!f.includeCancelled) q.status = { $ne: 'CANCELLED' };
  if (f.from) q.periodTo = { ...(q.periodTo || {}), $gte: f.from };
  if (f.to) q.periodFrom = { ...(q.periodFrom || {}), $lte: f.to };
  if (f.batchId) q.batchId = f.batchId;
  if (f.paymentStatus === 'UNPAID') { q.status = { $in: ['APPROVED'] }; } else if (f.paymentStatus === 'PARTIAL') q.status = 'PARTIALLY_PAID'; else if (f.paymentStatus === 'PAID') q.status = 'PAID';
  if (f.search) { const rx = new RegExp(String(f.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); q.$or = [{ employeeName: rx }, { employeeCode: rx }, { payrollCode: rx }]; }
  return q;
};

export const listPayrolls = async ({ scope, filters = {}, page = 1, limit = 25 }) => {
  const q = payrollQuery(scope, filters);
  const lim = Math.min(200, Math.max(1, Number(limit) || 25));
  const pg = Math.max(1, Number(page) || 1);
  const [rows, total] = await Promise.all([Payroll.find(q).sort({ periodTo: -1, employeeName: 1 }).skip((pg - 1) * lim).limit(lim).select('-days -history -structures -summary').lean(), Payroll.countDocuments(q)]);
  return { payrolls: rows.map((r) => shapePayroll(r)), total, page: pg, pages: Math.max(1, Math.ceil(total / lim)) };
};

export const listPayments = async ({ scope, filters = {}, page = 1, limit = 25 }) => {
  const q = { ...brandFilter(scope) };
  if (filters.employeeId && mongoose.Types.ObjectId.isValid(filters.employeeId)) q.employee = filters.employeeId;
  if (filters.method) q.method = filters.method;
  if (filters.status) q.status = filters.status;
  if (filters.from) q.paidOn = { ...(q.paidOn || {}), $gte: filters.from };
  if (filters.to) q.paidOn = { ...(q.paidOn || {}), $lte: filters.to };
  const lim = Math.min(200, Math.max(1, Number(limit) || 25));
  const pg = Math.max(1, Number(page) || 1);
  const [rows, total] = await Promise.all([SalaryPayment.find(q).sort({ paidOn: -1, createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(), SalaryPayment.countDocuments(q)]);
  return { payments: rows.map(shapePayment), total, page: pg, pages: Math.max(1, Math.ceil(total / lim)) };
};

/** Employees with their salary status, for the Salary Setup tab */
export const listSalaryEmployees = async ({ scope, search, department, salaryType, configured, page = 1, limit = 25 }) => {
  const q = { ...brandFilter(scope), registrationStatus: { $ne: 'Pending' }, employmentStatus: { $in: ['Active', 'On Leave'] } };
  if (department) q.department = department;
  if (search) { const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); q.$or = [{ fullName: rx }, { employeeId: rx }]; }
  const sal = await EmployeeSalary.find({ ...brandFilter(scope) }).lean();
  const byEmp = new Map(sal.map((s) => [String(s.employee), s]));
  let emps = await Employee.find(q).select('_id employeeId fullName department designation brandId').sort({ fullName: 1 }).lean();
  if (salaryType) emps = emps.filter((e) => byEmp.get(String(e._id))?.salaryType === salaryType);
  if (configured === 'YES') emps = emps.filter((e) => byEmp.has(String(e._id)));
  if (configured === 'NO') emps = emps.filter((e) => !byEmp.has(String(e._id)));
  const lim = Math.min(200, Math.max(1, Number(limit) || 25));
  const pg = Math.max(1, Number(page) || 1);
  const slice = emps.slice((pg - 1) * lim, pg * lim);
  const departments = [...new Set((await Employee.find({ ...brandFilter(scope) }).distinct('department')).filter(Boolean))].sort();
  return {
    total: emps.length, page: pg, pages: Math.max(1, Math.ceil(emps.length / lim)), departments,
    employees: slice.map((e) => {
      const s = byEmp.get(String(e._id));
      return { id: String(e._id), employeeId: e.employeeId, name: e.fullName, department: e.department, designation: e.designation, brandId: e.brandId, configured: Boolean(s), salary: s ? shapeStructure(s) : null, nextPaymentDate: s ? nextPaymentDate(s) : null };
    }),
  };
};

// ───────────────────────── dashboard ─────────────────────────

export const getDashboard = async ({ scope, filters = {} }) => {
  const today = istDateString();
  const from = isValidDateString(filters.from) ? filters.from : `${today.slice(0, 7)}-01`;
  const to = isValidDateString(filters.to) ? filters.to : today;
  const empQ = { ...brandFilter(scope), registrationStatus: { $ne: 'Pending' }, employmentStatus: { $in: ['Active', 'On Leave'] } };
  if (filters.department) empQ.department = filters.department;
  if (filters.employeeId && mongoose.Types.ObjectId.isValid(filters.employeeId)) empQ._id = new mongoose.Types.ObjectId(filters.employeeId);
  const emps = await Employee.find(empQ).select('_id employeeId fullName department').lean();
  const ids = emps.map((e) => e._id);
  const sal = await EmployeeSalary.find({ employee: { $in: ids } }).lean();
  const salFiltered = filters.salaryType ? sal.filter((s) => s.salaryType === filters.salaryType) : sal;

  const pq = payrollQuery(scope, { ...filters, from, to, employeeId: filters.employeeId });
  if (!filters.employeeId) { /* department filter is on the payroll snapshot already */ }
  const payrolls = await Payroll.find(pq).select('status netPaise paidPaise deductionsPaise grossPaise employeeName employeeCode paymentDueDate periodTo salaryType').lean();
  const processed = payrolls.filter((p) => FINAL.includes(p.status));
  const advQ = { ...brandFilter(scope), type: 'ADVANCE', status: 'ACTIVE' };
  if (ids.length && (filters.department || filters.employeeId)) advQ.employee = { $in: ids };
  const advances = await SalaryAdjustment.find(advQ).select('amountPaise recoveredPaise').lean();
  const upcoming = salFiltered
    .map((s) => ({ employee: String(s.employee), employeeCode: s.employeeCode, name: s.employeeName, frequency: s.paymentFrequency, salaryType: s.salaryType, date: nextPaymentDate(s, today) }))
    .filter((u) => u.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15);
  const sum = (arr, f) => arr.reduce((t, x) => t + f(x), 0);
  return {
    from, to,
    totalEmployees: emps.length,
    configuredEmployees: salFiltered.length,
    unconfiguredEmployees: emps.length - sal.length,
    totalEstimatedPayrollPaise: sum(salFiltered, monthlyEstimatePaise), // a monthly-equivalent estimate
    totalProcessedPaise: sum(processed, (p) => p.netPaise),
    totalPaidPaise: sum(payrolls, (p) => p.paidPaise),
    totalPendingPaise: sum(processed, (p) => Math.max(0, p.netPaise - p.paidPaise)),
    totalDeductionsPaise: sum(payrolls, (p) => p.deductionsPaise),
    totalAdvancesPaise: sum(advances, (a) => Math.max(0, a.amountPaise - a.recoveredPaise)),
    awaitingApproval: payrolls.filter((p) => p.status === 'PENDING_APPROVAL').length,
    byStatus: Object.fromEntries(['DRAFT', 'CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID'].map((s) => [s, payrolls.filter((p) => p.status === s).length])),
    upcomingPayments: upcoming,
  };
};

// ───────────────────────── slip data ─────────────────────────

export const buildSlipData = async ({ scope, id, forEmployee = null }) => {
  const detail = await getPayrollDetail({ scope, id, forEmployee });
  if (forEmployee && !FINAL.includes(detail.status)) throw new PayrollError(404, 'This salary slip is not available yet.');
  if (detail.status === 'CANCELLED') throw new PayrollError(404, 'This payroll was cancelled.');
  const [brand, emp] = await Promise.all([Brand.findOne({ brandId: detail.brandId }).lean(), Employee.findById(detail.employee).select('fullName email phone joiningDate').lean()]);
  return { ...detail, company: { name: brand?.name || 'Savitri', address: [brand?.address, brand?.city, brand?.state].filter(Boolean).join(', '), contact: brand?.contact || '', email: brand?.email || '', gst: brand?.gst || '' }, employeeInfo: emp || {} };
};

// ───────────────────────── employee-facing ─────────────────────────

/** What an employee sees about their own salary. Never includes other employees, drafts or unapproved payrolls. */
export const getMySalary = async (emp) => {
  const today = istDateString();
  const structures = await loadStructures(emp._id);
  const inForce = structureInForce(structures, today) || null;
  const latest = structures[structures.length - 1] || null;
  const shown = inForce || latest;
  const out = { configured: Boolean(shown), structure: shown ? shapeStructure(shown, { full: false }) : null, nextPaymentDate: shown ? nextPaymentDate(shown, today) : null };
  if (!shown) return out;

  // current period estimate: from the period start up to yesterday, from attendance only (never final until approved)
  const f = shown.paymentFrequency;
  let from;
  if (f === 'MONTHLY') from = `${today.slice(0, 7)}-01`;
  else if (f === 'WEEKLY') { from = today; for (let i = 0; i < 7; i += 1) { if (new Date(`${from}T12:00:00Z`).getUTCDay() === 1) break; from = addDays(from, -1); } } // Monday
  else if (f === 'CUSTOM') { const n = shown.customPeriodDays || 1; from = shown.effectiveFrom; let g = 0; while (addDays(from, n) <= today && g < 3000) { from = addDays(from, n); g += 1; } } else from = addDays(today, -1);
  const to = addDays(today, -1);
  if (from <= to && inForce) {
    try {
      const policy = await getPolicy(emp.brandId);
      const calc = await computePayroll({ emp, periodFrom: from < inForce.effectiveFrom ? from : from, periodTo: to, policy });
      out.currentPeriod = {
        periodFrom: from, periodTo: to, estimate: true,
        lines: calc.lines.filter((l) => l.source === 'SYSTEM' || l.source === 'ADVANCE' || l.source === 'ADJUSTMENT').map((l) => ({ kind: l.kind, code: l.code, label: l.label, quantity: l.quantity, unit: l.unit, amountPaise: l.amountPaise })),
        ...calc.totals, summary: calc.summary, warnings: calc.warnings,
      };
    } catch { /* no estimate available */ }
  }
  const adv = await SalaryAdjustment.find({ employee: emp._id, type: 'ADVANCE', status: 'ACTIVE' }).lean();
  out.advances = adv.map((a) => ({ id: String(a._id), date: a.date, description: a.description, amountPaise: a.amountPaise, recoveredPaise: a.recoveredPaise, outstandingPaise: Math.max(0, a.amountPaise - a.recoveredPaise), recoveryMode: a.recoveryMode, installmentPaise: a.installmentPaise }));
  return out;
};

export const listMyPayrolls = async (emp) => {
  const rows = await Payroll.find({ employee: emp._id, status: { $in: FINAL } }).sort({ periodTo: -1 }).select('-days -history -structures -summary').limit(60).lean();
  return rows.map((r) => shapePayroll(r));
};

export const listMyPayments = async (emp) => {
  const rows = await SalaryPayment.find({ employee: emp._id, status: 'RECORDED' }).sort({ paidOn: -1, createdAt: -1 }).limit(100).lean();
  const payrolls = await Payroll.find({ _id: { $in: rows.map((r) => r.payroll) } }).select('periodFrom periodTo payrollCode').lean();
  const pm = new Map(payrolls.map((p) => [String(p._id), p]));
  return rows.map((r) => ({ ...shapePayment(r), periodFrom: pm.get(String(r.payroll))?.periodFrom, periodTo: pm.get(String(r.payroll))?.periodTo, payrollCode: pm.get(String(r.payroll))?.payrollCode }));
};

export { PayrollError, shapeAdjustment, LIVE, FINAL };
export const randomKey = () => crypto.randomBytes(8).toString('hex');

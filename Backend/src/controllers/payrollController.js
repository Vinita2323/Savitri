import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import EmployeeActivityLog from '../models/EmployeeActivityLog.model.js';
import { actorFromReq } from '../services/employeeCore.js';
import { PayrollError, ensurePayrollIndexes, getSalary, saveSalary, getPolicy, savePolicy, createAdjustment, cancelAdjustment, listAdjustments, suggestPeriod, brandFilter } from '../services/payrollSalary.js';
import {
  previewPayroll, generatePayrolls, getPayrollDetail, recalculatePayroll, setOvertime, addPayrollAdjustment, removePayrollAdjustment, submitPayroll, rejectPayroll, approvePayroll, cancelPayroll,
  recordPayment, reversePayment, listPayrolls, listPayments, listSalaryEmployees, getDashboard, buildSlipData, getMySalary, listMyPayrolls, listMyPayments,
} from '../services/payrollService.js';
import { buildReport, renderXlsx, renderTablePdf, renderSlipPdf, REPORT_TYPES } from '../services/payrollReports.js';

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const handle = (res, err) => {
  if (err instanceof PayrollError) return fail(res, err.status, err.message, err.extra || {});
  console.error('[Payroll]', err);
  return fail(res, 500, 'Something went wrong. Please try again.');
};
const wrap = (fn) => async (req, res) => {
  try {
    await ensurePayrollIndexes();
    return await fn(req, res);
  } catch (err) {
    return handle(res, err);
  }
};
const isSuper = (req) => String(req.user?.role || '').replace(/-/g, '_') === 'super_admin';
const q = (req, k) => (typeof req.query?.[k] === 'string' ? req.query[k].trim() : '');
const filtersOf = (req) => ({
  from: q(req, 'from'), to: q(req, 'to'), employeeId: q(req, 'employeeId'), department: q(req, 'department'), salaryType: q(req, 'salaryType'), status: q(req, 'status'),
  paymentStatus: q(req, 'paymentStatus'), search: q(req, 'search'), batchId: q(req, 'batchId'), method: q(req, 'method'),
});

// ── policy ──
export const getPolicyH = wrap(async (req, res) => {
  const brand = req.scope && !req.scope.isAll ? req.scope.brandId : q(req, 'scope') || null;
  const policy = await getPolicy(brand && brand.toUpperCase() !== 'GLOBAL' ? brand : null);
  return res.json({ success: true, scope: brand || 'GLOBAL', policy, canEdit: isSuper(req) });
});
export const savePolicyH = wrap(async (req, res) => {
  if (!isSuper(req)) return fail(res, 403, 'Only a Super Admin can change payroll policies.');
  const wanted = String(req.body?.scope || '').trim();
  const scope = req.scope && !req.scope.isAll ? req.scope.brandId : wanted && wanted.toUpperCase() !== 'GLOBAL' ? wanted : 'GLOBAL';
  return res.json({ success: true, scope, policy: await savePolicy({ scope, body: req.body || {}, actor: actorFromReq(req) }) });
});

// ── salary configuration ──
export const listSalaryH = wrap(async (req, res) => res.json({ success: true, ...(await listSalaryEmployees({ scope: req.scope, search: q(req, 'search'), department: q(req, 'department'), salaryType: q(req, 'salaryType'), configured: q(req, 'configured'), page: q(req, 'page'), limit: q(req, 'limit') })) }));
export const getSalaryH = wrap(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.employeeId)) return fail(res, 404, 'Employee not found.');
  return res.json({ success: true, ...(await getSalary({ scope: req.scope, employeeId: req.params.employeeId })) });
});
export const saveSalaryH = wrap(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.employeeId)) return fail(res, 404, 'Employee not found.');
  return res.json({ success: true, ...(await saveSalary({ scope: req.scope, employeeId: req.params.employeeId, body: req.body || {}, actor: actorFromReq(req) })) });
});

// ── adjustments & advances ──
export const listAdjustmentsH = wrap(async (req, res) => res.json({ success: true, ...(await listAdjustments({ scope: req.scope, employeeId: q(req, 'employeeId'), type: q(req, 'type'), status: q(req, 'status'), page: q(req, 'page'), limit: q(req, 'limit') })) }));
export const createAdjustmentH = wrap(async (req, res) => {
  const employeeId = req.body?.employeeId;
  if (!mongoose.Types.ObjectId.isValid(employeeId)) return fail(res, 400, 'Choose an employee.');
  return res.status(201).json({ success: true, adjustment: await createAdjustment({ scope: req.scope, employeeId, body: req.body, actor: actorFromReq(req) }) });
});
export const cancelAdjustmentH = wrap(async (req, res) => res.json({ success: true, adjustment: await cancelAdjustment({ scope: req.scope, id: req.params.id, reason: req.body?.reason, actor: actorFromReq(req) }) }));

// ── dashboard / periods ──
export const dashboardH = wrap(async (req, res) => res.json({ success: true, ...(await getDashboard({ scope: req.scope, filters: filtersOf(req) })) }));
export const suggestPeriodH = wrap(async (req, res) => {
  const f = q(req, 'frequency') || 'MONTHLY';
  return res.json({ success: true, ...suggestPeriod(f, undefined, { days: Number(q(req, 'days')) || 0, start: q(req, 'start') }) });
});

// ── payrolls ──
export const previewH = wrap(async (req, res) => res.json({ success: true, ...(await previewPayroll({ scope: req.scope, employeeId: req.body?.employeeId, periodFrom: req.body?.periodFrom, periodTo: req.body?.periodTo })) }));
export const generateH = wrap(async (req, res) => {
  const b = req.body || {};
  return res.status(201).json({ success: true, ...(await generatePayrolls({ scope: req.scope, employeeIds: b.employeeIds, all: b.all === true, department: b.department, periodFrom: b.periodFrom, periodTo: b.periodTo, actor: actorFromReq(req) })) });
});
export const listPayrollsH = wrap(async (req, res) => res.json({ success: true, ...(await listPayrolls({ scope: req.scope, filters: { ...filtersOf(req), includeCancelled: q(req, 'includeCancelled') === 'true' }, page: q(req, 'page'), limit: q(req, 'limit') })) }));
export const getPayrollH = wrap(async (req, res) => res.json({ success: true, payroll: await getPayrollDetail({ scope: req.scope, id: req.params.id }) }));
export const recalcH = wrap(async (req, res) => res.json({ success: true, payroll: await recalculatePayroll({ scope: req.scope, id: req.params.id, actor: actorFromReq(req) }) }));
export const overtimeH = wrap(async (req, res) => res.json({ success: true, payroll: await setOvertime({ scope: req.scope, id: req.params.id, minutes: req.body?.minutes, actor: actorFromReq(req) }) }));
export const addAdjH = wrap(async (req, res) => res.json({ success: true, payroll: await addPayrollAdjustment({ scope: req.scope, id: req.params.id, body: req.body || {}, actor: actorFromReq(req) }) }));
export const removeAdjH = wrap(async (req, res) => res.json({ success: true, payroll: await removePayrollAdjustment({ scope: req.scope, id: req.params.id, adjustmentId: req.params.adjId, actor: actorFromReq(req) }) }));
export const submitH = wrap(async (req, res) => res.json({ success: true, payroll: await submitPayroll({ scope: req.scope, id: req.params.id, actor: actorFromReq(req) }) }));
export const approveH = wrap(async (req, res) => res.json({ success: true, payroll: await approvePayroll({ scope: req.scope, id: req.params.id, actor: actorFromReq(req) }) }));
export const rejectH = wrap(async (req, res) => res.json({ success: true, payroll: await rejectPayroll({ scope: req.scope, id: req.params.id, reason: req.body?.reason, actor: actorFromReq(req) }) }));
export const cancelH = wrap(async (req, res) => res.json({ success: true, payroll: await cancelPayroll({ scope: req.scope, id: req.params.id, reason: req.body?.reason, actor: actorFromReq(req) }) }));

// ── payments ──
export const recordPaymentH = wrap(async (req, res) => {
  const r = await recordPayment({ scope: req.scope, id: req.params.id, body: req.body || {}, actor: actorFromReq(req) });
  return res.status(r.duplicate ? 200 : 201).json({ success: true, ...r });
});
export const reversePaymentH = wrap(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.paymentId)) return fail(res, 404, 'Payment not found.');
  return res.json({ success: true, payroll: await reversePayment({ scope: req.scope, paymentId: req.params.paymentId, reason: req.body?.reason, actor: actorFromReq(req) }) });
});
export const listPaymentsH = wrap(async (req, res) => res.json({ success: true, ...(await listPayments({ scope: req.scope, filters: filtersOf(req), page: q(req, 'page'), limit: q(req, 'limit') })) }));

// ── slip & reports ──
const sendPdf = (res, buf, name) => { res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${name}"`); res.setHeader('Cache-Control', 'private, no-store'); return res.end(buf); };
export const slipH = wrap(async (req, res) => {
  const d = await buildSlipData({ scope: req.scope, id: req.params.id });
  return sendPdf(res, await renderSlipPdf(d), `salary-slip-${d.employeeCode}-${d.periodFrom}.pdf`);
});
export const reportH = wrap(async (req, res) => {
  const type = req.params.type;
  if (!REPORT_TYPES.includes(type)) return fail(res, 404, 'Unknown report.');
  const table = await buildReport({ scope: req.scope, type, filters: filtersOf(req) });
  const format = q(req, 'format') || 'json';
  if (format === 'xlsx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
    return res.end(await renderXlsx(table));
  }
  if (format === 'pdf') return sendPdf(res, await renderTablePdf(table), `${type}-report.pdf`);
  return res.json({ success: true, ...table });
});

// ── audit (Super Admin) ──
export const auditH = wrap(async (req, res) => {
  if (!isSuper(req)) return fail(res, 403, 'Only a Super Admin can open the payroll audit trail.');
  const filter = { action: /^(payroll_|salary_)/, ...brandFilter(req.scope) };
  if (q(req, 'entityId')) filter.entityId = q(req, 'entityId');
  const page = Math.max(1, Number(q(req, 'page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(q(req, 'limit')) || 30));
  const [logs, total] = await Promise.all([EmployeeActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), EmployeeActivityLog.countDocuments(filter)]);
  return res.json({ success: true, logs, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// ───────────────────────── employee portal (own data only) ─────────────────────────

export const mySalaryH = wrap(async (req, res) => res.json({ success: true, ...(await getMySalary(req.employee)) }));
export const myPayrollsH = wrap(async (req, res) => res.json({ success: true, payrolls: await listMyPayrolls(req.employee) }));
export const myPaymentsH = wrap(async (req, res) => res.json({ success: true, payments: await listMyPayments(req.employee) }));
export const myPayrollH = wrap(async (req, res) => res.json({ success: true, payroll: await getPayrollDetail({ scope: null, id: req.params.id, forEmployee: req.employee._id }) }));
export const mySlipH = wrap(async (req, res) => {
  const d = await buildSlipData({ scope: null, id: req.params.id, forEmployee: req.employee._id });
  return sendPdf(res, await renderSlipPdf(d), `salary-slip-${d.employeeCode}-${d.periodFrom}.pdf`);
});
export { Employee };

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import EmployeeTask from '../models/EmployeeTask.model.js';
import EmployeeTaskSubmission from '../models/EmployeeTaskSubmission.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import EmployeeDepartment from '../models/EmployeeDepartment.model.js';
import EmployeeSettings from '../models/EmployeeSettings.model.js';
import EmployeeActivityLog from '../models/EmployeeActivityLog.model.js';
import Holiday from '../models/Holiday.model.js';
import Brand from '../models/Brand.model.js';
import Admin from '../models/Admin.model.js';
import { setBrandsFromList, managedHoldersOf, AdminConfigError } from '../services/adminAccountService.js';
import { assertAttendanceUnlocked } from '../services/payrollService.js';
import { PayrollError } from '../services/payrollSalary.js';
import {
  actorFromReq,
  addDays,
  applyLeaveToAttendance,
  buildMonthlySummary,
  eachDate,
  escapeRegex,
  findLeaveConflicts,
  getRules,
  isValidDateString,
  istDateString,
  leaveDateRange,
  istMidnight,
  istMinutesOfDay,
  logActivity,
  monthRange,
  notifyEmployee,
  parseHHmm,
  recomputeAttendance,
  sanitizeEmployee,
  weekdayOfDateString,
  workedMinutes,
} from '../services/employeeCore.js';

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const serverError = (res, err) => {
  console.error('[EmployeeAdmin]', err);
  return fail(res, 500, 'Something went wrong. Please try again.');
};
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isSuper = (req) => String(req.user?.role || '').replace(/-/g, '_') === 'super_admin';
const isOid = (v) => mongoose.Types.ObjectId.isValid(v);
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

/** Brand filter for the caller: a validated scope wins; only a consolidated scope may name a brand freely. */
const brandFilter = (req) => {
  if (req.scope && !req.scope.isAll) return { brandId: req.scope.brandId };
  const q = str(req.query?.brandId, 60);
  return q && q.toUpperCase() !== 'ALL' ? { brandId: q } : {};
};
const inBrand = (req, doc) => !req.scope || req.scope.isAll || (doc && doc.brandId === req.scope.brandId);
const loadEmployee = async (req, res, id = req.params.id) => {
  if (!isOid(id)) { fail(res, 404, 'Employee not found.'); return null; }
  const emp = await Employee.findById(id);
  if (!emp || !inBrand(req, emp)) { fail(res, 404, 'Employee not found.'); return null; }
  return emp;
};

// ═════════════════ OVERVIEW ═════════════════

export const getOverview = async (req, res) => {
  try {
    const bf = brandFilter(req);
    const today = istDateString();
    const rulesBrand = bf.brandId || null;
    const rules = await getRules(rulesBrand);
    const working = !rules.weeklyOffs.includes(weekdayOfDateString(today)) && !(await Holiday.exists({ dateString: today, isOptional: { $ne: true }, brandId: { $in: [bf.brandId || 'ALL', 'ALL'] } }));
    const pastGrace = istMinutesOfDay() > parseHHmm(rules.officeStartTime, 570) + (Number(rules.graceMinutes) || 0);

    const live = { ...bf, registrationStatus: { $ne: 'Pending' }, employmentStatus: { $in: ['Active', 'On Leave'] } };
    const [total, active, pending, rejected, att, tasksByStatus, overdue, brandRows, pendingLeaves] = await Promise.all([
      Employee.countDocuments({ ...bf, registrationStatus: { $nin: ['Pending', 'Rejected'] } }),
      Employee.countDocuments({ ...bf, registrationStatus: { $ne: 'Pending' }, employmentStatus: 'Active' }),
      Employee.countDocuments({ ...bf, registrationStatus: 'Pending' }),
      Employee.countDocuments({ ...bf, registrationStatus: 'Rejected' }),
      Attendance.find({ ...bf, dateString: today }).select('status employee').lean(),
      EmployeeTask.aggregate([{ $match: bf }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      EmployeeTask.countDocuments({ ...bf, status: { $nin: ['Completed', 'Rejected'] }, dueDate: { $lt: new Date() } }),
      isSuper(req) && !bf.brandId
        ? Employee.aggregate([
            { $match: { registrationStatus: { $ne: 'Pending' } } },
            { $group: { _id: '$brandId', name: { $first: '$brandName' }, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$employmentStatus', 'Active'] }, 1, 0] } } } },
            { $sort: { total: -1 } },
          ])
        : [],
      LeaveRequest.countDocuments({ ...bf, status: 'Pending' }),
    ]);

    const presentToday = att.filter((a) => ['Present', 'Late', 'Half Day'].includes(a.status)).length;
    const onLeaveToday = att.filter((a) => a.status === 'On Leave').length;
    const expected = await Employee.countDocuments(live);
    const accounted = att.length;
    const absentToday = working && pastGrace ? Math.max(0, expected - accounted) : 0;
    const t = Object.fromEntries(tasksByStatus.map((r) => [r._id, r.n]));
    const tasksTotal = Object.values(t).reduce((a, b) => a + b, 0);

    return res.json({
      success: true,
      overview: {
        totalEmployees: total,
        activeEmployees: active,
        pendingRegistrations: pending,
        rejectedRegistrations: rejected,
        presentToday,
        absentToday,
        onLeaveToday,
        lateToday: att.filter((a) => a.status === 'Late').length,
        pendingLeaves,
        tasksTotal,
        tasksCompleted: t.Completed || 0,
        tasksPending: tasksTotal - (t.Completed || 0) - (t.Rejected || 0),
        tasksUnderReview: t['Submitted for Review'] || 0,
        tasksOverdue: overdue,
        brandStats: brandRows.map((r) => ({ brandId: r._id, name: r.name || r._id, total: r.total, active: r.active })),
        isWorkingDay: working,
        date: today,
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ REGISTRATION REQUESTS ═════════════════

export const listRegistrations = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = str(req.query.status, 20) || 'Pending';
    const filter = { ...brandFilter(req), registrationSource: 'self' };
    if (status !== 'ALL') filter.registrationStatus = status;
    const s = str(req.query.search, 80);
    if (s) {
      const re = new RegExp(escapeRegex(s), 'i');
      filter.$or = [{ fullName: re }, { email: re }, { phone: re }, { employeeId: re }];
    }
    const [total, employees] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ success: true, total, page, pages: Math.ceil(total / limit), registrations: employees.map(sanitizeEmployee) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getRegistration = async (req, res) => {
  try {
    const emp = await loadEmployee(req, res);
    if (!emp) return undefined;
    return res.json({ success: true, registration: sanitizeEmployee(emp) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const approveRegistration = async (req, res) => {
  try {
    const emp = await loadEmployee(req, res);
    if (!emp) return undefined;
    if (emp.registrationStatus !== 'Pending') return fail(res, 409, `This registration is already ${emp.registrationStatus}.`);
    const actor = actorFromReq(req);
    emp.registrationStatus = 'Approved';
    emp.employmentStatus = 'Active';
    emp.rejectionReason = '';
    emp.activatedAt = new Date();
    emp.reviewedBy = { id: actor.id, name: actor.name, role: actor.type, at: new Date() };
    if (req.body?.department) emp.department = str(req.body.department, 80);
    if (req.body?.designation) emp.designation = str(req.body.designation, 80);
    await emp.save();
    await notifyEmployee(emp, {
      type: 'registration_approved',
      title: 'Your account is activated',
      message: `Welcome ${emp.fullName}! Your registration was approved. Your Employee ID is ${emp.employeeId}.`,
      link: '/employee/dashboard',
    });
    await logActivity({ action: 'registration_approved', actor, employee: emp, entity: 'Employee', entityId: emp._id });
    return res.json({ success: true, message: `${emp.fullName} approved.`, employee: sanitizeEmployee(emp) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const rejectRegistration = async (req, res) => {
  try {
    const emp = await loadEmployee(req, res);
    if (!emp) return undefined;
    if (emp.registrationStatus !== 'Pending') return fail(res, 409, `This registration is already ${emp.registrationStatus}.`);
    const reason = str(req.body?.reason, 500);
    if (!reason) return fail(res, 400, 'A rejection reason is required.');
    const actor = actorFromReq(req);
    emp.registrationStatus = 'Rejected';
    emp.employmentStatus = 'Inactive';
    emp.rejectionReason = reason;
    emp.reviewedBy = { id: actor.id, name: actor.name, role: actor.type, at: new Date() };
    await emp.save();
    await notifyEmployee(emp, { type: 'registration_rejected', title: 'Registration rejected', message: reason });
    await logActivity({ action: 'registration_rejected', actor, employee: emp, entity: 'Employee', entityId: emp._id, details: { reason } });
    return res.json({ success: true, message: 'Registration rejected.', employee: sanitizeEmployee(emp) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const resetEmployeePassword = async (req, res) => {
  try {
    const emp = await loadEmployee(req, res);
    if (!emp) return undefined;
    const pw = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!PASSWORD_RULE.test(pw)) return fail(res, 400, 'Password must be at least 8 characters and include a letter and a number.');
    emp.password = await bcrypt.hash(pw, 10);
    emp.tokenVersion = (emp.tokenVersion || 0) + 1;
    await emp.save();
    await logActivity({ action: 'password_reset_by_admin', actor: actorFromReq(req), employee: emp, entity: 'Employee', entityId: emp._id });
    return res.json({ success: true, message: 'Password updated. The employee has been signed out everywhere.' });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ DEPARTMENTS ═════════════════

const cleanDesignations = (v) => [...new Set((Array.isArray(v) ? v : []).map((x) => str(String(x), 80)).filter(Boolean))].slice(0, 100);

export const listDepartments = async (req, res) => {
  try {
    const bf = brandFilter(req);
    const filter = bf.brandId ? { brandId: { $in: [bf.brandId, 'ALL'] } } : {};
    const departments = await EmployeeDepartment.find(filter).sort({ name: 1 }).lean();
    const counts = await Employee.aggregate([
      { $match: { ...bf, registrationStatus: { $ne: 'Rejected' } } },
      { $group: { _id: '$department', n: { $sum: 1 } } },
    ]);
    const byName = Object.fromEntries(counts.map((c) => [String(c._id).toLowerCase(), c.n]));
    return res.json({ success: true, departments: departments.map((d) => ({ ...d, employeeCount: byName[d.name.toLowerCase()] || 0 })) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const createDepartment = async (req, res) => {
  try {
    const name = str(req.body?.name, 80);
    if (!name) return fail(res, 400, 'Department name is required.');
    // A brand admin can only create departments for their own brand; 'ALL' is super-admin only.
    let brandId = req.scope && !req.scope.isAll ? req.scope.brandId : str(req.body?.brandId, 60) || 'ALL';
    if (brandId === 'ALL' && !isSuper(req)) return fail(res, 403, 'Only a Super Admin can create all-brand departments.');
    if (brandId !== 'ALL' && !(await Brand.exists({ brandId }))) return fail(res, 400, 'Unknown brand.');
    const dep = await EmployeeDepartment.create({ name, brandId, designations: cleanDesignations(req.body?.designations), description: str(req.body?.description, 300) });
    await logActivity({ action: 'department_created', actor: actorFromReq(req), brandId, entity: 'EmployeeDepartment', entityId: dep._id, details: { name } });
    return res.status(201).json({ success: true, department: dep });
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, 'A department with this name already exists.');
    return serverError(res, err);
  }
};

export const updateDepartment = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Department not found.');
    const dep = await EmployeeDepartment.findById(req.params.id);
    if (!dep) return fail(res, 404, 'Department not found.');
    if (dep.brandId === 'ALL' ? !isSuper(req) : !inBrand(req, dep)) return fail(res, dep.brandId === 'ALL' ? 403 : 404, dep.brandId === 'ALL' ? 'Only a Super Admin can change all-brand departments.' : 'Department not found.');
    const oldName = dep.name;
    if (req.body?.name !== undefined) dep.name = str(req.body.name, 80) || dep.name;
    if (req.body?.designations !== undefined) dep.designations = cleanDesignations(req.body.designations);
    if (req.body?.description !== undefined) dep.description = str(req.body.description, 300);
    if (req.body?.isActive !== undefined) dep.isActive = Boolean(req.body.isActive);
    await dep.save();
    // Keep employees pointing at the renamed department.
    if (oldName !== dep.name) {
      await Employee.updateMany({ department: oldName, ...(dep.brandId === 'ALL' ? {} : { brandId: dep.brandId }) }, { department: dep.name });
    }
    await logActivity({ action: 'department_updated', actor: actorFromReq(req), brandId: dep.brandId, entity: 'EmployeeDepartment', entityId: dep._id });
    return res.json({ success: true, department: dep });
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, 'A department with this name already exists.');
    return serverError(res, err);
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Department not found.');
    const dep = await EmployeeDepartment.findById(req.params.id);
    if (!dep) return fail(res, 404, 'Department not found.');
    if (dep.brandId === 'ALL' ? !isSuper(req) : !inBrand(req, dep)) return fail(res, 404, 'Department not found.');
    const inUse = await Employee.countDocuments({ department: dep.name, ...(dep.brandId === 'ALL' ? {} : { brandId: dep.brandId }) });
    if (inUse) return fail(res, 409, `${inUse} employee(s) belong to this department. Reassign them first or deactivate the department.`);
    await dep.deleteOne();
    await logActivity({ action: 'department_deleted', actor: actorFromReq(req), brandId: dep.brandId, entity: 'EmployeeDepartment', entityId: dep._id, details: { name: dep.name } });
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
};

export const assignEmployeeDepartment = async (req, res) => {
  try {
    const emp = await loadEmployee(req, res);
    if (!emp) return undefined;
    const department = str(req.body?.department, 80);
    const designation = str(req.body?.designation, 80);
    if (!department) return fail(res, 400, 'Department is required.');
    const dep = await EmployeeDepartment.findOne({ isActive: true, brandId: { $in: [emp.brandId, 'ALL'] }, name: new RegExp(`^${escapeRegex(department)}$`, 'i') });
    if (!dep) return fail(res, 400, 'Department not found for this brand.');
    const before = { department: emp.department, designation: emp.designation };
    emp.department = dep.name;
    if (designation) emp.designation = designation;
    await emp.save();
    await logActivity({ action: 'department_assigned', actor: actorFromReq(req), employee: emp, details: { before, after: { department: emp.department, designation: emp.designation } } });
    return res.json({ success: true, employee: sanitizeEmployee(emp) });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ ATTENDANCE RULES ═════════════════

export const getAttendanceRules = async (req, res) => {
  try {
    const brandId = brandFilter(req).brandId || null;
    const rules = await getRules(brandId);
    return res.json({ success: true, rules, scope: brandId || 'GLOBAL' });
  } catch (err) {
    return serverError(res, err);
  }
};

export const saveAttendanceRules = async (req, res) => {
  try {
    const b = req.body || {};
    const scoped = req.scope && !req.scope.isAll ? req.scope.brandId : null;
    const wanted = str(b.scope, 60);
    // GLOBAL rules are Super Admin only; a brand admin can only set rules for their own brand.
    const scope = scoped || (wanted && wanted.toUpperCase() !== 'GLOBAL' ? wanted : 'GLOBAL');
    if (scope === 'GLOBAL' && !isSuper(req)) return fail(res, 403, 'Only a Super Admin can change the global attendance rules.');
    if (scope !== 'GLOBAL' && !(await Brand.exists({ brandId: scope }))) return fail(res, 400, 'Unknown brand.');

    const start = str(b.officeStartTime, 5);
    const end = str(b.officeEndTime, 5);
    if (parseHHmm(start, null) === null) return fail(res, 400, 'Office start time must be HH:mm.');
    if (end && parseHHmm(end, null) === null) return fail(res, 400, 'Office end time must be HH:mm.');
    const grace = Number(b.graceMinutes);
    if (!Number.isFinite(grace) || grace < 0 || grace > 240) return fail(res, 400, 'Grace period must be between 0 and 240 minutes.');
    const half = b.halfDayMinutes === undefined ? 240 : Number(b.halfDayMinutes);
    if (!Number.isFinite(half) || half < 0 || half > 1440) return fail(res, 400, 'Half-day threshold is invalid.');
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weeklyOffs = (Array.isArray(b.weeklyOffs) ? b.weeklyOffs : ['Sunday']).filter((d) => DAYS.includes(d));
    const actor = actorFromReq(req);
    const doc = await EmployeeSettings.findOneAndUpdate(
      { scope },
      { $set: { officeStartTime: start, officeEndTime: end || '18:30', graceMinutes: grace, halfDayMinutes: half, weeklyOffs, updatedBy: { name: actor.name, role: actor.type } } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    await logActivity({ action: 'attendance_rules_updated', actor, brandId: scope === 'GLOBAL' ? '' : scope, entity: 'EmployeeSettings', entityId: doc._id, details: { start, grace, half, weeklyOffs } });
    return res.json({ success: true, rules: await getRules(scope === 'GLOBAL' ? null : scope), scope });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ ATTENDANCE VIEWS ═════════════════

const EXPECTED_FILTER = { registrationStatus: { $ne: 'Pending' }, employmentStatus: { $in: ['Active', 'On Leave'] } };

export const getDailyAttendance = async (req, res) => {
  try {
    const date = isValidDateString(req.query.date) ? req.query.date : istDateString();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const bf = brandFilter(req);
    const empFilter = { ...bf, ...EXPECTED_FILTER, registrationStatus: { $nin: ['Pending', 'Rejected'] } };
    if (req.query.department && req.query.department !== 'ALL') empFilter.department = str(req.query.department, 80);
    const s = str(req.query.search, 80);
    if (s) {
      const re = new RegExp(escapeRegex(s), 'i');
      empFilter.$or = [{ fullName: re }, { employeeId: re }, { email: re }, { phone: re }];
    }
    const total = await Employee.countDocuments(empFilter);
    const emps = await Employee.find(empFilter).select('fullName employeeId department designation brandId brandName avatar joiningDate').sort({ fullName: 1 }).skip((page - 1) * limit).limit(limit).lean();
    const [records, holidays] = await Promise.all([
      Attendance.find({ employee: { $in: emps.map((e) => e._id) }, dateString: date }).lean(),
      Holiday.find({ dateString: date, isOptional: { $ne: true } }).lean(),
    ]);
    const byEmp = Object.fromEntries(records.map((r) => [String(r.employee), r]));
    const today = istDateString();
    const rows = [];
    const ruleCache = {};
    for (const e of emps) {
      ruleCache[e.brandId] = ruleCache[e.brandId] || (await getRules(e.brandId));
      const rules = ruleCache[e.brandId];
      const rec = byEmp[String(e._id)];
      let status = rec?.status;
      if (!rec) {
        const hol = holidays.find((h) => h.brandId === 'ALL' || h.brandId === e.brandId);
        if (hol) status = 'Holiday';
        else if (rules.weeklyOffs.includes(weekdayOfDateString(date))) status = 'Weekly Off';
        else if (date > today || (e.joiningDate && date < istDateString(e.joiningDate))) status = '-';
        else if (date < today) status = 'Absent';
        else status = istMinutesOfDay() > parseHHmm(rules.officeStartTime, 570) + (Number(rules.graceMinutes) || 0) ? 'Absent' : 'Not marked';
      }
      rows.push({
        recordId: rec?._id || null,
        employee: { _id: e._id, employeeId: e.employeeId, fullName: e.fullName, department: e.department, designation: e.designation, brandName: e.brandName, avatar: e.avatar },
        date,
        status,
        checkIn: rec?.checkIn || null,
        checkOut: rec?.checkOut || null,
        workedMinutes: rec ? (rec.sessions?.some((x) => !x.logoutAt) && date === today ? workedMinutes(rec.sessions) : rec.totalDurationMinutes || 0) : 0,
        lateMinutes: rec?.lateMinutes || 0,
        loginCount: rec?.loginCount || 0,
        corrected: Boolean(rec?.correctionHistory?.length),
      });
    }
    const wanted = str(req.query.status, 20);
    const filtered = wanted && wanted !== 'ALL' ? rows.filter((r) => r.status === wanted) : rows;
    return res.json({ success: true, date, total, page, pages: Math.ceil(total / limit), rows: filtered });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getEmployeeMonthly = async (req, res) => {
  try {
    const emp = await loadEmployee(req, res, req.params.id);
    if (!emp) return undefined;
    const summary = await buildMonthlySummary(emp, str(req.query.month, 7));
    return res.json({ success: true, employee: sanitizeEmployee(emp), ...summary });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getMonthlyAll = async (req, res) => {
  try {
    const { month, first, last } = monthRange(str(req.query.month, 7));
    const empFilter = { ...brandFilter(req), registrationStatus: { $nin: ['Pending', 'Rejected'] }, employmentStatus: { $in: ['Active', 'On Leave'] } };
    const emps = await Employee.find(empFilter).limit(500).lean();
    const recs = await Attendance.find({ employee: { $in: emps.map((e) => e._id) }, dateString: { $gte: first, $lte: last } }).select('employee status totalDurationMinutes').lean();
    const grouped = new Map();
    for (const r of recs) {
      const g = grouped.get(String(r.employee)) || { present: 0, late: 0, halfDay: 0, leave: 0, minutes: 0 };
      if (r.status === 'Present') g.present += 1;
      else if (r.status === 'Late') { g.present += 1; g.late += 1; }
      else if (r.status === 'Half Day') g.halfDay += 1;
      else if (r.status === 'On Leave') g.leave += 1;
      g.minutes += r.totalDurationMinutes || 0;
      grouped.set(String(r.employee), g);
    }
    const rows = [];
    for (const e of emps) {
      // Absent days need the working-day calendar, so reuse the per-employee summary.
      // eslint-disable-next-line no-await-in-loop
      const s = await buildMonthlySummary(e, month);
      rows.push({ employee: { _id: e._id, employeeId: e.employeeId, fullName: e.fullName, department: e.department, brandName: e.brandName }, ...s.counts, totalWorkedMinutes: s.totalWorkedMinutes });
    }
    return res.json({ success: true, month, rows });
  } catch (err) {
    return serverError(res, err);
  }
};

const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formula injection from user-controlled text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportAttendance = async (req, res) => {
  try {
    const bf = brandFilter(req);
    let first;
    let last;
    if (isValidDateString(req.query.from) && isValidDateString(req.query.to)) {
      first = req.query.from;
      last = req.query.to;
      if (eachDate(first, last, 100).length > 92) return fail(res, 400, 'Export range is limited to 92 days.');
    } else {
      ({ first, last } = monthRange(str(req.query.month, 7)));
    }
    const records = await Attendance.find({ ...bf, dateString: { $gte: first, $lte: last } }).sort({ dateString: 1, employeeId: 1 }).limit(20000).lean();
    const ids = [...new Set(records.map((r) => String(r.employee)))];
    const emps = await Employee.find({ _id: { $in: ids } }).select('department designation brandName').lean();
    const meta = Object.fromEntries(emps.map((e) => [String(e._id), e]));
    const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) : '');
    const lines = [['Date', 'Employee ID', 'Name', 'Brand', 'Department', 'Status', 'First Login (IST)', 'Last Logout (IST)', 'Worked (hours)', 'Late (min)', 'Logins', 'Corrected'].map(csvCell).join(',')];
    for (const r of records) {
      const m = meta[String(r.employee)] || {};
      lines.push([r.dateString, r.employeeId, r.employeeName, m.brandName || r.brandId, m.department || '', r.status, fmt(r.checkIn), fmt(r.checkOut), ((r.totalDurationMinutes || 0) / 60).toFixed(2), r.lateMinutes || 0, r.loginCount || 0, r.correctionHistory?.length ? 'Yes' : 'No'].map(csvCell).join(','));
    }
    await logActivity({ action: 'attendance_exported', actor: actorFromReq(req), brandId: bf.brandId || '', details: { first, last, rows: records.length } });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${first}_${last}.csv"`);
    return res.send(`﻿${lines.join('\r\n')}`);
  } catch (err) {
    return serverError(res, err);
  }
};

const ATT_STATUSES = ['Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Holiday'];

/** Manual attendance correction: requires a reason and writes a full before/after audit entry. */
export const correctAttendance = async (req, res) => {
  try {
    const b = req.body || {};
    const reason = str(b.reason || b.notes, 500);
    if (!reason) return fail(res, 400, 'A reason is required for every attendance correction.');
    const status = b.status === 'Leave' ? 'On Leave' : b.status;
    if (status && !ATT_STATUSES.includes(status)) return fail(res, 400, `Status must be one of: ${ATT_STATUSES.join(', ')}.`);

    let att = null;
    let emp = null;
    if (req.params.id) {
      if (!isOid(req.params.id)) return fail(res, 404, 'Attendance record not found.');
      att = await Attendance.findById(req.params.id);
      if (!att || !inBrand(req, att)) return fail(res, 404, 'Attendance record not found.');
      emp = await Employee.findById(att.employee);
    } else {
      // The employee may be sent as a Mongo id or as the employee code (EMP-2026-0001).
      const key = str(String(b.employeeId || ''), 60);
      emp = isOid(key) ? await Employee.findById(key) : key ? await Employee.findOne({ employeeId: key }) : null;
      if (!emp || !inBrand(req, emp)) return fail(res, 404, 'Employee not found.');
      const date = isValidDateString(b.date) ? b.date : null;
      if (!date) return fail(res, 400, 'A valid date (YYYY-MM-DD) is required.');
      if (date > istDateString()) return fail(res, 400, 'Attendance cannot be marked for a future date.');
      att = await Attendance.findOne({ employee: emp._id, dateString: date });
      if (!att) {
        att = new Attendance({
          employee: emp._id, employeeId: emp.employeeId, employeeName: emp.fullName, brandId: emp.brandId, storeId: emp.storeId || '',
          date: istMidnight(date), dateString: date, status: status || 'Present',
        });
      }
    }
    if (!emp) return fail(res, 404, 'Employee not found.');
    // Attendance inside an approved payroll period is locked (payroll was calculated from it)
    try { await assertAttendanceUnlocked(emp._id, att.dateString); } catch (e) { if (e instanceof PayrollError) return fail(res, e.status, e.message, { code: 'PAYROLL_LOCKED' }); throw e; }

    const parseTime = (v) => {
      if (!v) return null;
      if (/^\d{1,2}:\d{2}$/.test(String(v))) return new Date(`${att.dateString}T${String(v).padStart(5, '0')}:00+05:30`);
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const inT = parseTime(b.checkInTime ?? b.checkIn);
    const outT = parseTime(b.checkOutTime ?? b.checkOut);
    if (inT === undefined || outT === undefined) return fail(res, 400, 'Invalid check-in/check-out time.');
    if (inT && outT && outT <= inT) return fail(res, 400, 'Check-out must be after check-in.');

    const snap = (a) => ({ status: a.status, checkIn: a.checkIn, checkOut: a.checkOut, totalDurationMinutes: a.totalDurationMinutes });
    const before = snap(att);
    const actor = actorFromReq(req);

    if (inT) att.checkIn = inT;
    if (outT) att.checkOut = outT;
    if (inT || outT) {
      // A manual time replaces the machine-recorded sessions for that day.
      if (att.checkIn && att.checkOut) {
        att.sessions = [{ sessionId: 'manual', loginAt: att.checkIn, logoutAt: att.checkOut, source: 'Admin', ip: '' }];
        att.totalDurationMinutes = Math.round((att.checkOut - att.checkIn) / 60000);
        att.isMissingCheckout = false;
      }
    }
    if (status) {
      att.status = status;
      att.statusLocked = true;
      if (['Absent', 'Holiday', 'On Leave'].includes(status) && !inT && !outT) {
        att.lateMinutes = 0;
      }
    } else if (inT || outT) {
      att.statusLocked = false;
      recomputeAttendance(att, await getRules(emp.brandId));
    }
    att.notes = reason;
    att.correctionHistory.push({ at: new Date(), by: { id: actor.id, name: actor.name, role: actor.type }, reason, before, after: snap(att) });
    att.correction = {
      isCorrected: true, originalCheckIn: before.checkIn, originalCheckOut: before.checkOut, originalStatus: before.status, reason,
      requestedBy: { id: actor.id, name: actor.name, role: actor.type }, approvedBy: { id: actor.id, name: actor.name, role: actor.type }, correctedAt: new Date(),
    };
    await att.save();
    await notifyEmployee(emp, { type: 'attendance_correction', title: 'Attendance corrected', message: `Your attendance for ${att.dateString} was updated to "${att.status}". Reason: ${reason}`, link: '/employee/attendance' });
    await logActivity({ action: 'attendance_corrected', actor, employee: emp, entity: 'Attendance', entityId: att._id, details: { date: att.dateString, before, after: snap(att), reason } });
    return res.json({ success: true, message: 'Attendance updated and audited.', record: att });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getAttendanceAudit = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Attendance record not found.');
    const att = await Attendance.findById(req.params.id).select('brandId dateString employeeName employeeId correctionHistory sessions').lean();
    if (!att || !inBrand(req, att)) return fail(res, 404, 'Attendance record not found.');
    return res.json({ success: true, record: att });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ TASK REVIEW ═════════════════

export const listSubmissions = async (req, res) => {
  try {
    const filter = { ...brandFilter(req) };
    const status = str(req.query.status, 30);
    if (status && status !== 'ALL') filter.status = status;
    if (isOid(req.query.taskId)) filter.task = req.query.taskId;
    const submissions = await EmployeeTaskSubmission.find(filter).sort({ submittedAt: -1 }).limit(200).lean();
    return res.json({ success: true, submissions });
  } catch (err) {
    return serverError(res, err);
  }
};

export const reviewTask = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Task not found.');
    const task = await EmployeeTask.findById(req.params.id);
    if (!task || !inBrand(req, task)) return fail(res, 404, 'Task not found.');
    if (task.status !== 'Submitted for Review') return fail(res, 409, 'Only a task that has been submitted for review can be reviewed.');
    const decision = str(req.body?.decision, 20);
    const notes = str(req.body?.notes, 1500);
    if (!['approve', 'changes', 'reject'].includes(decision)) return fail(res, 400, 'Decision must be approve, changes or reject.');
    if (decision !== 'approve' && !notes) return fail(res, 400, 'Please add review notes explaining the decision.');
    const actor = actorFromReq(req);
    const sub = await EmployeeTaskSubmission.findOne({ task: task._id, status: 'Pending' }).sort({ submittedAt: -1 });

    let notifType;
    let title;
    if (decision === 'approve') {
      task.status = 'Completed';
      task.progressPercent = 100;
      task.completedAt = new Date();
      notifType = 'task_approved';
      title = `Task approved: ${task.title}`;
      if (sub) sub.status = 'Approved';
    } else if (decision === 'changes') {
      task.status = 'Reopened';
      notifType = 'task_changes_requested';
      title = `Changes requested: ${task.title}`;
      if (sub) sub.status = 'Changes Requested';
    } else {
      task.status = 'Rejected';
      notifType = 'task_rejected';
      title = `Task rejected: ${task.title}`;
      if (sub) sub.status = 'Rejected';
    }
    task.reviewNotes = notes;
    task.reviewedBy = { id: actor.id, name: actor.name, reviewedAt: new Date() };
    await task.save();
    if (sub) {
      sub.reviewNotes = notes;
      sub.reviewedBy = { id: actor.id, name: actor.name, role: actor.type };
      sub.reviewedAt = new Date();
      await sub.save();
    }
    const assignees = await Employee.find({ _id: { $in: task.assignedEmployees.map((a) => a.employee) } }).select('_id brandId').lean();
    await Promise.all(assignees.map((e) => notifyEmployee(e, { type: notifType, title, message: notes, link: `/employee/tasks/${task._id}`, meta: { taskId: String(task._id) } })));
    await logActivity({ action: `task_${decision}`, actor, brandId: task.brandId, entity: 'EmployeeTask', entityId: task._id, details: { taskId: task.taskId, notes } });
    return res.json({ success: true, task });
  } catch (err) {
    return serverError(res, err);
  }
};

export const decideExtension = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Task not found.');
    const task = await EmployeeTask.findById(req.params.id);
    if (!task || !inBrand(req, task)) return fail(res, 404, 'Task not found.');
    const reqDoc = task.extensionRequests.id(req.params.requestId);
    if (!reqDoc) return fail(res, 404, 'Extension request not found.');
    if (reqDoc.status !== 'Pending') return fail(res, 409, `This request is already ${reqDoc.status}.`);
    const approve = req.body?.decision === 'approve';
    if (!approve && req.body?.decision !== 'reject') return fail(res, 400, 'Decision must be approve or reject.');
    const actor = actorFromReq(req);
    reqDoc.status = approve ? 'Approved' : 'Rejected';
    reqDoc.decidedBy = { name: actor.name, role: actor.type };
    reqDoc.decidedAt = new Date();
    if (approve) {
      task.dueDate = reqDoc.requestedDueDate;
      task.isOverdue = false;
      task.overdueNotified = false;
      task.deadlineReminderSent = false;
    }
    await task.save();
    const emp = await Employee.findById(reqDoc.requestedBy).select('_id brandId').lean();
    await notifyEmployee(emp, {
      type: 'extension_decided',
      title: `Deadline extension ${approve ? 'approved' : 'rejected'}: ${task.title}`,
      message: approve ? `New deadline: ${task.dueDate.toISOString().slice(0, 10)}` : str(req.body?.notes, 500),
      link: `/employee/tasks/${task._id}`,
    });
    await logActivity({ action: `extension_${approve ? 'approved' : 'rejected'}`, actor, brandId: task.brandId, entity: 'EmployeeTask', entityId: task._id });
    return res.json({ success: true, task });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ LEAVE ═════════════════

export const currentLeaves = async (req, res) => {
  try {
    const today = istMidnight(istDateString());
    const leaves = await LeaveRequest.find({ ...brandFilter(req), status: 'Approved', startDate: { $lte: today }, endDate: { $gte: today } })
      .sort({ endDate: 1 }).limit(200).lean();
    return res.json({ success: true, leaves });
  } catch (err) {
    return serverError(res, err);
  }
};

/** Shared by the legacy admin route and the new one: approval writes attendance and notifies the employee. */
export const decideLeave = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Leave request not found.');
    const status = str(req.body?.status, 20);
    const notes = str(req.body?.notes || req.body?.remarks, 500);
    if (!['Approved', 'Rejected'].includes(status)) return fail(res, 400, 'Status must be Approved or Rejected.');
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave || !inBrand(req, leave)) return fail(res, 404, 'Leave request not found.');
    if (leave.status !== 'Pending') return fail(res, 409, `This request is already ${leave.status}.`);
    const emp = await Employee.findById(leave.employee);
    if (!emp) return fail(res, 404, 'Employee not found.');
    if (status === 'Rejected' && !notes) return fail(res, 400, 'Please add a remark when rejecting.');

    if (status === 'Approved') {
      try { await assertAttendanceUnlocked(leave.employee, leaveDateRange(leave)); } catch (e) { if (e instanceof PayrollError) return fail(res, e.status, e.message, { code: 'PAYROLL_LOCKED' }); throw e; }
      const conflicts = await findLeaveConflicts(leave);
      if (conflicts.length) {
        return fail(res, 409, `The employee already has attendance recorded on ${conflicts.join(', ')}. Correct those days first, then approve.`, { conflicts });
      }
    }
    const actor = actorFromReq(req);
    leave.status = status;
    leave.reviewedBy = { id: actor.id, name: actor.name, role: actor.type, notes, reviewedAt: new Date() };
    await leave.save();
    if (status === 'Approved') {
      await applyLeaveToAttendance(leave, emp);
      const today = istDateString();
      if (istDateString(leave.startDate) <= today && today <= istDateString(leave.endDate) && emp.employmentStatus === 'Active') {
        // Informational flag only; portal login stays allowed while on leave.
        emp.employmentStatus = 'On Leave';
        await emp.save();
      }
    }
    await notifyEmployee(emp, {
      type: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave ${status.toLowerCase()}: ${leave.leaveId}`,
      message: notes || `${leave.leaveType} ${istDateString(leave.startDate)} to ${istDateString(leave.endDate)}`,
      link: '/employee/leaves',
    });
    await logActivity({ action: `leave_${status.toLowerCase()}`, actor, employee: emp, entity: 'LeaveRequest', entityId: leave._id, details: { leaveId: leave.leaveId, notes } });
    return res.json({ success: true, message: `Leave request ${leave.leaveId} has been ${status}.`, leave });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ ACTIVITY LOG ═════════════════

export const listActivity = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const filter = {};
    const bf = brandFilter(req);
    // Brand admins see their brand's activity only (system rows with no brand are hidden from them).
    if (bf.brandId) filter.brandId = bf.brandId;
    if (req.query.action) filter.action = str(req.query.action, 60);
    if (isOid(req.query.employeeId)) filter.employee = req.query.employeeId;
    const [total, logs] = await Promise.all([
      EmployeeActivityLog.countDocuments(filter),
      EmployeeActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ success: true, total, page, pages: Math.ceil(total / limit), logs });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════ ADMIN BRAND ACCESS (Super Admin) ═════════════════

export const listAdminAccess = async (req, res) => {
  try {
    const admins = await Admin.find({ role: 'admin' }).select('name email status authorizedBrands').sort({ name: 1 }).lean();
    const brands = await Brand.find({}).select('brandId name city').sort({ name: 1 }).lean();
    return res.json({ success: true, admins, brands });
  } catch (err) {
    return serverError(res, err);
  }
};

export const updateAdminAccess = async (req, res) => {
  try {
    if (!isOid(req.params.id)) return fail(res, 404, 'Admin not found.');
    const admin = await Admin.findOne({ _id: req.params.id, role: 'admin' });
    if (!admin) return fail(res, 404, 'Admin not found.');
    const list = Array.isArray(req.body?.authorizedBrands) ? req.body.authorizedBrands.map((x) => str(String(x), 60)).filter(Boolean) : null;
    if (!list) return fail(res, 400, 'authorizedBrands must be a list.');
    if (!list.includes('*')) {
      const valid = await Brand.find({ brandId: { $in: list } }).select('brandId').lean();
      if (valid.length !== new Set(list).size) return fail(res, 400, 'One or more brands are unknown.');
    }
    const before = admin.authorizedBrands;
    if (admin.adminType === 'CITY_ADMIN') return fail(res, 400, 'A City Admin belongs to one brand. Manage it from that brand page.');
    if (admin.brandAccess === 'ASSIGNED' && !list.includes('*')) {
      // managed in Admin Configuration: same rules there (no accidental duplicates, history recorded)
      try {
        const out = await setBrandsFromList(admin, list, { id: req.user.id, name: req.user.name || '', email: req.user.email || '' });
        return res.json({ success: true, admin: { _id: admin._id, name: admin.name, email: admin.email, authorizedBrands: out.admin.brands.map((b) => b.brandId) } });
      } catch (e) { if (e instanceof AdminConfigError) return fail(res, e.status, e.message, e.extra); throw e; }
    }
    // an older account may not silently take a brand that a managed admin holds
    const taken = await managedHoldersOf(list.filter((x) => x !== '*' && !(before || []).includes(x)), admin._id);
    if (taken.length) return fail(res, 409, `Already managed by ${taken.map((a) => a.name || a.email).join(', ')}. Use Admin Configuration to transfer or share the brand.`);
    // "all brands" chosen explicitly by the Super Admin ends the per-brand assignment
    if (list.includes('*')) { admin.brandAccess = undefined; admin.exclusiveBrands = undefined; }
    admin.authorizedBrands = list;
    // Narrowing brand access must take effect immediately.
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    await logActivity({ action: 'admin_brand_access_changed', actor: actorFromReq(req), entity: 'Admin', entityId: admin._id, details: { admin: admin.email, before, after: list } });
    return res.json({ success: true, admin: { _id: admin._id, name: admin.name, email: admin.email, authorizedBrands: admin.authorizedBrands } });
  } catch (err) {
    return serverError(res, err);
  }
};

export { addDays };

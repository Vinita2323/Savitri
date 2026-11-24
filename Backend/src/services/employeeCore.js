import crypto from 'crypto';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import EmployeeSettings from '../models/EmployeeSettings.model.js';
import EmployeeNotification from '../models/EmployeeNotification.model.js';
import EmployeeActivityLog from '../models/EmployeeActivityLog.model.js';
import Holiday from '../models/Holiday.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import { nextSequence } from '../models/Counter.model.js';

/** All attendance logic runs in the business timezone, never in the server's local time. */
export const BUSINESS_TZ = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

const dtf = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  weekday: 'long',
});

const partsOf = (d) => {
  const o = {};
  for (const p of dtf.formatToParts(new Date(d))) o[p.type] = p.value;
  if (o.hour === '24') o.hour = '00';
  return o;
};

/** 'YYYY-MM-DD' for the given instant, in Asia/Kolkata. */
export const istDateString = (d = new Date()) => {
  const p = partsOf(d);
  return `${p.year}-${p.month}-${p.day}`;
};
export const istMinutesOfDay = (d = new Date()) => {
  const p = partsOf(d);
  return Number(p.hour) * 60 + Number(p.minute);
};
export const istWeekday = (d = new Date()) => partsOf(d).weekday; // 'Monday'...
export const istMonthString = (d = new Date()) => istDateString(d).slice(0, 7);
/** Midnight (IST) of a 'YYYY-MM-DD' string as an instant. */
export const istMidnight = (ds) => new Date(`${ds}T00:00:00${IST_OFFSET}`);
export const weekdayOfDateString = (ds) => istWeekday(new Date(`${ds}T12:00:00${IST_OFFSET}`));
export const isValidDateString = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(istMidnight(s).getTime());

export const addDays = (ds, n) => istDateString(new Date(istMidnight(ds).getTime() + n * 86400000 + 12 * 3600000));

export const eachDate = (startDS, endDS, cap = 400) => {
  const out = [];
  let cur = startDS;
  while (cur <= endDS && out.length < cap) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
};

export const parseHHmm = (s, fallback) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
  if (!m) return fallback;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return fallback;
  return h * 60 + mi;
};

export const DEFAULT_RULES = {
  officeStartTime: '09:30',
  officeEndTime: '18:30',
  graceMinutes: 15,
  halfDayMinutes: 240,
  weeklyOffs: ['Sunday'],
  timezone: BUSINESS_TZ,
  selfieEnabled: true,
  selfieIntervalMinutes: 120,
  selfieGraceMinutes: 15,
};

/** Brand rules override GLOBAL rules, which override the built-in defaults. */
export const getRules = async (brandId) => {
  const scopes = [brandId, 'GLOBAL'].filter(Boolean);
  const docs = await EmployeeSettings.find({ scope: { $in: scopes } }).lean();
  const byScope = Object.fromEntries(docs.map((d) => [d.scope, d]));
  const doc = byScope[brandId] || byScope.GLOBAL;
  return { ...DEFAULT_RULES, ...(doc || {}), source: byScope[brandId] ? brandId : byScope.GLOBAL ? 'GLOBAL' : 'DEFAULT' };
};

export const actorFromReq = (req) => {
  const role = String(req.user?.role || '').replace(/-/g, '_');
  return {
    type: role === 'super_admin' ? 'super_admin' : role === 'admin' ? 'admin' : role === 'employee' ? 'employee' : 'system',
    id: req.user?.id || req.user?._id || null,
    name: req.user?.name || '',
    email: req.user?.email || '',
  };
};

/** Activity logging must never break the action being logged. */
export const logActivity = async ({ action, actor, employee, brandId, entity = '', entityId = '', details = null, ip = '' }) => {
  try {
    await EmployeeActivityLog.create({
      action,
      actor: actor || { type: 'system' },
      employee: employee?._id || null,
      employeeCode: employee?.employeeId || '',
      brandId: brandId || employee?.brandId || '',
      entity,
      entityId: String(entityId || ''),
      details,
      ip,
    });
  } catch (err) {
    console.warn('[EmployeeActivity] log failed:', err.message);
  }
};

export const notifyEmployee = async (employee, { type = 'general', title, message = '', link = '', meta = null }) => {
  try {
    if (!employee?._id) return null;
    return await EmployeeNotification.create({
      employee: employee._id,
      brandId: employee.brandId || '',
      type,
      title,
      message,
      link,
      meta,
    });
  } catch (err) {
    console.warn('[EmployeeNotify] failed:', err.message);
    return null;
  }
};

/** Collision-safe employee code from an atomic counter (never countDocuments). */
export const generateEmployeeCode = async () => {
  const year = istDateString().slice(0, 4);
  for (let i = 0; i < 20; i += 1) {
    const seq = await nextSequence(`employee_${year}`);
    const code = `EMP-${year}-${String(seq).padStart(4, '0')}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await Employee.exists({ employeeId: code }))) return code;
  }
  throw new Error('Could not allocate an employee ID');
};

export const generateTaskCode = async () => {
  const year = istDateString().slice(0, 4);
  const seq = await nextSequence(`employee_task_${year}`);
  return `TSK-${year}-${String(seq).padStart(4, '0')}`;
};

export const generateLeaveCode = async () => {
  const year = istDateString().slice(0, 4);
  const seq = await nextSequence(`employee_leave_${year}`);
  return `LV-${year}-${String(seq).padStart(4, '0')}`;
};

// ───────────────────────── attendance ─────────────────────────

/** Total worked minutes = union of all login sessions (overlapping sessions are not double counted). */
export const workedMinutes = (sessions = [], now = new Date()) => {
  const spans = sessions
    .filter((s) => s.loginAt)
    .map((s) => [new Date(s.loginAt).getTime(), new Date(s.logoutAt || now).getTime()])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let curStart = null;
  let curEnd = null;
  for (const [a, b] of spans) {
    if (curStart === null) {
      curStart = a;
      curEnd = b;
    } else if (a <= curEnd) {
      curEnd = Math.max(curEnd, b);
    } else {
      total += curEnd - curStart;
      curStart = a;
      curEnd = b;
    }
  }
  if (curStart !== null) total += curEnd - curStart;
  return Math.round(total / 60000);
};

const lateInfo = (firstLogin, rules) => {
  const start = parseHHmm(rules.officeStartTime, 570);
  const grace = Number(rules.graceMinutes) || 0;
  const arrived = istMinutesOfDay(firstLogin);
  const over = arrived - start;
  return over > grace ? { status: 'Late', lateMinutes: over } : { status: 'Present', lateMinutes: 0 };
};

/** Re-derive status / worked time from the sessions. Locked (leave or manually corrected) rows keep their status. */
export const recomputeAttendance = (att, rules, now = new Date()) => {
  const open = att.sessions.some((s) => !s.logoutAt);
  att.totalDurationMinutes = workedMinutes(att.sessions, now);
  const ends = att.sessions.filter((s) => s.logoutAt).map((s) => new Date(s.logoutAt).getTime());
  att.checkOut = open || !ends.length ? null : new Date(Math.max(...ends));
  att.isMissingCheckout = open;
  if (!att.statusLocked && att.checkIn) {
    const base = lateInfo(att.checkIn, rules);
    att.lateMinutes = base.lateMinutes;
    att.status = base.status;
    if (!open && att.totalDurationMinutes < (Number(rules.halfDayMinutes) || 0)) att.status = 'Half Day';
  }
};

/**
 * Called by the server right after a successful employee authentication. The first login of the day
 * creates the record (checkIn is never overwritten); every later login only adds a session.
 */
export const recordLogin = async (emp, { ip = '', source = 'Web' } = {}) => {
  const now = new Date();
  const dateString = istDateString(now);
  const rules = await getRules(emp.brandId);
  const sessionId = crypto.randomBytes(8).toString('hex');
  const session = { sessionId, loginAt: now, logoutAt: null, source, ip };

  const filter = { employee: emp._id, dateString };
  const base = lateInfo(now, rules);

  let att = null;
  for (let attempt = 0; attempt < 3 && !att; attempt += 1) {
    try {
      // Atomic upsert: concurrent first logins cannot create two rows (unique index employee+dateString).
      // eslint-disable-next-line no-await-in-loop
      att = await Attendance.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            employee: emp._id,
            employeeId: emp.employeeId,
            employeeName: emp.fullName,
            brandId: emp.brandId,
            storeId: emp.storeId || '',
            date: istMidnight(dateString),
            dateString,
            shift: { name: 'Office hours', startTime: rules.officeStartTime, endTime: rules.officeEndTime, graceMinutes: rules.graceMinutes },
            checkIn: now,
            checkInSource: source === 'Mobile' ? 'Mobile' : 'Web',
            status: base.status,
            lateMinutes: base.lateMinutes,
          },
          $set: { lastActivityAt: now, isMissingCheckout: true },
          $push: { sessions: session },
          $inc: { loginCount: 1 },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    } catch (err) {
      if (err?.code !== 11000) throw err; // duplicate-key race: retry as a plain update
    }
  }
  if (!att) throw new Error('Could not record attendance');

  // An existing row may have been created by an admin / leave sync with no checkIn yet.
  if (!att.checkIn) {
    att.checkIn = now;
    att.checkInSource = source === 'Mobile' ? 'Mobile' : 'Web';
  }
  recomputeAttendance(att, rules, now);
  await att.save();
  return { attendance: att, sessionId, rules };
};

/** Close one session (logout) or every open session (explicit check-out). */
export const closeSessions = async (emp, { sessionId = null, all = false } = {}) => {
  const now = new Date();
  const dateString = istDateString(now);
  // The session may have started yesterday (overnight): look at today first, then the previous IST day.
  const candidates = [dateString, addDays(dateString, -1)];
  const rules = await getRules(emp.brandId);
  let touched = null;
  for (const ds of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const att = await Attendance.findOne({ employee: emp._id, dateString: ds });
    if (!att) continue;
    let changed = false;
    for (const s of att.sessions) {
      if (s.logoutAt) continue;
      if (all || (sessionId && s.sessionId === sessionId)) {
        s.logoutAt = now;
        changed = true;
      }
    }
    if (changed) {
      att.lastActivityAt = now;
      att.checkOutSource = 'Web';
      recomputeAttendance(att, rules, now);
      // eslint-disable-next-line no-await-in-loop
      await att.save();
      touched = att;
      if (!all) break;
    }
  }
  return touched;
};

// ───────────────────────── leave <-> attendance ─────────────────────────

export const leaveDateRange = (leave) => eachDate(istDateString(leave.startDate), istDateString(leave.endDate));

/** Days of this leave on which the employee has already worked (a real login exists). */
export const findLeaveConflicts = async (leave) => {
  const dates = leaveDateRange(leave);
  const rows = await Attendance.find({
    employee: leave.employee,
    dateString: { $in: dates },
    checkIn: { $ne: null },
    status: { $nin: ['On Leave'] },
  })
    .select('dateString status')
    .lean();
  return rows.map((r) => r.dateString);
};

/** Approved leave writes locked attendance rows so the two records can never disagree. */
export const applyLeaveToAttendance = async (leave, emp) => {
  const dates = leaveDateRange(leave);
  const half = Boolean(leave.isHalfDay);
  for (const dateString of dates) {
    // eslint-disable-next-line no-await-in-loop
    await Attendance.findOneAndUpdate(
      { employee: leave.employee, dateString },
      {
        $setOnInsert: {
          employee: leave.employee,
          employeeId: leave.employeeId,
          employeeName: leave.employeeName,
          brandId: leave.brandId,
          storeId: emp?.storeId || '',
          date: istMidnight(dateString),
          dateString,
        },
        $set: { status: half ? 'Half Day' : 'On Leave', statusLocked: true, notes: `${leave.leaveType} (${leave.leaveId})` },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
};

// ───────────────────────── monthly summary ─────────────────────────

export const monthRange = (month) => {
  const m = /^(\d{4})-(\d{2})$/.test(String(month || '')) ? month : istMonthString();
  const first = `${m}-01`;
  const nextMonthFirst = istDateString(new Date(istMidnight(first).getTime() + 32 * 86400000)).slice(0, 7) + '-01';
  const last = addDays(nextMonthFirst, -1);
  return { month: m, first, last };
};

export const buildMonthlySummary = async (emp, month) => {
  const { month: m, first, last } = monthRange(month);
  const today = istDateString();
  const rules = await getRules(emp.brandId);
  const [records, holidays] = await Promise.all([
    Attendance.find({ employee: emp._id, dateString: { $gte: first, $lte: last } }).lean(),
    Holiday.find({ dateString: { $gte: first, $lte: last }, brandId: { $in: [emp.brandId, 'ALL'] }, isOptional: { $ne: true } }).lean(),
  ]);
  const recByDate = Object.fromEntries(records.map((r) => [r.dateString, r]));
  const holByDate = Object.fromEntries(holidays.map((h) => [h.dateString, h.name]));
  const joined = emp.joiningDate ? istDateString(emp.joiningDate) : first;
  const offs = new Set(rules.weeklyOffs || []);

  const days = [];
  const counts = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, holiday: 0, weeklyOff: 0 };
  let minutes = 0;
  for (const ds of eachDate(first, last, 31)) {
    const rec = recByDate[ds];
    let status = null;
    if (rec) status = rec.status;
    else if (ds > today || ds < joined) status = null;
    else if (holByDate[ds]) status = 'Holiday';
    else if (offs.has(weekdayOfDateString(ds))) status = 'Weekly Off';
    else if (ds < today) status = 'Absent'; // a past working day with no record
    else status = 'Not marked'; // today, nothing recorded yet
    if (rec) minutes += rec.totalDurationMinutes || 0;
    if (status === 'Present') counts.present += 1;
    else if (status === 'Late') { counts.present += 1; counts.late += 1; }
    else if (status === 'Half Day') counts.halfDay += 1;
    else if (status === 'On Leave') counts.leave += 1;
    else if (status === 'Absent') counts.absent += 1;
    else if (status === 'Holiday') counts.holiday += 1;
    else if (status === 'Weekly Off') counts.weeklyOff += 1;
    days.push({
      date: ds,
      status,
      holiday: holByDate[ds] || '',
      checkIn: rec?.checkIn || null,
      checkOut: rec?.checkOut || null,
      workedMinutes: rec?.totalDurationMinutes || 0,
      lateMinutes: rec?.lateMinutes || 0,
      loginCount: rec?.loginCount || 0,
    });
  }
  return { month: m, rules, counts, totalWorkedMinutes: minutes, days };
};

export const sanitizeEmployee = (e) => {
  if (!e) return e;
  const o = typeof e.toObject === 'function' ? e.toObject() : { ...e };
  delete o.password;
  delete o.tokenVersion;
  return o;
};

export const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export { LeaveRequest };

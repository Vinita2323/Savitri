import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Employee from '../models/Employee.model.js';
import EmployeeSelfie from '../models/EmployeeSelfie.model.js';
import EmployeeSelfieAlert from '../models/EmployeeSelfieAlert.model.js';
import SchedulerState from '../models/SchedulerState.model.js';
import Holiday from '../models/Holiday.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import Attendance from '../models/Attendance.model.js';
import { getRules, istDateString, istMidnight, parseHHmm, weekdayOfDateString, notifyEmployee, escapeRegex } from './employeeCore.js';
import { getJwtSecret } from '../utils/jwtConfig.js';
import { emitToRoom } from '../socket/socket.js';
import { sendNotificationToEmployee } from '../utils/pushNotificationHelper.js';

// ───────────────────────── configuration ─────────────────────────
const MIN = 60 * 1000;
export const EARLY_MINUTES = 15; // "Due soon" window; also the earliest a periodic selfie can be sent before it is due
export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const OUTAGE_GAP_MS = 3 * MIN; // the scheduler normally runs every minute
const SIGNED_URL_TTL_SECONDS = 10 * 60;
const REPEATED_MISS_THRESHOLD = 3;
export const SELFIE_STORAGE_ROOT = path.resolve(process.env.SELFIE_STORAGE_DIR || path.join(process.cwd(), 'private_uploads', 'employee_selfies'));
const retentionDays = () => Math.max(1, Number(process.env.SELFIE_RETENTION_DAYS) || 90);

export class SelfieError extends Error {
  constructor(status, message, code = '', extra = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const clamp = (v, lo, hi, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

/** Selfie rules for a brand (brand rules override GLOBAL, which override the defaults). */
export const getSelfieConfig = async (brandId) => {
  const rules = await getRules(brandId);
  return {
    rules,
    enabled: rules.selfieEnabled !== false,
    intervalMinutes: clamp(rules.selfieIntervalMinutes, 30, 480, 120),
    graceMinutes: clamp(rules.selfieGraceMinutes, 1, 120, 15),
  };
};

const shiftWindow = (workDate, rules) => {
  const start = istMidnight(workDate).getTime() + parseHHmm(rules.officeStartTime, 570) * MIN;
  let end = istMidnight(workDate).getTime() + parseHHmm(rules.officeEndTime, 1110) * MIN;
  if (end <= start) end = start + 9 * 60 * MIN;
  return { start: new Date(start), end: new Date(end) };
};

// ───────────────────────── private image storage + signed links ─────────────────────────
const sniffImage = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
};

const saveImage = async (buffer, ext, { brandId, workDate, code, sequence }) => {
  const safe = (s) => String(s || 'x').replace(/[^A-Za-z0-9_-]/g, '_');
  const key = path.posix.join(safe(brandId || 'none'), workDate, `${safe(code)}-${sequence}-${crypto.randomBytes(12).toString('hex')}.${ext}`);
  const full = path.join(SELFIE_STORAGE_ROOT, key);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer, { flag: 'wx' });
  return key;
};

const resolveKey = (key) => {
  const full = path.resolve(SELFIE_STORAGE_ROOT, key);
  return full.startsWith(SELFIE_STORAGE_ROOT + path.sep) ? full : null; // never leave the private folder
};

export const deleteImage = async (key) => {
  const full = key ? resolveKey(key) : null;
  if (full) await fs.promises.unlink(full).catch(() => {});
};

export const openImage = (selfie) => {
  const full = selfie?.imageKey && !selfie.imageDeletedAt ? resolveKey(selfie.imageKey) : null;
  return full && fs.existsSync(full) ? full : null;
};

const sign = (id, exp) => crypto.createHmac('sha256', getJwtSecret()).update(`selfie:${id}:${exp}`).digest('hex').slice(0, 40);

/** Short-lived link. Only produced by endpoints that already authorised the viewer. */
export const signedImageUrl = (id) => {
  const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  return `/api/selfie-files/${id}?exp=${exp}&sig=${sign(id, exp)}`;
};

export const verifySignedUrl = (id, exp, sig) => {
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(sign(id, e));
  const given = Buffer.from(String(sig || ''));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

// ───────────────────────── working-day rules ─────────────────────────
/** Holidays and approved leave for one brand and day (loaded once, reused for many employees). */
const loadDayContext = async (brandId, workDate) => {
  const [holiday, leaves] = await Promise.all([
    Holiday.exists({ dateString: workDate, brandId: { $in: [brandId, 'ALL', ''] }, isOptional: { $ne: true } }),
    LeaveRequest.find({ brandId, status: 'Approved', startDate: { $lte: new Date(istMidnight(workDate).getTime() + 24 * 60 * MIN - 1) }, endDate: { $gte: istMidnight(workDate) } }).select('employee').lean(),
  ]);
  return { holiday: Boolean(holiday), leaveSet: new Set(leaves.map((l) => String(l.employee))) };
};

const dayRequirement = (emp, workDate, cfg, ctx) => {
  if (!cfg.enabled) return { required: false, reason: 'DISABLED' };
  if ((cfg.rules.weeklyOffs || []).includes(weekdayOfDateString(workDate))) return { required: false, reason: 'WEEKLY_OFF' };
  if (ctx.holiday) return { required: false, reason: 'HOLIDAY' };
  if (ctx.leaveSet.has(String(emp._id))) return { required: false, reason: 'LEAVE' };
  return { required: true, reason: null };
};

// ───────────────────────── notifications ─────────────────────────
const dueText = (cfg) => (cfg.intervalMinutes === 120 ? 'Your 2-hour employee verification is due. Please upload your live selfie.' : 'Your employee verification is due. Please upload your live selfie.');

const CAPTURE_LINK = '/employee/selfie?capture=1'; // opens the live camera straight away
const MESSAGES = {
  LOGIN_REQUIRED: (cfg) => ({ type: 'selfie_login_required', title: 'Login selfie required', message: 'Please take your live login selfie to start your day.', link: CAPTURE_LINK }),
  DUE: (cfg) => ({ type: 'selfie_due', title: 'Selfie verification due', message: dueText(cfg), link: CAPTURE_LINK }),
  SUBMITTED: (cfg, next) => ({ type: 'selfie_submitted', title: 'Selfie submitted', message: next ? `Thank you. Your next verification is due at ${fmtClock(next)}.` : 'Thank you. Your selfie has been recorded.', link: '/employee/selfie' }),
  OVERDUE: (cfg) => ({ type: 'selfie_overdue', title: 'Selfie verification overdue', message: 'Your selfie verification is overdue. Please upload your live selfie now.', link: CAPTURE_LINK }),
  MISSED: (cfg) => ({ type: 'selfie_missed', title: 'Selfie verification missed', message: 'You missed a selfie verification. It has been recorded and your admin has been notified.', link: CAPTURE_LINK }),
};

const fmtClock = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

/** In-app notification + push (FCM) so the reminder works with the app in the background. */
const notifySelfie = async (empLike, kind, cfg, extra) => {
  const m = MESSAGES[kind](cfg, extra);
  const emp = { _id: empLike.employee || empLike._id, brandId: empLike.brandId };
  await notifyEmployee(emp, { type: m.type, title: m.title, message: m.message, link: m.link, meta: { kind } });
  await sendNotificationToEmployee(emp._id, { title: m.title, body: m.message, data: { link: m.link, type: m.type } }).catch(() => {});
};

const createAlert = async ({ type, row, message, dedupeKey }) => {
  try {
    await EmployeeSelfieAlert.create({
      type, brandId: row.brandId || '', employee: row.employee, employeeCode: row.employeeCode, employeeName: row.employeeName,
      workDate: row.workDate, message, selfie: row._id || null, dedupeKey,
    });
    emitToRoom('finance', 'selfie:alert', {});
    return true;
  } catch (err) {
    if (err?.code === 11000) return false; // already raised: exactly one alert per fact
    throw err;
  }
};

const pingAdmins = () => emitToRoom('finance', 'selfie:changed', {});

// ───────────────────────── slots ─────────────────────────
const slotBase = (emp, workDate) => ({
  employee: emp._id, employeeCode: emp.employeeId, employeeName: emp.fullName, brandId: emp.brandId || '',
  department: emp.department || '', designation: emp.designation || '', workDate,
});

/** Today's LOGIN slot (sequence 0). Idempotent: concurrent callers still end up with exactly one row. */
const ensureLoginSlot = async (emp, cfg, now, createdBy) => {
  const workDate = istDateString(now);
  const shift = shiftWindow(workDate, cfg.rules);
  const byLogin = createdBy === 'login';
  const regularGrace = new Date(shift.start.getTime() + cfg.graceMinutes * MIN);
  // Someone who opens the app after the regular grace has already passed gets a fresh window from that moment
  const graceUntil = byLogin && regularGrace < now ? new Date(now.getTime() + cfg.graceMinutes * MIN) : regularGrace;
  await EmployeeSelfie.updateOne(
    { employee: emp._id, workDate, sequence: 0 },
    {
      $setOnInsert: {
        ...slotBase(emp, workDate), verificationType: 'LOGIN', sequence: 0, status: 'PENDING', scheduledAt: shift.start, graceUntil,
        // an employee who is already at the gate has just been asked in the app: no extra push for it
        dueNotifiedAt: byLogin ? now : null, overdueNotifiedAt: byLogin ? now : null,
        history: [{ at: now, action: 'SCHEDULED', note: byLogin ? 'opened at login' : 'start of day' }],
      },
    },
    { upsert: true }
  ).catch((err) => { if (err?.code !== 11000) throw err; });
  return EmployeeSelfie.findOne({ employee: emp._id, workDate, sequence: 0 });
};

/** Creates the slot after `prev` (idempotent, never duplicates). Returns it, or null when the day's schedule is over. */
const scheduleNext = async (emp, prev, cfg, now, { afterMissed = false } = {}) => {
  const shift = shiftWindow(prev.workDate, cfg.rules);
  let due = afterMissed
    ? new Date(Math.max(prev.scheduledAt.getTime() + cfg.intervalMinutes * MIN, now.getTime() + MIN))
    : new Date(now.getTime() + cfg.intervalMinutes * MIN);
  if (due > shift.end) return null; // nothing is requested after the working day ends
  const sequence = prev.sequence + 1;
  await EmployeeSelfie.updateOne(
    { employee: emp._id, workDate: prev.workDate, sequence },
    {
      $setOnInsert: {
        ...slotBase(emp, prev.workDate), verificationType: 'PERIODIC', sequence, status: 'PENDING', scheduledAt: due,
        graceUntil: new Date(due.getTime() + cfg.graceMinutes * MIN), history: [{ at: now, action: 'SCHEDULED', note: afterMissed ? 'after a missed verification' : 'after a successful selfie' }],
      },
    },
    { upsert: true }
  ).catch((err) => { if (err?.code !== 11000) throw err; });
  return EmployeeSelfie.findOne({ employee: emp._id, workDate: prev.workDate, sequence });
};

/** Self-healing: if a day has a finished slot but no next one (crash, check-out and re-login), create it. */
const ensureNextSlot = async (emp, cfg, workDate, now) => {
  const last = await EmployeeSelfie.findOne({ employee: emp._id, workDate }).sort({ sequence: -1 });
  if (!last || last.verificationType === 'LOGIN' && last.status !== 'COMPLETED') return null;
  if (last.status === 'PENDING') return last;
  if (last.status === 'COMPLETED') return scheduleNext(emp, { ...last.toObject(), scheduledAt: last.scheduledAt, sequence: last.sequence, workDate }, cfg, last.serverTimestamp || now);
  if (last.status === 'MISSED') return scheduleNext(emp, last, cfg, now, { afterMissed: true });
  if (last.status === 'CANCELLED') {
    // Checked out earlier. The cycle restarts only when they are working again (an open session), never just because the page is open.
    const att = await Attendance.findOne({ employee: emp._id, dateString: workDate }).select('sessions').lean();
    return att?.sessions?.some((x) => !x.logoutAt) ? scheduleNext(emp, last, cfg, now) : null;
  }
  return null;
};

// ───────────────────────── status (employee side) ─────────────────────────
const computeCurrentStatus = (rows, cfg, now, required) => {
  if (!required) return 'NOT_REQUIRED';
  const login = rows.find((r) => r.sequence === 0);
  if (!login) return 'PENDING';
  if (login.status !== 'COMPLETED') return login.status === 'MISSED' ? 'MISSED' : 'PENDING';
  const pending = rows.filter((r) => r.status === 'PENDING' && r.sequence > 0).sort((a, b) => a.sequence - b.sequence)[0];
  if (pending) {
    if (now >= pending.scheduledAt) return 'OVERDUE';
    if (pending.scheduledAt.getTime() - now.getTime() <= EARLY_MINUTES * MIN) return 'DUE_SOON';
  }
  // Nothing needs doing right now. "Missed" stays until the employee next submits a selfie; otherwise they are up to date.
  const closed = rows.filter((r) => r.status === 'COMPLETED' || r.status === 'MISSED').sort((a, b) => b.sequence - a.sequence)[0];
  return closed?.status === 'MISSED' ? 'MISSED' : 'COMPLETED';
};

export const shapeSelfie = (r, { image = true, admin = false } = {}) => ({
  id: String(r._id),
  employeeCode: r.employeeCode,
  employeeName: r.employeeName,
  workDate: r.workDate,
  verificationType: r.verificationType,
  sequence: r.sequence,
  status: r.status,
  scheduledAt: r.scheduledAt,
  graceUntil: r.graceUntil,
  capturedAt: r.serverTimestamp || r.capturedAt || null,
  late: r.late,
  minutesLate: r.minutesLate,
  missedAt: r.missedAt,
  graceExtendedForOutage: r.graceExtendedForOutage,
  imageUrl: image && r.imageKey && !r.imageDeletedAt && r.status === 'COMPLETED' ? signedImageUrl(r._id) : '',
  imageExpired: Boolean(r.imageDeletedAt),
  ...(admin ? { deviceInfo: r.deviceInfo, clockSkewSeconds: r.clockSkewSeconds, clientCapturedAt: r.clientCapturedAt, history: r.history } : {}),
});

export const getTodayStatus = async (emp, now = new Date()) => {
  const cfg = await getSelfieConfig(emp.brandId);
  const workDate = istDateString(now);
  if (!cfg.enabled) return { enabled: false, required: false, reason: 'DISABLED', workDate, currentStatus: 'NOT_REQUIRED', loginRequired: false, canCapture: false, config: { intervalMinutes: cfg.intervalMinutes, graceMinutes: cfg.graceMinutes } };
  const ctx = await loadDayContext(emp.brandId, workDate);
  const req = dayRequirement(emp, workDate, cfg, ctx);
  const base = { enabled: true, workDate, now, config: { intervalMinutes: cfg.intervalMinutes, graceMinutes: cfg.graceMinutes, earlyMinutes: EARLY_MINUTES } };
  if (!req.required) {
    return { ...base, required: false, reason: req.reason, currentStatus: 'NOT_REQUIRED', loginRequired: false, canCapture: false, loginSelfie: null, lastSelfie: null, lastSubmissionAt: null, nextDueAt: null, totalToday: 0, missedToday: 0 };
  }
  await ensureLoginSlot(emp, cfg, now, 'login');
  await ensureNextSlot(emp, cfg, workDate, now);
  const rows = await EmployeeSelfie.find({ employee: emp._id, workDate }).sort({ sequence: 1 });
  const login = rows.find((r) => r.sequence === 0);
  const loginDone = login?.status === 'COMPLETED';
  const done = rows.filter((r) => r.status === 'COMPLETED');
  const pending = rows.filter((r) => r.status === 'PENDING' && r.sequence > 0).sort((a, b) => a.sequence - b.sequence)[0] || null;
  const last = [...done].sort((a, b) => (b.serverTimestamp || 0) - (a.serverTimestamp || 0))[0] || null;
  const currentStatus = computeCurrentStatus(rows, cfg, now, true);
  const canCapturePeriodic = Boolean(pending && now.getTime() >= pending.scheduledAt.getTime() - EARLY_MINUTES * MIN);
  return {
    ...base,
    required: true,
    reason: null,
    loginRequired: !loginDone,
    captureType: !loginDone ? 'LOGIN' : 'PERIODIC',
    canCapture: !loginDone || canCapturePeriodic,
    currentStatus,
    loginSelfie: login ? shapeSelfie(login) : null,
    lastSelfie: last ? shapeSelfie(last) : null,
    lastSubmissionAt: last ? last.serverTimestamp : null,
    nextDueAt: pending ? pending.scheduledAt : null,
    nextGraceUntil: pending ? pending.graceUntil : null,
    totalToday: done.length,
    missedToday: rows.filter((r) => r.missedAt).length, // a miss stays counted even if the selfie was sent late afterwards
  };
};

export const getMyHistory = async (emp, { from, to, page = 1, limit = 30 } = {}) => {
  const q = { employee: emp._id };
  if (from || to) q.workDate = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const lim = Math.min(100, Math.max(1, Number(limit) || 30));
  const pg = Math.max(1, Number(page) || 1);
  q.status = { $in: ['COMPLETED', 'MISSED'] };
  const [total, rows] = await Promise.all([EmployeeSelfie.countDocuments(q), EmployeeSelfie.find(q).sort({ workDate: -1, sequence: -1 }).skip((pg - 1) * lim).limit(lim)]);
  return { total, page: pg, pages: Math.max(1, Math.ceil(total / lim)), selfies: rows.map((r) => shapeSelfie(r)) };
};

// ───────────────────────── submit ─────────────────────────
export const submitSelfie = async (emp, { type, buffer, claimedAt, deviceInfo = {}, ip = '' }, now = new Date()) => {
  const cfg = await getSelfieConfig(emp.brandId);
  if (!cfg.enabled) throw new SelfieError(400, 'Selfie verification is turned off for your brand.', 'DISABLED');
  const workDate = istDateString(now);
  const ctx = await loadDayContext(emp.brandId, workDate);
  const req = dayRequirement(emp, workDate, cfg, ctx);
  if (!req.required) throw new SelfieError(409, 'No selfie is needed today.', 'NOT_REQUIRED', { reason: req.reason });

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new SelfieError(400, 'No photo was received. Please capture a live selfie with the camera.', 'NO_IMAGE');
  if (buffer.length > MAX_IMAGE_BYTES) throw new SelfieError(413, 'The photo is too large. Please try again.', 'TOO_LARGE');
  const img = sniffImage(buffer);
  if (!img) throw new SelfieError(400, 'The photo is not a valid image (JPEG, PNG or WEBP).', 'BAD_IMAGE');

  // Which slot does this photo complete?
  let slot;
  if (type === 'LOGIN') {
    slot = await ensureLoginSlot(emp, cfg, now, 'login');
    if (slot.status === 'COMPLETED') throw new SelfieError(409, 'Your login selfie for today is already submitted.', 'ALREADY_DONE');
  } else {
    const login = await EmployeeSelfie.findOne({ employee: emp._id, workDate, sequence: 0 });
    if (!login || login.status !== 'COMPLETED') throw new SelfieError(409, 'Submit your login selfie first.', 'LOGIN_FIRST');
    await ensureNextSlot(emp, cfg, workDate, now);
    slot = await EmployeeSelfie.findOne({ employee: emp._id, workDate, status: 'PENDING', sequence: { $gt: 0 } }).sort({ sequence: 1 });
    if (!slot) throw new SelfieError(409, 'No verification is due right now.', 'NOTHING_DUE');
    if (now.getTime() < slot.scheduledAt.getTime() - EARLY_MINUTES * MIN) {
      throw new SelfieError(409, `Your next verification is due at ${fmtClock(slot.scheduledAt)}. It cannot be sent yet.`, 'TOO_EARLY', { dueAt: slot.scheduledAt });
    }
  }

  const claimed = claimedAt ? new Date(claimedAt) : null;
  const clientCapturedAt = claimed && !Number.isNaN(claimed.getTime()) ? claimed : null;
  const key = await saveImage(buffer, img.ext, { brandId: emp.brandId, workDate, code: emp.employeeId, sequence: slot.sequence });
  const late = now > slot.scheduledAt && (type !== 'LOGIN' || now > new Date(slot.scheduledAt.getTime() + cfg.graceMinutes * MIN) || slot.status === 'MISSED');
  const minutesLate = late ? Math.max(0, Math.round((now.getTime() - slot.scheduledAt.getTime()) / MIN)) : 0;

  // Atomic: only one request can move this slot out of PENDING/MISSED, so double taps and races cannot complete it twice
  const done = await EmployeeSelfie.findOneAndUpdate(
    { _id: slot._id, status: { $in: type === 'LOGIN' ? ['PENDING', 'MISSED'] : ['PENDING'] } },
    {
      $set: {
        status: 'COMPLETED', capturedAt: now, serverTimestamp: now, clientCapturedAt, late, minutesLate,
        clockSkewSeconds: clientCapturedAt ? Math.round((clientCapturedAt.getTime() - now.getTime()) / 1000) : null,
        imageKey: key, imageMime: img.mime, imageSize: buffer.length, imageHash: crypto.createHash('sha256').update(buffer).digest('hex'),
        deviceInfo: {
          userAgent: String(deviceInfo.userAgent || '').slice(0, 300), platform: String(deviceInfo.platform || '').slice(0, 60), language: String(deviceInfo.language || '').slice(0, 20),
          screen: String(deviceInfo.screen || '').slice(0, 30), cameraLabel: String(deviceInfo.cameraLabel || '').slice(0, 120), captureMethod: String(deviceInfo.captureMethod || '').slice(0, 30), ip: String(ip || '').slice(0, 64),
        },
      },
      $push: { history: { at: now, action: 'COMPLETED', note: late ? `${minutesLate} min late` : 'on time' } },
    },
    { returnDocument: 'after' }
  );
  if (!done) {
    await deleteImage(key);
    throw new SelfieError(409, 'This verification was just completed. Please refresh.', 'ALREADY_DONE');
  }

  const next = await scheduleNext(emp, done, cfg, now);
  notifySelfie({ employee: emp._id, brandId: emp.brandId }, 'SUBMITTED', cfg, next?.scheduledAt).catch(() => {});
  pingAdmins();
  return { selfie: shapeSelfie(done), nextDueAt: next ? next.scheduledAt : null };
};

/** Explicit check-out: the day's remaining requests are cancelled (the history stays). */
export const cancelPendingOnCheckout = async (emp, now = new Date()) => {
  const workDate = istDateString(now);
  const res = await EmployeeSelfie.updateMany(
    { employee: emp._id, workDate, status: 'PENDING', sequence: { $gt: 0 } },
    { $set: { status: 'CANCELLED' }, $push: { history: { at: now, action: 'CANCELLED', note: 'employee checked out' } } }
  );
  if (res.modifiedCount) pingAdmins();
  return res.modifiedCount;
};

// ───────────────────────── scheduler ─────────────────────────
const ENOUGH = 500;

/**
 * One pass of the background job (runs every minute inside the server; safe to run on several instances).
 * Every state change is an atomic "claim", so reminders / misses / alerts happen exactly once even if two
 * passes overlap or the server restarts mid-way. All state is in MongoDB, nothing lives in memory.
 */
export const runSelfieSweep = async ({ now = new Date() } = {}) => {
  const out = { loginSlots: 0, due: 0, overdue: 0, missed: 0, alerts: 0, outageExtended: 0, purged: 0 };

  // 0) heartbeat: if the server was down, deadlines that fell inside the outage are extended instead of counted against employees
  const state = await SchedulerState.findOneAndUpdate({ key: 'selfie' }, { $set: { lastRunAt: now } }, { upsert: true, returnDocument: 'before' });
  const prevRun = state?.lastRunAt || null;
  if (prevRun && now.getTime() - prevRun.getTime() > OUTAGE_GAP_MS) {
    const ext = await EmployeeSelfie.updateMany(
      { status: 'PENDING', graceUntil: { $gt: prevRun, $lte: now } },
      [{ $set: { graceUntil: { $add: [now, { $subtract: ['$graceUntil', '$scheduledAt'] }] }, graceExtendedForOutage: true, history: { $concatArrays: [{ $ifNull: ['$history', []] }, [{ at: now, action: 'GRACE_EXTENDED', note: 'server was unavailable' }]] } } }],
      { updatePipeline: true }
    );
    out.outageExtended = ext.modifiedCount;
  }

  // 1) start of day: a LOGIN slot for every employee who has to verify today
  const workDate = istDateString(now);
  const employees = await Employee.find({ registrationStatus: { $ne: 'Pending' }, employmentStatus: 'Active' }).select('_id employeeId fullName brandId department designation').lean();
  const byBrand = new Map();
  employees.forEach((e) => { const k = e.brandId || ''; if (!byBrand.has(k)) byBrand.set(k, []); byBrand.get(k).push(e); });
  for (const [brandId, list] of byBrand) {
    // eslint-disable-next-line no-await-in-loop
    const cfg = await getSelfieConfig(brandId);
    if (!cfg.enabled) continue;
    const shift = shiftWindow(workDate, cfg.rules);
    if (now < shift.start) continue;
    // eslint-disable-next-line no-await-in-loop
    const ctx = await loadDayContext(brandId, workDate);
    for (const e of list) {
      if (!dayRequirement(e, workDate, cfg, ctx).required) continue;
      // eslint-disable-next-line no-await-in-loop
      const exists = await EmployeeSelfie.exists({ employee: e._id, workDate, sequence: 0 });
      if (exists) continue;
      // eslint-disable-next-line no-await-in-loop
      await ensureLoginSlot(e, cfg, now, 'scheduler');
      out.loginSlots += 1;
    }
  }

  // 2) "due" reminders (the LOGIN one is the "login selfie required" notification)
  const dueRows = await EmployeeSelfie.find({ status: 'PENDING', scheduledAt: { $lte: now }, dueNotifiedAt: null }).limit(ENOUGH);
  for (const r of dueRows) {
    // eslint-disable-next-line no-await-in-loop
    const claimed = await EmployeeSelfie.findOneAndUpdate({ _id: r._id, status: 'PENDING', dueNotifiedAt: null }, { $set: { dueNotifiedAt: now } });
    if (!claimed) continue;
    // eslint-disable-next-line no-await-in-loop
    const cfg = await getSelfieConfig(r.brandId);
    // eslint-disable-next-line no-await-in-loop
    await notifySelfie(r, r.verificationType === 'LOGIN' ? 'LOGIN_REQUIRED' : 'DUE', cfg);
    out.due += 1;
  }

  // 3) "overdue" reminder, halfway through the grace period
  const overdueRows = await EmployeeSelfie.find({
    status: 'PENDING', overdueNotifiedAt: null, dueNotifiedAt: { $ne: null },
    $expr: { $lte: [{ $add: ['$scheduledAt', { $divide: [{ $subtract: ['$graceUntil', '$scheduledAt'] }, 2] }] }, now] },
  }).limit(ENOUGH);
  for (const r of overdueRows) {
    // eslint-disable-next-line no-await-in-loop
    const claimed = await EmployeeSelfie.findOneAndUpdate({ _id: r._id, status: 'PENDING', overdueNotifiedAt: null }, { $set: { overdueNotifiedAt: now } });
    if (!claimed) continue;
    // eslint-disable-next-line no-await-in-loop
    await notifySelfie(r, 'OVERDUE', await getSelfieConfig(r.brandId));
    out.overdue += 1;
  }

  // 4) missed: the grace period is over
  const lateRows = await EmployeeSelfie.find({ status: 'PENDING', graceUntil: { $lte: now } }).limit(ENOUGH);
  for (const r of lateRows) {
    // eslint-disable-next-line no-await-in-loop
    const claimed = await EmployeeSelfie.findOneAndUpdate(
      { _id: r._id, status: 'PENDING', graceUntil: { $lte: now } },
      { $set: { status: 'MISSED', missedAt: now, missedNotifiedAt: now }, $push: { history: { at: now, action: 'MISSED', note: 'not submitted within the grace period' } } },
      { returnDocument: 'after' }
    );
    if (!claimed) continue;
    out.missed += 1;
    // eslint-disable-next-line no-await-in-loop
    const cfg = await getSelfieConfig(claimed.brandId);
    // eslint-disable-next-line no-await-in-loop
    await notifySelfie(claimed, 'MISSED', cfg);
    const isLogin = claimed.verificationType === 'LOGIN';
    // eslint-disable-next-line no-await-in-loop
    const raised = await createAlert({
      type: isLogin ? 'LOGIN_MISSED' : 'VERIFICATION_MISSED', row: claimed, dedupeKey: `missed:${claimed._id}`,
      message: isLogin ? `${claimed.employeeName} (${claimed.employeeCode}) missed the login selfie on ${claimed.workDate}.` : `${claimed.employeeName} (${claimed.employeeCode}) missed the ${fmtClock(claimed.scheduledAt)} selfie verification.`,
    });
    if (raised) out.alerts += 1;
    // eslint-disable-next-line no-await-in-loop
    const missedToday = await EmployeeSelfie.countDocuments({ employee: claimed.employee, workDate: claimed.workDate, status: 'MISSED' });
    if (missedToday >= REPEATED_MISS_THRESHOLD) {
      // eslint-disable-next-line no-await-in-loop
      const rep = await createAlert({ type: 'REPEATED_MISSED', row: claimed, dedupeKey: `repeat:${claimed.employee}:${claimed.workDate}`, message: `${claimed.employeeName} (${claimed.employeeCode}) has missed ${missedToday} verifications on ${claimed.workDate}.` });
      if (rep) out.alerts += 1;
    }
    if (!isLogin) {
      // eslint-disable-next-line no-await-in-loop
      await scheduleNext({ _id: claimed.employee, employeeId: claimed.employeeCode, fullName: claimed.employeeName, brandId: claimed.brandId, department: claimed.department, designation: claimed.designation }, claimed, cfg, now, { afterMissed: true });
    }
  }
  if (out.missed) pingAdmins();

  // 5) end of a day: requests that were never answered or closed
  await EmployeeSelfie.updateMany(
    { status: 'PENDING', workDate: { $lt: workDate } },
    { $set: { status: 'CANCELLED' }, $push: { history: { at: now, action: 'CANCELLED', note: 'working day ended' } } }
  );

  // 6) retention: delete old image files once a day (the record, its timestamps and status stay for the audit)
  if (state?.lastPurgeDate !== workDate) {
    const cutoff = new Date(now.getTime() - retentionDays() * 24 * 60 * MIN);
    const old = await EmployeeSelfie.find({ imageKey: { $ne: '' }, imageDeletedAt: null, serverTimestamp: { $lt: cutoff } }).select('_id imageKey').limit(2000);
    for (const r of old) {
      // eslint-disable-next-line no-await-in-loop
      await deleteImage(r.imageKey);
      // eslint-disable-next-line no-await-in-loop
      await EmployeeSelfie.updateOne({ _id: r._id }, { $set: { imageDeletedAt: now } });
      out.purged += 1;
    }
    await SchedulerState.updateOne({ key: 'selfie' }, { $set: { lastPurgeDate: workDate } });
  }
  return out;
};

// ───────────────────────── admin views ─────────────────────────
const scopedEmployeeFilter = (scope, { search, department }) => {
  const f = { registrationStatus: { $ne: 'Pending' }, employmentStatus: 'Active' };
  if (scope && !scope.isAll) f.brandId = scope.brandId;
  if (department) f.department = new RegExp(`^${escapeRegex(department)}$`, 'i');
  if (search) {
    const re = new RegExp(escapeRegex(String(search).slice(0, 80)), 'i');
    f.$or = [{ fullName: re }, { employeeId: re }, { email: re }];
  }
  return f;
};

const STATUS_GROUPS = { COMPLETED: ['COMPLETED'], PENDING: ['PENDING', 'DUE_SOON', 'OVERDUE'], MISSED: ['MISSED'] };

export const getAdminOverview = async ({ scope, date, search, department, status, page = 1, limit = 20 }, now = new Date()) => {
  const today = istDateString(now);
  const workDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? date : today;
  const emps = await Employee.find(scopedEmployeeFilter(scope, { search, department })).select('_id employeeId fullName brandId department designation avatar').sort({ fullName: 1 }).limit(3000).lean();
  const ids = emps.map((e) => e._id);
  const rows = await EmployeeSelfie.find({ employee: { $in: ids }, workDate }).sort({ sequence: 1 });
  const byEmp = new Map();
  rows.forEach((r) => { const k = String(r.employee); if (!byEmp.has(k)) byEmp.set(k, []); byEmp.get(k).push(r); });
  const cfgCache = new Map();
  const ctxCache = new Map();
  const items = [];
  for (const e of emps) {
    const mine = byEmp.get(String(e._id)) || [];
    const bk = e.brandId || '';
    if (!cfgCache.has(bk)) { cfgCache.set(bk, await getSelfieConfig(bk)); ctxCache.set(bk, await loadDayContext(bk, workDate)); } // eslint-disable-line no-await-in-loop
    const cfg = cfgCache.get(bk);
    const req = dayRequirement(e, workDate, cfg, ctxCache.get(bk));
    let current;
    if (!cfg.enabled) current = 'NOT_REQUIRED';
    else if (!mine.length) current = !req.required ? 'NOT_REQUIRED' : workDate < today ? 'NO_RECORD' : 'PENDING';
    else current = workDate === today ? computeCurrentStatus(mine, cfg, now, true) : (mine.some((r) => r.status === 'MISSED') ? 'MISSED' : 'COMPLETED');
    const login = mine.find((r) => r.sequence === 0);
    const done = mine.filter((r) => r.status === 'COMPLETED');
    const last = [...done].sort((a, b) => b.serverTimestamp - a.serverTimestamp)[0] || null;
    const pending = mine.filter((r) => r.status === 'PENDING' && r.sequence > 0).sort((a, b) => a.sequence - b.sequence)[0];
    items.push({
      employee: { id: String(e._id), employeeId: e.employeeId, name: e.fullName, department: e.department, designation: e.designation, avatar: e.avatar || '', brandId: e.brandId },
      loginSelfie: login && login.status === 'COMPLETED' ? shapeSelfie(login) : null,
      loginStatus: login ? login.status : null,
      lastSelfie: last ? shapeSelfie(last) : null,
      lastSubmissionAt: last ? last.serverTimestamp : null,
      nextDueAt: workDate === today && pending ? pending.scheduledAt : null,
      totalSelfies: done.length,
      missed: mine.filter((r) => r.missedAt).length,
      currentStatus: current,
      required: req.required,
      notRequiredReason: req.required ? null : req.reason,
    });
  }
  let filtered = items;
  if (status && status !== 'ALL') {
    filtered = items.filter((i) => (status === 'MISSED' ? i.missed > 0 : (STATUS_GROUPS[status] || []).includes(i.currentStatus)));
  }
  const summary = {
    total: items.length,
    completed: items.filter((i) => i.currentStatus === 'COMPLETED').length,
    pending: items.filter((i) => STATUS_GROUPS.PENDING.includes(i.currentStatus)).length,
    missed: items.filter((i) => i.missed > 0).length,
    notRequired: items.filter((i) => i.currentStatus === 'NOT_REQUIRED').length,
  };
  const lim = Math.min(100, Math.max(1, Number(limit) || 20));
  const pg = Math.max(1, Number(page) || 1);
  const departments = [...new Set((await Employee.find(scopedEmployeeFilter(scope, {})).distinct('department')).filter(Boolean))].sort();
  return { date: workDate, today, total: filtered.length, page: pg, pages: Math.max(1, Math.ceil(filtered.length / lim)), summary, departments, employees: filtered.slice((pg - 1) * lim, pg * lim) };
};

export const getAdminEmployeeDetail = async ({ scope, employeeObjectId, from, to }, now = new Date()) => {
  const emp = await Employee.findById(employeeObjectId).select('_id employeeId fullName email phone brandId brandName department designation avatar employmentStatus joiningDate shift registrationStatus').lean();
  if (!emp || (scope && !scope.isAll && emp.brandId !== scope.brandId)) return null;
  const today = istDateString(now);
  const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
  const dTo = isDay(to) ? to : today;
  const dFrom = isDay(from) ? from : dTo;
  if (dFrom > dTo) throw new SelfieError(400, 'The start date must not be after the end date.');
  const span = (istMidnight(dTo) - istMidnight(dFrom)) / (24 * 60 * MIN);
  if (span > 92) throw new SelfieError(400, 'Choose a range of at most 3 months.');
  const rows = await EmployeeSelfie.find({ employee: emp._id, workDate: { $gte: dFrom, $lte: dTo }, $or: [{ status: { $in: ['COMPLETED', 'MISSED', 'PENDING'] } }, { missedAt: { $ne: null } }] }).sort({ workDate: -1, sequence: 1 });
  const days = new Map();
  rows.forEach((r) => { if (!days.has(r.workDate)) days.set(r.workDate, []); days.get(r.workDate).push(r); });
  const dayList = [...days.entries()].map(([workDate, list]) => ({
    workDate,
    loginSelfie: (() => { const l = list.find((r) => r.sequence === 0 && r.status === 'COMPLETED'); return l ? shapeSelfie(l, { admin: true }) : null; })(),
    selfies: list.filter((r) => r.status === 'COMPLETED').map((r) => shapeSelfie(r, { admin: true })),
    missed: list.filter((r) => r.missedAt).map((r) => shapeSelfie(r, { admin: true })),
    pending: list.filter((r) => r.status === 'PENDING').map((r) => shapeSelfie(r, { admin: true })),
    total: list.filter((r) => r.status === 'COMPLETED').length,
  }));
  const allMissed = await EmployeeSelfie.find({ employee: emp._id, missedAt: { $ne: null } }).sort({ workDate: -1, sequence: -1 }).limit(100);
  const missedTotal = await EmployeeSelfie.countDocuments({ employee: emp._id, missedAt: { $ne: null } });
  return {
    employee: { id: String(emp._id), employeeId: emp.employeeId, name: emp.fullName, email: emp.email, phone: emp.phone, brandId: emp.brandId, brandName: emp.brandName, department: emp.department, designation: emp.designation, avatar: emp.avatar || '', employmentStatus: emp.employmentStatus, joiningDate: emp.joiningDate },
    from: dFrom, to: dTo, today, days: dayList,
    missedHistory: allMissed.map((r) => shapeSelfie(r, { image: false })), missedTotal,
  };
};

export const listAlerts = async ({ scope, adminId, unreadOnly = false, limit = 50 }) => {
  const q = scope && !scope.isAll ? { brandId: scope.brandId } : {};
  const rows = await EmployeeSelfieAlert.find(q).sort({ createdAt: -1 }).limit(Math.min(200, Math.max(1, Number(limit) || 50))).lean();
  const items = rows.map((a) => ({ id: String(a._id), type: a.type, message: a.message, employeeId: a.employeeCode, employeeName: a.employeeName, employee: String(a.employee), workDate: a.workDate, createdAt: a.createdAt, read: a.readBy?.some((r) => r.adminId === String(adminId)) }));
  return { unread: items.filter((i) => !i.read).length, alerts: unreadOnly ? items.filter((i) => !i.read) : items };
};

export const markAlertsRead = async ({ scope, adminId }) => {
  const q = scope && !scope.isAll ? { brandId: scope.brandId } : {};
  const res = await EmployeeSelfieAlert.updateMany({ ...q, 'readBy.adminId': { $ne: String(adminId) } }, { $push: { readBy: { adminId: String(adminId), at: new Date() } } });
  return res.modifiedCount;
};

export const findSelfieForViewer = (id) => EmployeeSelfie.findById(id);

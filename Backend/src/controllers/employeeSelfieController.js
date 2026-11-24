import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import EmployeeSettings from '../models/EmployeeSettings.model.js';
import Brand from '../models/Brand.model.js';
import { getRules, actorFromReq, logActivity, istDateString } from '../services/employeeCore.js';
import {
  SelfieError, getTodayStatus, getMyHistory, submitSelfie, getAdminOverview, getAdminEmployeeDetail, listAlerts, markAlertsRead,
  getSelfieConfig, findSelfieForViewer, openImage, verifySignedUrl,
} from '../services/employeeSelfieService.js';

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

const handle = (res, err) => {
  if (err instanceof SelfieError) return fail(res, err.status, err.message, { code: err.code, ...(err.extra || {}) });
  console.error('[EmployeeSelfie]', err);
  return fail(res, 500, 'Something went wrong. Please try again.');
};

// ───────────────────────── employee ─────────────────────────

export const myTodayStatus = async (req, res) => {
  try {
    return res.json({ success: true, ...(await getTodayStatus(req.employee)) });
  } catch (err) {
    return handle(res, err);
  }
};

export const myHistory = async (req, res) => {
  try {
    const q = req.query || {};
    return res.json({ success: true, ...(await getMyHistory(req.employee, { from: isDay(q.from) ? q.from : undefined, to: isDay(q.to) ? q.to : undefined, page: q.page, limit: q.limit })) });
  } catch (err) {
    return handle(res, err);
  }
};

/** type: 'LOGIN' | 'PERIODIC'. The photo comes from the live camera screen of the app (multipart field "selfie"). */
export const submitMySelfie = (type) => async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, 'No photo was received. Please capture a live selfie with the camera.', { code: 'NO_IMAGE' });
    let device = {};
    try { device = JSON.parse(req.body?.deviceInfo || '{}') || {}; } catch { device = {}; }
    const result = await submitSelfie(req.employee, { type, buffer: req.file.buffer, claimedAt: req.body?.capturedAt, deviceInfo: device, ip: clientIp(req) });
    await logActivity({ action: type === 'LOGIN' ? 'selfie_login_submitted' : 'selfie_submitted', actor: req.user, employee: req.employee, entity: 'EmployeeSelfie', entityId: result.selfie.id, ip: clientIp(req) });
    return res.status(201).json({ success: true, message: 'Selfie submitted.', ...result });
  } catch (err) {
    return handle(res, err);
  }
};

export const registerPushToken = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (token.length < 20 || token.length > 4096) return fail(res, 400, 'A valid push token is required.');
    // keep the 10 newest devices
    await Employee.updateOne({ _id: req.employee._id }, { $pull: { fcmTokens: token } });
    await Employee.updateOne({ _id: req.employee._id }, { $push: { fcmTokens: { $each: [token], $slice: -10 } } });
    return res.json({ success: true });
  } catch (err) {
    return handle(res, err);
  }
};

export const removePushToken = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (token) await Employee.updateOne({ _id: req.employee._id }, { $pull: { fcmTokens: token } });
    return res.json({ success: true });
  } catch (err) {
    return handle(res, err);
  }
};

/**
 * Optional server-side gate (SELFIE_ENFORCE_API=true): until today's login selfie exists, the employee API answers 428
 * for everything except the selfie, notification, profile and logout endpoints. Off by default so existing clients keep working.
 */
const GATE_ALLOW = ['/selfie', '/me', '/logout', '/notifications', '/push-token', '/attendance/check-out'];
export const selfieGate = async (req, res, next) => {
  try {
    if (process.env.SELFIE_ENFORCE_API !== 'true') return next();
    if (GATE_ALLOW.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();
    const st = await getTodayStatus(req.employee);
    if (st.required && st.loginRequired) return fail(res, 428, 'Take your live login selfie to continue.', { code: 'SELFIE_REQUIRED' });
    return next();
  } catch (err) {
    return next(); // never lock people out because of a verification-side error
  }
};

// ───────────────────────── private image (signed link) ─────────────────────────

export const serveSelfieFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !verifySignedUrl(id, req.query.exp, req.query.sig)) return fail(res, 403, 'This link is invalid or has expired.');
    const selfie = await findSelfieForViewer(id);
    const file = selfie ? openImage(selfie) : null;
    if (!file) return fail(res, 404, 'Image not available.');
    res.setHeader('Content-Type', selfie.imageMime || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Disposition', 'inline; filename="selfie"');
    return res.sendFile(file);
  } catch (err) {
    return handle(res, err);
  }
};

// ───────────────────────── admin / super admin (brand-scoped by the existing router) ─────────────────────────

export const adminOverview = async (req, res) => {
  try {
    const q = req.query || {};
    const data = await getAdminOverview({ scope: req.scope, date: q.date, search: q.search, department: q.department, status: String(q.status || 'ALL').toUpperCase(), page: q.page, limit: q.limit });
    return res.json({ success: true, ...data });
  } catch (err) {
    return handle(res, err);
  }
};

export const adminEmployeeDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Employee not found.');
    const q = req.query || {};
    const data = await getAdminEmployeeDetail({ scope: req.scope, employeeObjectId: req.params.id, from: q.from, to: q.to });
    if (!data) return fail(res, 404, 'Employee not found.');
    return res.json({ success: true, ...data });
  } catch (err) {
    return handle(res, err);
  }
};

export const adminAlerts = async (req, res) => {
  try {
    return res.json({ success: true, ...(await listAlerts({ scope: req.scope, adminId: req.user.id, limit: req.query?.limit })) });
  } catch (err) {
    return handle(res, err);
  }
};

export const adminAlertsRead = async (req, res) => {
  try {
    return res.json({ success: true, marked: await markAlertsRead({ scope: req.scope, adminId: req.user.id }) });
  } catch (err) {
    return handle(res, err);
  }
};

const isSuper = (req) => String(req.user?.role || '').replace(/-/g, '_') === 'super_admin';

export const getSelfieSettings = async (req, res) => {
  try {
    const scope = req.scope && !req.scope.isAll ? req.scope.brandId : (typeof req.query?.scope === 'string' && req.query.scope.toUpperCase() !== 'GLOBAL' ? req.query.scope : null);
    const cfg = await getSelfieConfig(scope);
    return res.json({ success: true, scope: scope || 'GLOBAL', enabled: cfg.enabled, intervalMinutes: cfg.intervalMinutes, graceMinutes: cfg.graceMinutes, source: cfg.rules.source });
  } catch (err) {
    return handle(res, err);
  }
};

export const saveSelfieSettings = async (req, res) => {
  try {
    const b = req.body || {};
    const scoped = req.scope && !req.scope.isAll ? req.scope.brandId : null;
    const wanted = typeof b.scope === 'string' ? b.scope.trim() : '';
    const scope = scoped || (wanted && wanted.toUpperCase() !== 'GLOBAL' ? wanted : 'GLOBAL');
    if (scope === 'GLOBAL' && !isSuper(req)) return fail(res, 403, 'Only a Super Admin can change the settings for all brands.');
    if (scope !== 'GLOBAL' && !(await Brand.exists({ brandId: scope }))) return fail(res, 400, 'Unknown brand.');
    const interval = Number(b.intervalMinutes);
    const grace = Number(b.graceMinutes);
    if (!Number.isInteger(interval) || interval < 30 || interval > 480) return fail(res, 400, 'The interval must be a whole number of minutes between 30 and 480.');
    if (!Number.isInteger(grace) || grace < 1 || grace > 120) return fail(res, 400, 'The grace period must be a whole number of minutes between 1 and 120.');
    if (grace >= interval) return fail(res, 400, 'The grace period must be shorter than the interval.');
    // A brand row replaces the global row as a whole, so a new one starts from the rules that apply today (not from blank defaults)
    const cur = await getRules(scope === 'GLOBAL' ? null : scope);
    const actor = actorFromReq(req);
    const doc = await EmployeeSettings.findOneAndUpdate(
      { scope },
      {
        $set: { selfieEnabled: b.enabled !== false, selfieIntervalMinutes: interval, selfieGraceMinutes: grace, updatedBy: { name: actor.name, role: actor.type } },
        $setOnInsert: { officeStartTime: cur.officeStartTime, officeEndTime: cur.officeEndTime, graceMinutes: cur.graceMinutes, halfDayMinutes: cur.halfDayMinutes, weeklyOffs: cur.weeklyOffs },
      },
      { upsert: true, returnDocument: 'after' }
    );
    await logActivity({ action: 'selfie_settings_updated', actor, brandId: scope === 'GLOBAL' ? '' : scope, entity: 'EmployeeSettings', entityId: doc._id, details: { enabled: b.enabled !== false, interval, grace } });
    return res.json({ success: true, scope, enabled: doc.selfieEnabled, intervalMinutes: doc.selfieIntervalMinutes, graceMinutes: doc.selfieGraceMinutes });
  } catch (err) {
    return handle(res, err);
  }
};

export { istDateString };

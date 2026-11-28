import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import EmployeeTask from '../models/EmployeeTask.model.js';
import EmployeeTaskSubmission from '../models/EmployeeTaskSubmission.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import EmployeeDepartment from '../models/EmployeeDepartment.model.js';
import EmployeeNotification from '../models/EmployeeNotification.model.js';
import { parseTaskDate } from '../utils/taskDates.js';
import { cancelPendingOnCheckout } from '../services/employeeSelfieService.js';
import Brand from '../models/Brand.model.js';
import Holiday from '../models/Holiday.model.js';
import Admin from '../models/Admin.model.js';
import { adminCoversBrand } from '../utils/adminAccess.js';
import { generateToken } from '../utils/generateToken.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { EMPLOYEE_BLOCKED_STATUSES } from '../middleware/employeeAuth.js';
import { generateOtp, getMockOtp } from '../utils/generateOtp.js';
import { sendOtpSMS } from '../services/smsIndiaHubService.js';
import {
  istDateString,
  istMidnight,
  isValidDateString,
  eachDate,
  buildMonthlySummary,
  closeSessions,
  generateEmployeeCode,
  generateLeaveCode,
  getRules,
  logActivity,
  notifyEmployee,
  recordLogin,
  sanitizeEmployee,
  workedMinutes,
  escapeRegex,
} from '../services/employeeCore.js';

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const serverError = (res, err) => {
  console.error('[EmployeePortal]', err);
  return fail(res, 500, 'Something went wrong. Please try again.');
};
const clientIp = (req) => req.ip || req.socket?.remoteAddress || '';
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizePhone = (v) => String(v || '').replace(/\D/g, '').slice(-10);
const ID_PROOF_TYPES = ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Voter ID', 'Passport'];
const safeUrl = (v) => {
  const s = str(v, 600);
  return /^(https?:\/\/|\/uploads\/)/i.test(s) ? s : '';
};

// ── optional registration extras: more documents + one emergency contact ──
const MAX_EXTRA_DOCS = 5;
const DOC_LABELS = ['Address proof', 'Educational certificate', 'Experience letter', 'Bank passbook / cancelled cheque', 'Passport-size photograph', 'Other'];

const parseAdditionalDocuments = (raw) => {
  if (raw === undefined || raw === null || raw === '') return { value: [] };
  if (!Array.isArray(raw)) return { error: 'Additional documents are not valid.' };
  if (raw.length > MAX_EXTRA_DOCS) return { error: `You can attach at most ${MAX_EXTRA_DOCS} additional documents.` };
  const value = [];
  for (const d of raw) {
    const url = safeUrl(d?.url);
    if (!url) return { error: 'One of the additional documents did not upload properly. Remove it and upload it again.' };
    const label = DOC_LABELS.includes(d?.label) ? d.label : 'Other';
    value.push({ label, name: str(d?.name, 150) || 'Document', url, uploadedAt: new Date() });
  }
  return { value };
};

// One optional contact. If any detail is given the name and a valid number are required.
const parseEmergencyContact = (raw, ownPhone) => {
  const empty = { name: '', relationship: '', phone: '' };
  if (!raw || typeof raw !== 'object') return { value: empty };
  const name = str(raw.name, 80);
  const relationship = str(raw.relationship, 40);
  const phone = normalizePhone(raw.phone);
  if (!name && !relationship && !phone) return { value: empty };
  if (name.length < 2) return { error: "Enter the emergency contact's name." };
  if (phone.length !== 10) return { error: "Enter a valid 10-digit mobile number for the emergency contact." };
  if (phone === ownPhone) return { error: "The emergency contact's number must be different from your own." };
  return { value: { name, relationship, phone } };
};

// ── failed-login throttling (per account identifier) ──
const failures = new Map();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const lockedFor = (key) => {
  const f = failures.get(key);
  if (!f) return 0;
  if (f.until && f.until > Date.now()) return f.until - Date.now();
  if (f.until && f.until <= Date.now()) failures.delete(key);
  return 0;
};
const noteFailure = (key) => {
  const f = failures.get(key) || { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILS) {
    f.until = Date.now() + LOCK_MS;
    f.count = 0;
  }
  failures.set(key, f);
};

// ── forgot password: a 6-digit code sent by SMS to the employee's registered mobile number ──
const RESET_CODE_MS = 10 * 60 * 1000; // a code works for 10 minutes
const RESEND_AFTER_MS = 60 * 1000; // a new code at most once a minute
const MAX_SENDS_PER_HOUR = 5;
const MAX_CODE_ATTEMPTS = 5; // wrong codes before the code stops working
// The same answer whether or not the account exists, so nobody can find out which numbers or emails are registered.
const RESET_SENT = 'If this email or mobile number belongs to an employee account, a 6-digit code has been sent by SMS to its registered mobile number. It is valid for 10 minutes.';
const RESET_BAD_CODE = 'This code is not valid or has expired. Please request a new code.';
const resetHash = (empId, code) => crypto.createHash('sha256').update(`${empId}:${String(code).trim()}`).digest('hex');
const sameHash = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const findByIdentifier = (identifier, extra = '') => {
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };
  if (!isEmail && query.phone.length !== 10) return null;
  return Employee.findOne(query).select(`+passwordReset ${extra}`.trim());
};

const canResetPassword = (emp) => emp && (emp.registrationStatus || 'Approved') === 'Approved'
  && !EMPLOYEE_BLOCKED_STATUSES.includes(emp.employmentStatus) && normalizePhone(emp.phone).length === 10;

/** POST /employee-portal/forgot-password: sends the code (if the account exists and may sign in). Always the same answer. */
export const forgotPasswordSendCode = async (req, res) => {
  try {
    const identifier = str(req.body?.identifier || req.body?.email || req.body?.mobile, 150);
    if (!identifier) return fail(res, 400, 'Enter your email or mobile number.');
    const emp = await findByIdentifier(identifier);
    const answer = () => res.json({ success: true, message: RESET_SENT, resendAfterSeconds: RESEND_AFTER_MS / 1000 });
    if (!canResetPassword(emp)) return answer();

    const now = Date.now();
    const pr = emp.passwordReset || {};
    if (pr.sentAt && now - new Date(pr.sentAt).getTime() < RESEND_AFTER_MS) return answer(); // the code sent a moment ago still works
    const newWindow = !pr.windowStart || now - new Date(pr.windowStart).getTime() > 60 * 60 * 1000;
    const sends = newWindow ? 0 : pr.sends || 0;
    if (sends >= MAX_SENDS_PER_HOUR) return answer();

    const { otp } = generateOtp();
    emp.passwordReset = {
      codeHash: resetHash(emp._id, otp), expiresAt: new Date(now + RESET_CODE_MS), attempts: 0,
      sentAt: new Date(now), sends: sends + 1, windowStart: newWindow ? new Date(now) : pr.windowStart,
    };
    await emp.save();
    const sms = await sendOtpSMS({ phone: emp.phone, otp, role: 'employee' }).catch((e) => ({ success: false, message: e.message }));
    if (!sms?.success) console.warn('[EmployeePortal] password reset SMS not sent:', sms?.message);
    await logActivity({ action: 'password_reset_requested', actor: { name: emp.fullName, role: 'employee' }, employee: emp, ip: clientIp(req) });
    return answer();
  } catch (err) {
    return serverError(res, err);
  }
};

/** POST /employee-portal/reset-password: checks the code and sets the new password. All sessions are signed out. */
export const resetPasswordWithCode = async (req, res) => {
  try {
    const identifier = str(req.body?.identifier || req.body?.email || req.body?.mobile, 150);
    const code = str(String(req.body?.code ?? req.body?.otp ?? ''), 10);
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!identifier || !/^\d{6}$/.test(code)) return fail(res, 400, 'Enter the 6-digit code from the SMS.');
    if (!PASSWORD_RULE.test(newPassword)) return fail(res, 400, 'New password must be at least 8 characters and include a letter and a number.');

    const emp = await findByIdentifier(identifier, '+password');
    const pr = emp?.passwordReset;
    if (!canResetPassword(emp) || !pr?.codeHash || !pr.expiresAt || new Date(pr.expiresAt).getTime() < Date.now()) return fail(res, 400, RESET_BAD_CODE, { code: 'CODE_INVALID' });
    if ((pr.attempts || 0) >= MAX_CODE_ATTEMPTS) {
      emp.passwordReset = { ...pr.toObject(), codeHash: '', expiresAt: null };
      await emp.save();
      return fail(res, 400, 'Too many wrong codes. Please request a new code.', { code: 'CODE_INVALID' });
    }
    const mock = getMockOtp(); // development only: the fixed test code, never set in production
    const right = sameHash(resetHash(emp._id, code), pr.codeHash) || Boolean(mock && code === mock);
    if (!right) {
      const attempts = (pr.attempts || 0) + 1;
      emp.passwordReset = { ...pr.toObject(), attempts };
      await emp.save();
      const left = MAX_CODE_ATTEMPTS - attempts;
      return fail(res, 400, left > 0 ? `The code is not correct. ${left} attempt(s) left.` : 'Too many wrong codes. Please request a new code.', { code: left > 0 ? 'CODE_WRONG' : 'CODE_INVALID' });
    }

    emp.password = await bcrypt.hash(newPassword, 10);
    emp.tokenVersion = (emp.tokenVersion || 0) + 1; // every device is signed out
    emp.passwordReset = undefined;
    await emp.save();
    failures.delete(identifier.toLowerCase());
    await logActivity({ action: 'password_reset_by_code', actor: { name: emp.fullName, role: 'employee' }, employee: emp, ip: clientIp(req) });
    await notifyEmployee(emp, { type: 'password_changed', title: 'Password changed', message: 'Your password was reset using a code sent to your mobile number. If this was not you, contact your administrator at once.' }).catch(() => {});
    return res.json({ success: true, message: 'Your password has been changed. Please sign in with your new password.' });
  } catch (err) {
    return serverError(res, err);
  }
};

const signEmployeeToken = (emp, sessionId) =>
  generateToken({ id: String(emp._id), role: 'employee', tv: emp.tokenVersion || 0, sid: sessionId }, '12h');

// ═════════════════════════ PUBLIC ═════════════════════════

export const getPublicBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ status: 'Active' }).select('brandId name city').sort({ name: 1 }).lean();
    return res.json({ success: true, brands });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getPublicDepartments = async (req, res) => {
  try {
    const brandId = str(req.query.brandId, 60);
    const filter = { isActive: true, brandId: brandId ? { $in: [brandId, 'ALL'] } : 'ALL' };
    const departments = await EmployeeDepartment.find(filter).select('name designations brandId').sort({ name: 1 }).lean();
    return res.json({ success: true, departments });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getPublicAdmins = async (req, res) => {
  try {
    const brandId = str(req.query.brandId, 60);
    const filter = { role: 'admin', $or: [{ status: 'active' }, { status: { $exists: false } }] };
    const admins = await Admin.find(filter).select('name authorizedBrands brandAccess adminType').lean();
    const list = admins
      .filter((a) => !brandId || adminCoversBrand(a, brandId))
      .map((a) => ({ id: a._id, name: a.name }));
    return res.json({ success: true, admins: list });
  } catch (err) {
    return serverError(res, err);
  }
};

export const registerEmployee = async (req, res) => {
  try {
    const b = req.body || {};
    const fullName = str(b.fullName, 100);
    const email = str(b.email, 150).toLowerCase();
    const phone = normalizePhone(b.mobile || b.phone);
    const password = typeof b.password === 'string' ? b.password : '';
    const gender = ['Male', 'Female', 'Other'].includes(b.gender) ? b.gender : '';
    const address = str(b.address, 400);
    const city = str(b.city, 80);
    const department = str(b.department, 80);
    const designation = str(b.designation, 80);
    const brandId = str(b.brandId, 60);

    if (fullName.length < 2) return fail(res, 400, 'Full name is required.');
    if (!EMAIL_RULE.test(email)) return fail(res, 400, 'A valid email address is required.');
    if (phone.length !== 10) return fail(res, 400, 'Enter a valid 10-digit mobile number.');
    if (!PASSWORD_RULE.test(password)) return fail(res, 400, 'Password must be at least 8 characters and include a letter and a number.');
    if (!gender) return fail(res, 400, 'Please select your gender.');
    if (!address || !city) return fail(res, 400, 'Address and city are required.');
    if (!department || !designation) return fail(res, 400, 'Department and designation are required.');
    if (!brandId) return fail(res, 400, 'Please select a brand.');
    const idProofType = str(b.idProofType, 40);
    const idProofUrl = safeUrl(b.idProofUrl);
    if (!ID_PROOF_TYPES.includes(idProofType)) return fail(res, 400, 'Select the type of ID proof.');
    if (!idProofUrl) return fail(res, 400, 'Upload a copy of your ID proof (image or PDF).');
    const extra = parseAdditionalDocuments(b.additionalDocuments);
    if (extra.error) return fail(res, 400, extra.error);
    const emergency = parseEmergencyContact(b.emergencyContact, phone);
    if (emergency.error) return fail(res, 400, emergency.error);

    let dateOfBirth = null;
    if (b.dateOfBirth) {
      dateOfBirth = new Date(b.dateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) return fail(res, 400, 'Enter a valid date of birth.');
    } else return fail(res, 400, 'Date of birth is required.');

    let joiningDate = new Date();
    if (b.joiningDate) {
      joiningDate = new Date(b.joiningDate);
      if (Number.isNaN(joiningDate.getTime())) return fail(res, 400, 'Enter a valid joining date.');
    }

    const brand = await Brand.findOne({ brandId, status: 'Active' }).select('brandId name').lean();
    if (!brand) return fail(res, 400, 'The selected brand is not available.');

    // When the brand has configured departments, the department must be one of them.
    const configured = await EmployeeDepartment.find({ isActive: true, brandId: { $in: [brand.brandId, 'ALL'] } }).lean();
    if (configured.length) {
      const dep = configured.find((d) => d.name.toLowerCase() === department.toLowerCase());
      if (!dep) return fail(res, 400, 'Please choose a department from the list.');
      if (dep.designations?.length && !dep.designations.some((x) => x.toLowerCase() === designation.toLowerCase())) {
        return fail(res, 400, 'Please choose a designation from the list.');
      }
    }

    let assignedAdmin = { id: null, name: '' };
    if (b.assignedAdminId && mongoose.Types.ObjectId.isValid(b.assignedAdminId)) {
      const adm = await Admin.findById(b.assignedAdminId).select('name role authorizedBrands brandAccess adminType status').lean();
      const ok = adm && adm.role === 'admin' && adminCoversBrand(adm, brand.brandId);
      if (ok) assignedAdmin = { id: adm._id, name: adm.name };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const photo = safeUrl(b.profilePhoto);

    const existing = await Employee.findOne({ $or: [{ email }, { phone }] }).select('+password');
    if (existing) {
      const sameIdentity = existing.email === email;
      // A rejected applicant may re-apply: the same record goes back to Pending with the new details.
      if (sameIdentity && existing.registrationStatus === 'Rejected' && existing.registrationSource === 'self') {
        Object.assign(existing, {
          fullName, phone, gender, dateOfBirth, address, city, department, designation, joiningDate,
          brandId: brand.brandId, brandName: brand.name, avatar: photo || existing.avatar, assignedAdmin,
          password: passwordHash, registrationStatus: 'Pending', rejectionReason: '',
          idProof: { type: idProofType, documentUrl: idProofUrl },
          additionalDocuments: extra.value, emergencyContact: emergency.value,
        });
        await existing.save();
        await logActivity({ action: 'registration_resubmitted', actor: { type: 'employee', id: existing._id, name: fullName, email }, employee: existing, ip: clientIp(req) });
        return res.status(201).json({ success: true, message: 'Registration re-submitted. It is pending approval.', employeeId: existing.employeeId, status: 'Pending' });
      }
      return fail(res, 409, sameIdentity ? 'An account with this email already exists.' : 'An account with this mobile number already exists.');
    }

    const employeeId = await generateEmployeeCode();
    const emp = await Employee.create({
      employeeId, fullName, email, phone, gender, dateOfBirth, address, city, department, designation, joiningDate,
      brandId: brand.brandId, brandName: brand.name, storeName: '', avatar: photo, assignedAdmin,
      password: passwordHash, registrationStatus: 'Pending', registrationSource: 'self', employmentStatus: 'Inactive',
      idProof: { type: idProofType, documentUrl: idProofUrl },
      additionalDocuments: extra.value, emergencyContact: emergency.value,
    });
    await logActivity({ action: 'registration_submitted', actor: { type: 'employee', id: emp._id, name: fullName, email }, employee: emp, entity: 'Employee', entityId: emp._id, ip: clientIp(req) });

    return res.status(201).json({
      success: true,
      message: 'Registration submitted. You can log in once an administrator approves your account.',
      employeeId: emp.employeeId,
      status: 'Pending',
    });
  } catch (err) {
    if (err?.code === 11000) return fail(res, 409, 'An account with these details already exists.');
    return serverError(res, err);
  }
};

export const loginEmployee = async (req, res) => {
  try {
    const identifier = str(req.body?.identifier || req.body?.email || req.body?.mobile, 150);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!identifier || !password) return fail(res, 400, 'Email / mobile number and password are required.');

    const key = identifier.toLowerCase();
    const wait = lockedFor(key);
    if (wait) return fail(res, 429, `Too many failed attempts. Try again in ${Math.ceil(wait / 60000)} minute(s).`);

    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };
    const emp = await Employee.findOne(query).select('+password');

    const valid = emp && emp.password ? await bcrypt.compare(password, emp.password) : false;
    if (!valid) {
      noteFailure(key);
      return fail(res, 401, 'Invalid credentials.');
    }
    failures.delete(key);

    const regStatus = emp.registrationStatus || 'Approved';
    if (regStatus === 'Pending') return fail(res, 403, 'Your registration is pending approval by an administrator.', { code: 'PENDING' });
    if (regStatus === 'Rejected') {
      return fail(res, 403, `Your registration was rejected${emp.rejectionReason ? `: ${emp.rejectionReason}` : '.'}`, { code: 'REJECTED' });
    }
    if (EMPLOYEE_BLOCKED_STATUSES.includes(emp.employmentStatus)) {
      return fail(res, 403, 'Your account is deactivated. Please contact your administrator.', { code: 'INACTIVE' });
    }

    // Attendance is recorded by the server, after authentication has succeeded.
    const { attendance, sessionId } = await recordLogin(emp, { ip: clientIp(req), source: 'Web' });
    emp.lastLoginAt = new Date();
    await emp.save();
    await logActivity({
      action: 'login',
      actor: { type: 'employee', id: emp._id, name: emp.fullName, email: emp.email },
      employee: emp,
      entity: 'Attendance',
      entityId: attendance._id,
      details: { dateString: attendance.dateString, status: attendance.status, loginCount: attendance.loginCount },
      ip: clientIp(req),
    });

    return res.json({
      success: true,
      token: signEmployeeToken(emp, sessionId),
      employee: sanitizeEmployee(emp),
      attendance: shapeAttendance(attendance),
    });
  } catch (err) {
    return serverError(res, err);
  }
};

// ═════════════════════════ AUTHENTICATED ═════════════════════════

const shapeAttendance = (a) =>
  a && {
    _id: a._id,
    dateString: a.dateString,
    status: a.status,
    firstLogin: a.checkIn,
    lastLogout: a.checkOut,
    lastActivityAt: a.lastActivityAt,
    loginCount: a.loginCount || 0,
    isCheckedIn: (a.sessions || []).some((s) => !s.logoutAt),
    workedMinutes: workedMinutes(a.sessions || []),
    lateMinutes: a.lateMinutes || 0,
  };

export const logoutEmployee = async (req, res) => {
  try {
    const att = await closeSessions(req.employee, { sessionId: req.sessionId });
    await logActivity({ action: 'logout', actor: req.user, employee: req.employee, ip: clientIp(req) });
    return res.json({ success: true, attendance: shapeAttendance(att) });
  } catch (err) {
    return serverError(res, err);
  }
};

/** Explicit Check Out: closes every open session of the employee. */
export const checkOutEmployee = async (req, res) => {
  try {
    const att = await closeSessions(req.employee, { all: true });
    if (!att) return fail(res, 400, 'You are not checked in.');
    cancelPendingOnCheckout(req.employee).catch(() => {}); // no more selfie requests for the rest of the day
    await logActivity({ action: 'check_out', actor: req.user, employee: req.employee, entity: 'Attendance', entityId: att._id, ip: clientIp(req) });
    return res.json({ success: true, message: 'Checked out.', attendance: shapeAttendance(att) });
  } catch (err) {
    return serverError(res, err);
  }
};

/** Check In again after a check-out the same day (adds a new session; first login time is preserved). */
export const checkInEmployee = async (req, res) => {
  try {
    const today = await Attendance.findOne({ employee: req.employee._id, dateString: istDateString() });
    if (today?.sessions?.some((s) => !s.logoutAt)) return res.json({ success: true, message: 'Already checked in.', attendance: shapeAttendance(today) });
    const { attendance } = await recordLogin(req.employee, { ip: clientIp(req), source: 'Web' });
    await logActivity({ action: 'check_in', actor: req.user, employee: req.employee, entity: 'Attendance', entityId: attendance._id, ip: clientIp(req) });
    return res.json({ success: true, message: 'Checked in.', attendance: shapeAttendance(attendance) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getMe = async (req, res) => res.json({ success: true, employee: sanitizeEmployee(req.employee) });

export const updateMe = async (req, res) => {
  try {
    // Only personal, non-privileged fields. Role, brand, department, designation, status, ID are admin-managed.
    const b = req.body || {};
    const emp = req.employee;
    if (typeof b.address === 'string') emp.address = str(b.address, 400);
    if (typeof b.city === 'string') emp.city = str(b.city, 80);
    if (['Male', 'Female', 'Other'].includes(b.gender)) emp.gender = b.gender;
    if (b.profilePhoto !== undefined) emp.avatar = safeUrl(b.profilePhoto);
    if (b.phone !== undefined) {
      const phone = normalizePhone(b.phone);
      if (phone.length !== 10) return fail(res, 400, 'Enter a valid 10-digit mobile number.');
      if (phone !== emp.phone && (await Employee.exists({ phone, _id: { $ne: emp._id } }))) return fail(res, 409, 'This mobile number is already in use.');
      emp.phone = phone;
    }
    await emp.save();
    await logActivity({ action: 'profile_updated', actor: req.user, employee: emp, ip: clientIp(req) });
    return res.json({ success: true, employee: sanitizeEmployee(emp) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword = '', newPassword = '' } = req.body || {};
    if (!PASSWORD_RULE.test(newPassword)) return fail(res, 400, 'New password must be at least 8 characters and include a letter and a number.');
    const emp = await Employee.findById(req.employee._id).select('+password');
    if (!(await bcrypt.compare(currentPassword, emp.password || ''))) return fail(res, 400, 'Current password is incorrect.');
    emp.password = await bcrypt.hash(newPassword, 10);
    emp.tokenVersion = (emp.tokenVersion || 0) + 1;
    await emp.save();
    await logActivity({ action: 'password_changed', actor: req.user, employee: emp, ip: clientIp(req) });
    return res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    return serverError(res, err);
  }
};

// ───────────── dashboard ─────────────

const OPEN_TASK = ['To Do', 'Assigned', 'Pending', 'Reopened'];
const isOverdueTask = (t, now = new Date()) => !['Completed', 'Rejected'].includes(t.status) && t.dueDate && new Date(t.dueDate) < now;

export const getDashboard = async (req, res) => {
  try {
    const emp = req.employee;
    const todayStr = istDateString();
    const [att, tasks, notifications, unread, pendingLeaves, upcomingHolidays] = await Promise.all([
      Attendance.findOne({ employee: emp._id, dateString: todayStr }),
      EmployeeTask.find({ 'assignedEmployees.employee': emp._id }).select('status dueDate').lean(),
      EmployeeNotification.find({ employee: emp._id }).sort({ createdAt: -1 }).limit(6).lean(),
      EmployeeNotification.countDocuments({ employee: emp._id, isRead: false }),
      LeaveRequest.countDocuments({ employee: emp._id, status: 'Pending' }),
      holidaysFor(emp, todayStr, `${Number(todayStr.slice(0, 4)) + 1}-12-31`).then((l) => l.slice(0, 3)),
    ]);
    const now = new Date();
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => OPEN_TASK.includes(t.status)).length,
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      underReview: tasks.filter((t) => t.status === 'Submitted for Review').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      overdue: tasks.filter((t) => isOverdueTask(t, now)).length,
    };
    return res.json({
      success: true,
      employee: sanitizeEmployee(emp),
      today: shapeAttendance(att) || { dateString: todayStr, status: 'Not marked', firstLogin: null, lastLogout: null, isCheckedIn: false, workedMinutes: 0, loginCount: 0 },
      rules: await getRules(emp.brandId),
      tasks: stats,
      pendingLeaves,
      unreadNotifications: unread,
      notifications,
      upcomingHolidays: upcomingHolidays.map((h) => ({ _id: h._id, name: h.name, dateString: h.dateString, isOptional: Boolean(h.isOptional) })),
    });
  } catch (err) {
    return serverError(res, err);
  }
};

// ───────────── holidays ─────────────

const holidaysFor = (emp, from, to) =>
  Holiday.find({ brandId: { $in: [emp.brandId, 'ALL'] }, dateString: { $gte: from, $lte: to } })
    .select('name dateString isOptional description brandId')
    .sort({ dateString: 1 })
    .lean();

/** Holidays set by an Admin / Super Admin for this employee's brand (or for every brand). */
export const listMyHolidays = async (req, res) => {
  try {
    const year = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : istDateString().slice(0, 4);
    const [holidays, rules] = await Promise.all([holidaysFor(req.employee, `${year}-01-01`, `${year}-12-31`), getRules(req.employee.brandId)]);
    return res.json({
      success: true,
      year,
      today: istDateString(),
      weeklyOffs: rules.weeklyOffs || [],
      holidays: holidays.map((h) => ({ _id: h._id, name: h.name, dateString: h.dateString, isOptional: Boolean(h.isOptional), description: h.description || '', scope: h.brandId === 'ALL' ? 'All brands' : 'Your brand' })),
    });
  } catch (err) {
    return serverError(res, err);
  }
};

// ───────────── attendance ─────────────

export const getMyAttendance = async (req, res) => {
  try {
    const summary = await buildMonthlySummary(req.employee, str(req.query.month, 7));
    return res.json({ success: true, ...summary });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getMyAttendanceHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 31));
    const filter = { employee: req.employee._id };
    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .select('dateString status checkIn checkOut totalDurationMinutes lateMinutes loginCount sessions notes')
      .sort({ dateString: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return res.json({ success: true, total, page, pages: Math.ceil(total / limit), records });
  } catch (err) {
    return serverError(res, err);
  }
};

// ───────────── tasks ─────────────

const mineFilter = (emp) => ({ 'assignedEmployees.employee': emp._id });
const withOverdue = (t) => ({ ...t, isOverdue: isOverdueTask(t) });

const loadMyTask = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    fail(res, 404, 'Task not found.');
    return null;
  }
  // Brand and assignment are both enforced: another employee's task is simply "not found".
  const task = await EmployeeTask.findOne({ _id: req.params.id, ...mineFilter(req.employee), brandId: req.employee.brandId });
  if (!task) {
    fail(res, 404, 'Task not found.');
    return null;
  }
  return task;
};

export const listMyTasks = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = { ...mineFilter(req.employee) };
    const status = str(req.query.status, 40);
    if (status === 'Overdue') {
      filter.status = { $nin: ['Completed', 'Rejected'] };
      filter.dueDate = { $lt: new Date() };
    } else if (status === 'Pending') filter.status = { $in: OPEN_TASK };
    else if (status === 'Under Review') filter.status = 'Submitted for Review';
    else if (status && status !== 'ALL') filter.status = status;
    if (req.query.priority && req.query.priority !== 'ALL') filter.priority = str(req.query.priority, 20);
    if (req.query.search) filter.title = new RegExp(escapeRegex(str(req.query.search, 80)), 'i');
    const total = await EmployeeTask.countDocuments(filter);
    const tasks = await EmployeeTask.find(filter)
      .select('-comments -extensionRequests')
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return res.json({ success: true, total, page, pages: Math.ceil(total / limit), tasks: tasks.map(withOverdue) });
  } catch (err) {
    return serverError(res, err);
  }
};

export const getMyTask = async (req, res) => {
  try {
    const task = await loadMyTask(req, res);
    if (!task) return undefined;
    const submissions = await EmployeeTaskSubmission.find({ task: task._id, employee: req.employee._id }).sort({ submittedAt: -1 }).lean();
    const obj = task.toObject();
    // Other assignees' contact details are not needed by an employee.
    obj.assignedEmployees = obj.assignedEmployees.map((a) => ({ name: a.name, designation: a.designation }));
    return res.json({ success: true, task: withOverdue(obj), submissions });
  } catch (err) {
    return serverError(res, err);
  }
};

export const startMyTask = async (req, res) => {
  try {
    const task = await loadMyTask(req, res);
    if (!task) return undefined;
    if (!['To Do', 'Assigned', 'Pending', 'Reopened'].includes(task.status)) return fail(res, 409, `A task that is "${task.status}" cannot be started.`);
    task.status = 'In Progress';
    if (!task.startedAt) task.startedAt = new Date();
    await task.save();
    await logActivity({ action: 'task_started', actor: req.user, employee: req.employee, entity: 'EmployeeTask', entityId: task._id });
    return res.json({ success: true, task: task.toObject() });
  } catch (err) {
    return serverError(res, err);
  }
};

export const updateMyTaskProgress = async (req, res) => {
  try {
    const task = await loadMyTask(req, res);
    if (!task) return undefined;
    if (task.status !== 'In Progress') return fail(res, 409, 'Start the task before updating its progress.');
    const pct = Number(req.body?.progressPercent);
    // 100% is reached only through submission + admin approval.
    if (!Number.isFinite(pct) || pct < 0 || pct > 99) return fail(res, 400, 'Progress must be between 0 and 99. Submit the task for review when it is finished.');
    task.progressPercent = Math.round(pct);
    await task.save();
    return res.json({ success: true, task: task.toObject() });
  } catch (err) {
    return serverError(res, err);
  }
};

export const commentOnMyTask = async (req, res) => {
  try {
    const task = await loadMyTask(req, res);
    if (!task) return undefined;
    const text = str(req.body?.text, 2000);
    if (!text) return fail(res, 400, 'Comment cannot be empty.');
    task.comments.push({ id: crypto.randomUUID(), authorName: req.employee.fullName, authorRole: 'employee', text, createdAt: new Date() });
    await task.save();
    return res.json({ success: true, comments: task.comments });
  } catch (err) {
    return serverError(res, err);
  }
};

export const submitMyTask = async (req, res) => {
  try {
    const task = await loadMyTask(req, res);
    if (!task) return undefined;
    if (task.status !== 'In Progress') return fail(res, 409, 'Only a task that is in progress can be submitted for review.');
    const notes = str(req.body?.notes, 3000);
    const attachments = (Array.isArray(req.body?.attachments) ? req.body.attachments : [])
      .slice(0, 10)
      .map((a) => ({ name: str(a?.name, 150), url: safeUrl(a?.url) }))
      .filter((a) => a.url);
    await EmployeeTaskSubmission.create({
      task: task._id, taskCode: task.taskId, employee: req.employee._id, employeeName: req.employee.fullName,
      brandId: task.brandId, notes, attachments,
    });
    task.status = 'Submitted for Review';
    task.submittedAt = new Date();
    if (notes) task.completionNotes = notes;
    await task.save();
    await logActivity({ action: 'task_submitted', actor: req.user, employee: req.employee, entity: 'EmployeeTask', entityId: task._id, details: { taskId: task.taskId } });
    return res.json({ success: true, message: 'Submitted for review.', task: task.toObject() });
  } catch (err) {
    return serverError(res, err);
  }
};

export const requestTaskExtension = async (req, res) => {
  try {
    const task = await loadMyTask(req, res);
    if (!task) return undefined;
    if (['Completed', 'Rejected'].includes(task.status)) return fail(res, 409, 'This task is closed.');
    const requestedDueDate = parseTaskDate(req.body?.requestedDueDate, { endOfDay: true });
    const reason = str(req.body?.reason, 1000);
    if (Number.isNaN(requestedDueDate.getTime()) || requestedDueDate <= new Date(task.dueDate)) return fail(res, 400, 'Choose a new deadline later than the current one.');
    if (!reason) return fail(res, 400, 'Please give a reason.');
    if (task.extensionRequests.some((r) => r.status === 'Pending')) return fail(res, 409, 'An extension request is already pending.');
    task.extensionRequests.push({ requestedBy: req.employee._id, requestedByName: req.employee.fullName, requestedDueDate, reason });
    await task.save();
    await logActivity({ action: 'extension_requested', actor: req.user, employee: req.employee, entity: 'EmployeeTask', entityId: task._id });
    return res.json({ success: true, message: 'Extension requested.', task: task.toObject() });
  } catch (err) {
    return serverError(res, err);
  }
};

// ── task document upload (authenticated, restricted types, size-limited) ──
const DOC_EXT = /\.(jpe?g|png|webp|gif|pdf|docx?|xlsx?|csv|txt|pptx?)$/i;
export const uploadDocument = async (req, res) => {
  try {
    const f = req.file;
    if (!f) return fail(res, 400, 'No file uploaded.');
    if (!DOC_EXT.test(f.originalname || '')) {
      fs.unlink(f.path, () => {});
      return fail(res, 400, 'File type not allowed.');
    }
    const cloudOn = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here';
    if (cloudOn) {
      try {
        const up = await uploadToCloudinary(f.path, 'employee_docs');
        fs.unlink(f.path, () => {});
        return res.json({ success: true, url: up.secure_url, name: f.originalname });
      } catch (e) {
        console.warn('[EmployeeUpload] Cloudinary failed, keeping local file:', e.message);
      }
    }
    return res.json({ success: true, url: `/uploads/employee_docs/${path.basename(f.path)}`, name: f.originalname });
  } catch (err) {
    return serverError(res, err);
  }
};

// ───────────── leave ─────────────

export const listMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ employee: req.employee._id }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, leaves });
  } catch (err) {
    return serverError(res, err);
  }
};

export const applyMyLeave = async (req, res) => {
  try {
    const b = req.body || {};
    const startStr = str(b.startDate, 10);
    const endStr = str(b.endDate || b.startDate, 10);
    const reason = str(b.reason, 1000);
    const leaveType = [
      'Casual Leave', 'Sick Leave', 'Earned Leave', 'Unpaid Leave', 'Maternity/Paternity', 'Compensatory Off',
    ].includes(b.leaveType) ? b.leaveType : '';
    if (!leaveType) return fail(res, 400, 'Select a leave type.');
    if (!isValidDateString(startStr) || !isValidDateString(endStr)) return fail(res, 400, 'Select valid start and end dates.');
    if (endStr < startStr) return fail(res, 400, 'End date cannot be before start date.');
    if (!reason) return fail(res, 400, 'Please give a reason.');
    const isHalfDay = Boolean(b.isHalfDay);
    if (isHalfDay && startStr !== endStr) return fail(res, 400, 'A half-day leave must be a single day.');
    if (startStr < istDateString(new Date(Date.now() - 7 * 86400000))) return fail(res, 400, 'Leave cannot start more than 7 days in the past.');
    if (eachDate(startStr, endStr, 200).length > 90) return fail(res, 400, 'A single leave request cannot exceed 90 days.');

    const start = istMidnight(startStr);
    const end = istMidnight(endStr);
    // No overlap with another pending/approved request.
    const overlap = await LeaveRequest.findOne({
      employee: req.employee._id,
      status: { $in: ['Pending', 'Approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).lean();
    if (overlap) return fail(res, 409, `You already have a ${overlap.status.toLowerCase()} leave (${overlap.leaveId}) overlapping these dates.`);

    const leave = await LeaveRequest.create({
      leaveId: await generateLeaveCode(),
      employee: req.employee._id,
      employeeId: req.employee.employeeId,
      employeeName: req.employee.fullName,
      brandId: req.employee.brandId,
      department: req.employee.department,
      leaveType,
      startDate: start,
      endDate: end,
      isHalfDay,
      halfDayType: isHalfDay ? (['First Half', 'Second Half'].includes(b.halfDayType) ? b.halfDayType : 'First Half') : 'None',
      totalDays: isHalfDay ? 0.5 : eachDate(startStr, endStr, 200).length,
      reason,
      status: 'Pending',
    });
    await logActivity({ action: 'leave_applied', actor: req.user, employee: req.employee, entity: 'LeaveRequest', entityId: leave._id, details: { leaveId: leave.leaveId, startStr, endStr } });
    return res.status(201).json({ success: true, message: 'Leave request submitted.', leave });
  } catch (err) {
    return serverError(res, err);
  }
};

export const cancelMyLeave = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Leave request not found.');
    const leave = await LeaveRequest.findOne({ _id: req.params.id, employee: req.employee._id });
    if (!leave) return fail(res, 404, 'Leave request not found.');
    if (leave.status !== 'Pending') return fail(res, 409, 'Only a pending request can be cancelled.');
    leave.status = 'Cancelled';
    await leave.save();
    await logActivity({ action: 'leave_cancelled', actor: req.user, employee: req.employee, entity: 'LeaveRequest', entityId: leave._id });
    return res.json({ success: true, leave });
  } catch (err) {
    return serverError(res, err);
  }
};

// ───────────── notifications ─────────────

export const listMyNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const filter = { employee: req.employee._id };
    const [total, unread, notifications] = await Promise.all([
      EmployeeNotification.countDocuments(filter),
      EmployeeNotification.countDocuments({ ...filter, isRead: false }),
      EmployeeNotification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ success: true, total, unread, page, pages: Math.ceil(total / limit), notifications });
  } catch (err) {
    return serverError(res, err);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Notification not found.');
    const n = await EmployeeNotification.findOneAndUpdate(
      { _id: req.params.id, employee: req.employee._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!n) return fail(res, 404, 'Notification not found.');
    return res.json({ success: true, notification: n });
  } catch (err) {
    return serverError(res, err);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await EmployeeNotification.updateMany({ employee: req.employee._id, isRead: false }, { isRead: true, readAt: new Date() });
    return res.json({ success: true });
  } catch (err) {
    return serverError(res, err);
  }
};

export { notifyEmployee };

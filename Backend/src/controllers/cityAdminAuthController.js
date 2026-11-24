import Admin from '../models/Admin.model.js';
import Brand from '../models/Brand.model.js';
import { isAdminAccountActive } from '../middleware/authMiddleware.js';
import { generateToken } from '../utils/generateToken.js';
import { ADMIN_AUTH_COOKIE, ADMIN_REMEMBER_TTL, ADMIN_SESSION_TTL, setAdminAuthCookie } from '../utils/adminAuthCookie.js';
import { passwordOk } from '../services/cityAdminService.js';

/**
 * City Admin login: a separate endpoint from the Admin / Super Admin logins, for City Admin accounts only.
 * The brand and city of the session come from the account in the database. The token has the normal admin shape,
 * so every protected API (and its brand scope) treats it like any other brand-restricted admin.
 * Super Admin authentication is not touched.
 */
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const BAD = 'Invalid login or password';

export const cityAdminLogin = async (req, res, next) => {
  try {
    const { login, email, password, rememberMe = false } = req.body || {};
    const id = String(login || email || '').trim().toLowerCase();
    if (!id || typeof password !== 'string' || !password) return fail(res, 400, 'Enter your email or username and your password.');
    const admin = await Admin.findOne({ adminType: 'CITY_ADMIN', $or: [{ email: id }, { username: id }] });
    // the same answer for "no such account" and "wrong password": nothing is revealed about which accounts exist
    if (!admin || !(await admin.matchPassword(password))) return fail(res, 401, BAD);
    if (!isAdminAccountActive(admin)) return fail(res, 403, 'This City Admin account is inactive. Please contact the Super Admin.');
    const brand = await Brand.findOne({ brandId: admin.brandId }).select('brandId name code city status').lean();
    if (!brand) return fail(res, 403, 'The brand of this account no longer exists. Please contact the Super Admin.');
    if (brand.status === 'Inactive') return fail(res, 403, 'This brand is currently inactive. Please contact the Super Admin.');

    const remember = Boolean(rememberMe);
    const token = generateToken({ id: admin._id, email: admin.email, role: 'admin', tokenVersion: admin.tokenVersion || 0, rememberMe: remember }, remember ? ADMIN_REMEMBER_TTL : ADMIN_SESSION_TTL);
    setAdminAuthCookie(res, token, remember, ADMIN_AUTH_COOKIE);
    admin.lastLoginAt = new Date();
    await admin.save();
    return res.json({
      success: true, message: 'Login successful', token, rememberMe: remember,
      mustChangePassword: Boolean(admin.mustChangePassword),
      admin: { id: admin._id, _id: admin._id, name: admin.name, email: admin.email, mobile: admin.mobile || '', role: 'admin', adminType: 'CITY_ADMIN', permissions: admin.permissions || [] },
      brand: { brandId: brand.brandId, name: brand.name, code: brand.code, city: brand.city || admin.city || '' },
    });
  } catch (err) {
    return next(err);
  }
};

/** Used for the first login with a temporary password (and any time later): current password required */
export const cityAdminChangePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const admin = await Admin.findOne({ _id: req.user.id, adminType: 'CITY_ADMIN' });
    if (!admin) return fail(res, 403, 'Only a City Admin can use this.');
    if (typeof currentPassword !== 'string' || !(await admin.matchPassword(currentPassword))) return fail(res, 401, 'Your current password is not correct.');
    if (!passwordOk(newPassword)) return fail(res, 400, 'The new password must be at least 8 characters and contain a letter and a number.');
    if (newPassword !== confirmPassword) return fail(res, 400, 'The new password and its confirmation do not match.');
    if (newPassword === currentPassword) return fail(res, 400, 'Choose a password different from the current one.');
    admin.password = newPassword;
    admin.mustChangePassword = undefined;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1; // other sessions end; a fresh token is returned for this one
    await admin.save();
    const token = generateToken({ id: admin._id, email: admin.email, role: 'admin', tokenVersion: admin.tokenVersion }, ADMIN_SESSION_TTL);
    setAdminAuthCookie(res, token, false, ADMIN_AUTH_COOKIE);
    return res.json({ success: true, message: 'Password changed.', token });
  } catch (err) {
    return next(err);
  }
};

/** Who am I (brand, city, permissions) for the City Admin screens */
export const cityAdminMe = async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ _id: req.user.id, adminType: 'CITY_ADMIN' }).select('-password').lean();
    if (!admin) return fail(res, 403, 'Only a City Admin can use this.');
    const brand = await Brand.findOne({ brandId: admin.brandId }).select('brandId name code city status').lean();
    return res.json({ success: true, admin: { id: String(admin._id), name: admin.name, email: admin.email, permissions: admin.permissions || [], mustChangePassword: Boolean(admin.mustChangePassword) }, brand });
  } catch (err) {
    return next(err);
  }
};

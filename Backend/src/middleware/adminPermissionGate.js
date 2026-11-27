/**
 * Per-brand permissions of an ordinary Admin (accounts with permissionMode 'PER_BRAND'). Called by protect() on every
 * request, always from the database, so a change or a revoked brand applies to the very next click.
 *
 * It decides three things: the ONE brand this request works in, whether the admin has that brand, and whether the admin may
 * do this there. Afterwards the request's brand list is narrowed to that single brand, so every existing brand check
 * (scope resolution and record ownership) treats the admin's other brands as foreign for this request.
 */
import Admin from '../models/Admin.model.js';
import AdminBrandAccess from '../models/AdminBrandAccess.model.js';
import { assignedBrandIds } from '../utils/adminAccess.js';
import { MODULE_MAP, cleanMatrix, can } from '../utils/permissionCatalog.js';
import { SELF, needFor } from '../utils/permissionRules.js';
import { findBrandByParam } from './scopeMiddleware.js';

export const usesBrandPermissions = (admin) => admin?.permissionMode === 'PER_BRAND' && admin.role === 'admin' && admin.adminType !== 'CITY_ADMIN';

const refuse = (code, message, extra = {}) => ({ error: { success: false, code, message, ...extra } });
const describe = (need) => {
  const [mod, action] = need.split('.');
  const m = MODULE_MAP.get(mod);
  return `${m?.labels?.[action] || action} in ${m?.label || mod}`;
};

/** The single brand a request names (header, query or body), checked against the admin's own list. */
const selectedBrand = async (req, assigned) => {
  const supplied = [req.query?.brandId, req.headers['x-brand-id'], req.query?.region, req.headers['x-region-id'], req.body?.brandId]
    .filter((v) => v !== undefined && v !== null && v !== '');
  if (supplied.some((v) => typeof v !== 'string')) return refuse('BRAND_FORBIDDEN', 'Name one brand only.');
  const values = supplied.map((v) => v.trim()).filter(Boolean);
  const named = [...new Set(values.filter((v) => v !== '*' && v.toUpperCase() !== 'ALL'))];
  if (!named.length) {
    if (values.length) return refuse('BRAND_REQUIRED', 'Access denied: You are not authorized to view consolidated All-Region data.');
    if (assigned.length === 1) return { brandId: assigned[0] };
    return refuse('BRAND_REQUIRED', 'Select a brand to continue.');
  }
  const ids = new Set();
  for (const value of named) {
    const brand = assigned.includes(value) ? { brandId: value } : await findBrandByParam(value);
    if (!brand || !assigned.includes(brand.brandId)) return refuse('BRAND_FORBIDDEN', 'Forbidden: You are not authorized to access records for this brand.');
    ids.add(brand.brandId);
  }
  if (ids.size !== 1) return refuse('BRAND_FORBIDDEN', 'One request can work in one brand only.');
  return { brandId: [...ids][0] };
};

export const loadBrandPermissions = async (adminId, brandId) => {
  const record = await AdminBrandAccess.findOne({ adminId, brandId, isActive: true }).lean();
  return record ? { configured: true, roleProfile: record.roleProfile, permissions: cleanMatrix(record.permissions) } : { configured: false, roleProfile: '', permissions: {} };
};

/** @returns {{error}|{self:true}|{brandId, permissions}} */
export const checkAdminRequest = async (req, admin) => {
  const need = needFor(req);
  if (need === SELF) return { self: true };
  if (!need) return refuse('PERMISSION_DENIED', 'Your account does not have permission for this action.');

  const selected = await selectedBrand(req, assignedBrandIds(admin));
  if (selected.error) return selected;

  const { configured, permissions } = await loadBrandPermissions(admin._id, selected.brandId);
  if (!configured) return refuse('PERMISSION_DENIED', 'Your access for this brand has not been set up yet. Please ask your Super Admin.', { reason: 'NOT_CONFIGURED' });

  const all = Array.isArray(need) ? null : need.all;
  const allowed = all ? all.every((n) => can(permissions, n)) : need.some((n) => can(permissions, n));
  if (!allowed) {
    const wanted = all ? all.find((n) => !can(permissions, n)) : need[0];
    const [module, action] = wanted.split('.');
    return refuse('PERMISSION_DENIED', `You do not have permission to ${describe(wanted)} for this brand.`, { module, action });
  }
  return { brandId: selected.brandId, permissions };
};

/** Pins the request to the checked brand for everything that runs afterwards. */
export const pinToBrand = (req, effective, access) => {
  effective.authorizedBrands = [access.brandId];
  req.headers['x-brand-id'] = access.brandId;
  req.headers['x-region-id'] = access.brandId;
  req.adminAccess = access;
};

/**
 * For public routes that show more to a signed-in admin (products). An admin token only counts while the account is valid;
 * an admin with per-brand permissions also needs the permission. Otherwise: 403 for an admin-panel request, and the plain
 * customer view for anything else.
 */
export const staffViewGate = async (req, res, next) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'super_admin') return next();
    const admin = await Admin.findById(req.user.id).select('role status tokenVersion authorizedBrands brandAccess adminType permissionMode').lean().catch(() => null);
    const valid = admin && (!admin.status || admin.status === 'active')
      && String(admin.role).replace(/-/g, '_') === role && Number(req.user.tokenVersion || 0) === Number(admin.tokenVersion || 0);
    if (!valid) { req.user = undefined; return next(); }
    if (role === 'super_admin') return next();

    req.user = { ...req.user, authorizedBrands: Array.isArray(admin.authorizedBrands) ? admin.authorizedBrands : undefined, brandAccess: admin.brandAccess, adminType: admin.adminType };
    if (!usesBrandPermissions(admin)) return next();

    const access = await checkAdminRequest(req, admin);
    if (access.error) {
      const panel = req.query.admin === 'true' || req.query.all === 'true' || req.headers['x-admin-request'] === 'true' || Boolean(req.headers['x-brand-id']);
      if (panel) return res.status(403).json(access.error);
      req.user = undefined;
      return next();
    }
    pinToBrand(req, req.user, access);
    return next();
  } catch (error) {
    return next(error);
  }
};

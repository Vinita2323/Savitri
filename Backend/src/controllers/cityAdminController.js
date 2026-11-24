import Admin from '../models/Admin.model.js';
import {
  CityAdminError, findBrand, currentAdminOfBrand, adminsOfBrand, adminStatusOf, shapeCityAdmin, readPerson, readStatus, readPermissions, createCityAdmin, updateDetails, resetPassword, setStatus,
  setPermissions, reassign, brandsWithAdminStatus, cityOf,
} from '../services/cityAdminService.js';
import { CITY_ADMIN_PERMISSIONS } from '../utils/cityAdminAccess.js';

/** Super Admin only (the routes use protect('super_admin')). Passwords are never logged and never returned, except a generated one, once. */
const actorOf = (req) => ({ id: req.user.id, name: req.user.name || req.user.email || '', email: req.user.email });
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const wrap = (fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (err) {
    if (err instanceof CityAdminError) return fail(res, err.status, err.message, err.code ? { code: err.code } : {});
    console.error('[CityAdmin]', err.message);
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
};

export const listBrandsWithAdminStatus = wrap(async (req, res) => {
  const status = String(req.query.adminStatus || '').toUpperCase();
  let rows = await brandsWithAdminStatus();
  const counts = { total: rows.length, CONFIGURED: 0, PENDING: 0, INACTIVE: 0 };
  rows.forEach((r) => { counts[r.adminStatus] += 1; });
  if (['CONFIGURED', 'PENDING', 'INACTIVE'].includes(status)) rows = rows.filter((r) => r.adminStatus === status);
  return res.json({ success: true, counts, brands: rows, permissionCatalog: CITY_ADMIN_PERMISSIONS });
});

export const getBrandAdmin = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id);
  const [admin, all] = await Promise.all([currentAdminOfBrand(brand.brandId), adminsOfBrand(brand.brandId)]);
  let cityProblem = '';
  try { cityOf(brand); } catch (e) { cityProblem = e.message; }
  return res.json({
    success: true,
    brand: { brandId: brand.brandId, name: brand.name, code: brand.code, city: brand.city || '', status: brand.status },
    adminStatus: adminStatusOf(admin), admin: shapeCityAdmin(admin), previousAdmins: all.filter((a) => !admin || String(a._id) !== String(admin._id)).map(shapeCityAdmin),
    cityProblem, permissionCatalog: CITY_ADMIN_PERMISSIONS,
  });
});

export const createBrandAdmin = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id); // brand and city come from the database, never from the request
  const person = readPerson(req.body || {});
  const admin = await createCityAdmin({ brand, person, status: readStatus(req.body?.status), permissions: readPermissions(req.body?.permissions), actor: actorOf(req) });
  return res.status(201).json({ success: true, message: 'City Admin created.', admin: shapeCityAdmin(admin), temporaryPassword: person.temporary ? person.password : undefined });
});

export const updateBrandAdmin = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id);
  const admin = await updateDetails({ brand, body: req.body || {}, actor: actorOf(req) });
  return res.json({ success: true, message: 'City Admin details updated.', admin: shapeCityAdmin(admin) });
});

export const resetBrandAdminPassword = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id);
  const { admin, temporaryPassword } = await resetPassword({ brand, body: req.body || {}, actor: actorOf(req) });
  return res.json({ success: true, message: 'Password reset. The admin has been signed out everywhere and must set a new password at the next login.', admin: shapeCityAdmin(admin), temporaryPassword });
});

export const setBrandAdminStatus = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id);
  const admin = await setStatus({ brand, status: readStatus(req.body?.status), actor: actorOf(req) });
  return res.json({ success: true, message: admin.status === 'active' ? 'City Admin activated.' : 'City Admin deactivated and signed out.', admin: shapeCityAdmin(admin) });
});

export const setBrandAdminPermissions = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id);
  const admin = await setPermissions({ brand, permissions: req.body?.permissions, actor: actorOf(req) });
  return res.json({ success: true, message: 'Permissions updated.', admin: shapeCityAdmin(admin) });
});

export const reassignBrandAdmin = wrap(async (req, res) => {
  const brand = await findBrand(req.params.id);
  const { admin, temporaryPassword } = await reassign({ brand, body: req.body || {}, actor: actorOf(req) });
  return res.json({ success: true, message: 'The brand now has a new City Admin. The previous one was deactivated and signed out.', admin: shapeCityAdmin(admin), temporaryPassword });
});

/** Standalone (non City Admin) admin accounts that could be assigned to a brand */
export const listAssignableAdmins = wrap(async (req, res) => {
  const rows = await Admin.find({ role: 'admin', adminType: { $ne: 'CITY_ADMIN' } }).select('name email mobile status').sort({ name: 1 }).limit(200).lean();
  return res.json({ success: true, admins: rows.map((a) => ({ id: String(a._id), name: a.name, email: a.email, mobile: a.mobile || '', status: a.status || 'active' })) });
});

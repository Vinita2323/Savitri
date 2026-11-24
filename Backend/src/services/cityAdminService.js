import crypto from 'crypto';
import Admin from '../models/Admin.model.js';
import Brand from '../models/Brand.model.js';
import { normalizeCity } from '../utils/cityNormalization.js';
import { ALL_PERMISSION_KEYS, cleanPermissions } from '../utils/cityAdminAccess.js';

/**
 * City Admin = an Admin account (role "admin") tied to exactly ONE brand. Brand and city are always read from the Brand
 * record in the database; whatever the browser sends about them is ignored.
 */
export class CityAdminError extends Error {
  constructor(status, message, code = '') { super(message); this.status = status; this.code = code; }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[6-9]\d{9}$/;
const USERNAME = /^[a-z0-9._-]{3,30}$/;
const PASSWORD_HELP = 'The password must be at least 8 characters and contain a letter and a number.';
export const passwordOk = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 100 && /[A-Za-z]/.test(p) && /\d/.test(p);

let indexesReady = null;
/** The app disables mongoose autoIndex; the one-active-admin-per-brand rule needs its index to exist. */
export const ensureCityAdminIndexes = () => {
  if (!indexesReady) indexesReady = Admin.createIndexes().catch((e) => { indexesReady = null; throw e; });
  return indexesReady;
};

export const generateTemporaryPassword = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(letters), pick(letters), pick(digits), pick(digits), ...Array.from({ length: 8 }, () => pick(letters + digits))];
  for (let i = chars.length - 1; i > 0; i -= 1) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
};

/** Public shape: a whitelist, so a password hash can never leak through here. */
export const shapeCityAdmin = (a) => (a ? {
  id: String(a._id), name: a.name, email: a.email, mobile: a.mobile || '', username: a.username || '', brandId: a.brandId, city: a.city || '', cityId: a.cityId || '',
  status: a.status || 'active', permissions: a.permissions || [], mustChangePassword: Boolean(a.mustChangePassword), lastLoginAt: a.lastLoginAt || null,
  createdAt: a.createdAt, assignedBy: a.assignedBy?.name || '', history: (a.assignmentHistory || []).slice(-15),
} : null);

const SELECT = '-password';
export const findBrand = async (brandKey) => {
  const brand = await Brand.findOne({ $or: [{ brandId: String(brandKey) }, ...(/^[a-f0-9]{24}$/i.test(String(brandKey)) ? [{ _id: brandKey }] : [])] });
  if (!brand) throw new CityAdminError(404, 'Brand not found.');
  return brand;
};

export const cityOf = (brand) => {
  const city = String(brand.city || '').trim();
  if (!city) throw new CityAdminError(422, 'This brand has no city saved. Edit the brand and set its operating city first, then create the City Admin.', 'NO_CITY');
  return { city, cityId: normalizeCity(city) || city.toLowerCase() };
};

/** Every City Admin account of a brand (active first) */
export const adminsOfBrand = (brandId) => Admin.find({ adminType: 'CITY_ADMIN', brandId }).select(SELECT).sort({ status: 1, createdAt: -1 });
export const activeAdminOfBrand = (brandId) => Admin.findOne({ adminType: 'CITY_ADMIN', brandId, status: 'active' }).select(SELECT);
/** the admin to show for a brand: the active one, else the most recent one */
export const currentAdminOfBrand = async (brandId) => (await activeAdminOfBrand(brandId)) || (await Admin.findOne({ adminType: 'CITY_ADMIN', brandId }).select(SELECT).sort({ createdAt: -1 }));

export const adminStatusOf = (admin) => (!admin ? 'PENDING' : admin.status === 'active' ? 'CONFIGURED' : 'INACTIVE');

/** Validate and normalise the person's details. Throws a clear 400 for anything invalid. */
export const readPerson = (b, { requirePassword = true } = {}) => {
  const name = String(b.name || '').trim();
  if (name.length < 2 || name.length > 80) throw new CityAdminError(400, 'Enter the admin\'s full name (2 to 80 characters).');
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) throw new CityAdminError(400, 'Enter a valid admin email address.');
  const mobile = String(b.mobile || '').replace(/\D/g, '').slice(-10);
  if (!PHONE.test(mobile)) throw new CityAdminError(400, 'Enter a valid 10-digit mobile number starting with 6-9.');
  const username = String(b.username || '').trim().toLowerCase();
  if (username && !USERNAME.test(username)) throw new CityAdminError(400, 'The username must be 3 to 30 letters, numbers, dots, dashes or underscores.');
  const out = { name, email, mobile, username: username || undefined };
  if (requirePassword) {
    if (b.generatePassword === true) { out.temporary = true; out.password = generateTemporaryPassword(); } else {
      if (!passwordOk(b.password)) throw new CityAdminError(400, PASSWORD_HELP);
      if (b.password !== b.confirmPassword) throw new CityAdminError(400, 'The password and its confirmation do not match.');
      out.password = b.password;
    }
  }
  return out;
};

export const readStatus = (v, d = 'active') => {
  const s = String(v || d).toLowerCase();
  if (!['active', 'inactive'].includes(s)) throw new CityAdminError(400, 'The account status must be active or inactive.');
  return s;
};

export const readPermissions = (list) => {
  if (list === undefined) return [...ALL_PERMISSION_KEYS];
  const clean = cleanPermissions(list);
  if (!clean) throw new CityAdminError(400, 'Permissions must be a list.');
  return clean;
};

const dupMessage = async (email, username) => {
  const byEmail = await Admin.findOne({ email }).select('adminType brandId role');
  if (byEmail) return byEmail.adminType === 'CITY_ADMIN' ? `This email already belongs to the City Admin of another brand (${byEmail.brandId}).` : 'An admin account with this email already exists. Use a different email.';
  if (username && (await Admin.exists({ username }))) return 'This username is already taken.';
  return null;
};

/** Create the City Admin of a brand. Refuses when the brand already has an active one (no duplicate assignments). */
export const createCityAdmin = async ({ brand, person, status = 'active', permissions, actor }) => {
  await ensureCityAdminIndexes();
  const { city, cityId } = cityOf(brand);
  if (status === 'active' && (await activeAdminOfBrand(brand.brandId))) throw new CityAdminError(409, 'This brand already has an active City Admin. Deactivate or reassign it instead of creating another.', 'ALREADY_ASSIGNED');
  const dup = await dupMessage(person.email, person.username);
  if (dup) throw new CityAdminError(409, dup, 'DUPLICATE');
  let admin;
  try {
    admin = await Admin.create({
      name: person.name, firstName: person.name.split(' ')[0], lastName: person.name.split(' ').slice(1).join(' '), email: person.email, mobile: person.mobile, username: person.username,
      password: person.password, role: 'admin', status, adminType: 'CITY_ADMIN', brandId: brand.brandId, city, cityId, authorizedBrands: [brand.brandId],
      permissions, mustChangePassword: person.temporary ? true : undefined, assignedBy: { id: actor?.id, name: actor?.name || actor?.email || '' },
      assignmentHistory: [{ at: new Date(), action: 'CREATED', by: actor?.name || actor?.email || '', note: `Assigned to ${brand.name}` }],
    });
  } catch (err) {
    if (err?.code === 11000) throw new CityAdminError(409, /brandId/.test(JSON.stringify(err.keyPattern || err.message)) ? 'This brand already has an active City Admin.' : 'An admin with this email or username already exists.', 'DUPLICATE');
    throw err;
  }
  return admin;
};

const addHistory = (admin, action, actor, note = '') => {
  admin.assignmentHistory = [...(admin.assignmentHistory || []), { at: new Date(), action, by: actor?.name || actor?.email || '', note }].slice(-50);
};
/** Ends every login session of this admin (the token version is checked on every request) */
export const revokeSessions = (admin) => { admin.tokenVersion = (admin.tokenVersion || 0) + 1; };

export const loadCityAdmin = async (brandId, { required = true } = {}) => {
  const a = await Admin.findOne({ adminType: 'CITY_ADMIN', brandId, status: 'active' }) || await Admin.findOne({ adminType: 'CITY_ADMIN', brandId }).sort({ createdAt: -1 });
  if (!a && required) throw new CityAdminError(404, 'This brand has no City Admin yet.');
  return a;
};

export const updateDetails = async ({ brand, body, actor }) => {
  const admin = await loadCityAdmin(brand.brandId);
  const person = readPerson({ ...body, password: 'x1xxxxxx', confirmPassword: 'x1xxxxxx' }, { requirePassword: false });
  if (person.email !== admin.email && (await Admin.exists({ email: person.email, _id: { $ne: admin._id } }))) throw new CityAdminError(409, 'An admin account with this email already exists.', 'DUPLICATE');
  if (person.username && person.username !== admin.username && (await Admin.exists({ username: person.username, _id: { $ne: admin._id } }))) throw new CityAdminError(409, 'This username is already taken.', 'DUPLICATE');
  const emailChanged = person.email !== admin.email;
  Object.assign(admin, { name: person.name, firstName: person.name.split(' ')[0], lastName: person.name.split(' ').slice(1).join(' '), email: person.email, mobile: person.mobile, username: person.username });
  if (emailChanged) revokeSessions(admin); // the login name changed: sign them out
  addHistory(admin, 'DETAILS_UPDATED', actor);
  await admin.save();
  return admin;
};

export const resetPassword = async ({ brand, body, actor }) => {
  const admin = await loadCityAdmin(brand.brandId);
  let password; let temporary = false;
  if (body.generatePassword === true) { password = generateTemporaryPassword(); temporary = true; } else {
    if (!passwordOk(body.password)) throw new CityAdminError(400, PASSWORD_HELP);
    if (body.password !== body.confirmPassword) throw new CityAdminError(400, 'The password and its confirmation do not match.');
    password = body.password;
  }
  admin.password = password; // hashed by the model before saving
  admin.mustChangePassword = true;
  revokeSessions(admin);
  addHistory(admin, 'PASSWORD_RESET', actor);
  await admin.save();
  return { admin, temporaryPassword: temporary ? password : undefined };
};

export const setStatus = async ({ brand, status, actor }) => {
  const admin = await loadCityAdmin(brand.brandId);
  if (status === 'active') {
    const other = await Admin.findOne({ adminType: 'CITY_ADMIN', brandId: brand.brandId, status: 'active', _id: { $ne: admin._id } });
    if (other) throw new CityAdminError(409, 'Another City Admin is already active for this brand.', 'ALREADY_ASSIGNED');
  }
  admin.status = status;
  revokeSessions(admin); // signed out now; a reactivated admin logs in again
  addHistory(admin, status === 'active' ? 'ACTIVATED' : 'DEACTIVATED', actor);
  try { await admin.save(); } catch (err) { if (err?.code === 11000) throw new CityAdminError(409, 'Another City Admin is already active for this brand.', 'ALREADY_ASSIGNED'); throw err; }
  return admin;
};

export const setPermissions = async ({ brand, permissions, actor }) => {
  const admin = await loadCityAdmin(brand.brandId);
  admin.permissions = readPermissions(permissions);
  addHistory(admin, 'PERMISSIONS_UPDATED', actor, admin.permissions.join(', '));
  await admin.save(); // takes effect on the very next request: permissions are read from the database each time
  return admin;
};

/**
 * Hand the brand to someone else. The current admin is deactivated and signed out. The new person is either a brand new account
 * or an existing standalone Admin account (which then becomes this brand's City Admin and loses its other brand access).
 */
export const reassign = async ({ brand, body, actor }) => {
  await ensureCityAdminIndexes();
  const current = await activeAdminOfBrand(brand.brandId);
  let next;
  if (body.existingAdminId) {
    if (!/^[a-f0-9]{24}$/i.test(String(body.existingAdminId))) throw new CityAdminError(400, 'Choose a valid admin account.');
    next = await Admin.findById(body.existingAdminId);
    if (!next || next.role !== 'admin') throw new CityAdminError(404, 'Admin account not found.');
    if (next.adminType === 'CITY_ADMIN' && next.brandId !== brand.brandId) throw new CityAdminError(409, `That admin is already the City Admin of ${next.brandId}.`, 'ALREADY_ASSIGNED');
    if (current && String(current._id) === String(next._id)) throw new CityAdminError(409, 'That admin is already the City Admin of this brand.', 'ALREADY_ASSIGNED');
    const { city, cityId } = cityOf(brand);
    if (current) { current.status = 'inactive'; revokeSessions(current); addHistory(current, 'REASSIGNED_AWAY', actor); await current.save(); }
    Object.assign(next, { adminType: 'CITY_ADMIN', brandId: brand.brandId, city, cityId, authorizedBrands: [brand.brandId], status: 'active', permissions: readPermissions(body.permissions), assignedBy: { id: actor?.id, name: actor?.name || '' } });
    revokeSessions(next);
    addHistory(next, 'ASSIGNED', actor, `Assigned to ${brand.name}`);
    await next.save();
    return { admin: next };
  }
  const person = readPerson(body);
  if (current) { current.status = 'inactive'; revokeSessions(current); addHistory(current, 'REASSIGNED_AWAY', actor); await current.save(); }
  try {
    next = await createCityAdmin({ brand, person, status: 'active', permissions: readPermissions(body.permissions), actor });
  } catch (err) {
    if (current) { current.status = 'active'; addHistory(current, 'REASSIGN_UNDONE', actor, err.message); await current.save().catch(() => {}); } // nothing was changed
    throw err;
  }
  return { admin: next, temporaryPassword: person.temporary ? person.password : undefined };
};

/** Every brand with its City Admin status, for the Brands list (never includes password hashes) */
export const brandsWithAdminStatus = async () => {
  const [brands, admins] = await Promise.all([Brand.find({}).sort({ createdAt: -1 }).lean(), Admin.find({ adminType: 'CITY_ADMIN' }).select(SELECT).lean()]);
  const byBrand = new Map();
  for (const a of admins) {
    const cur = byBrand.get(a.brandId);
    if (!cur || (a.status === 'active' && cur.status !== 'active')) byBrand.set(a.brandId, a);
  }
  return brands.map((b) => {
    const a = byBrand.get(b.brandId) || null;
    return {
      brandId: b.brandId, name: b.name, code: b.code, city: b.city || '', cityMissing: !String(b.city || '').trim(), brandStatus: b.status,
      adminStatus: adminStatusOf(a), admin: a ? shapeCityAdmin(a) : null,
    };
  });
};

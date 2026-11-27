/**
 * Admin Configuration (Super Admin): ordinary Admin accounts (role 'admin', the existing login) and the brands each one manages.
 * City Admins are managed from their brand's page and only appear here as brand holders.
 *
 * Rules
 *  - An admin saved here is "ASSIGNED": it can use exactly the listed brands. No brands = no business data, never all brands.
 *  - A brand held by another admin is taken only when the request says so: transfer (the other admin loses it) or share.
 *  - `exclusiveBrands` has a unique index, so two simultaneous requests cannot give one brand to two admins by accident.
 *  - Access is read from the database on every request, so a change applies to the very next click of both admins.
 *  - Assignments never create, change or delete business records.
 */
import mongoose from 'mongoose';
import Admin from '../models/Admin.model.js';
import Brand from '../models/Brand.model.js';
import AdminAssignmentLog from '../models/AdminAssignmentLog.model.js';
import { assignedBrandIds, isStrictAdmin } from '../utils/adminAccess.js';
import { generateTemporaryPassword, passwordOk } from './cityAdminService.js';

export class AdminConfigError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const fail = (status, message, extra) => { throw new AdminConfigError(status, message, extra); };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = 'name email mobile status role adminType brandAccess authorizedBrands exclusiveBrands createdAt';
const REGULAR = { role: 'admin', adminType: { $ne: 'CITY_ADMIN' } };

let indexReady = null;
export const ensureAdminConfigIndexes = () => {
  if (!indexReady) {
    indexReady = Admin.collection
      .createIndex({ exclusiveBrands: 1 }, { unique: true, partialFilterExpression: { 'exclusiveBrands.0': { $exists: true } } })
      .catch((e) => { indexReady = null; throw e; });
  }
  return indexReady;
};

const isActive = (a) => !a.status || a.status === 'active';
/** ASSIGNED = managed here; LIMITED = an older account with a brand list; ALL = an older account that can use every brand */
const accessOf = (a) => {
  if (isStrictAdmin(a)) return 'ASSIGNED';
  const list = a.authorizedBrands;
  return !list?.length || list.includes('*') ? 'ALL' : 'LIMITED';
};
const person = (a) => ({ id: a?._id || null, name: a?.name || '', email: a?.email || '' });

const allBrands = () => Brand.find({}).select('brandId name code city state status').sort({ name: 1 }).lean();

const shape = (a, brandMap, holders) => {
  const ids = accessOf(a) === 'ALL' ? [] : assignedBrandIds(a).filter((id) => brandMap.has(id));
  return {
    id: String(a._id), name: a.name || '', email: a.email, mobile: a.mobile || '', status: isActive(a) ? 'active' : a.status,
    access: accessOf(a), brandCount: ids.length, createdAt: a.createdAt,
    brands: ids.map((id) => ({ ...brandMap.get(id), shared: (holders.get(id) || []).length > 1 })),
  };
};

/** brandId -> the admins that currently manage it (regular admins with that brand listed, and active City Admins) */
const holderMap = (admins) => {
  const map = new Map();
  for (const a of admins) {
    const city = a.adminType === 'CITY_ADMIN';
    if (city && !isActive(a)) continue;
    for (const id of assignedBrandIds(a)) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ adminId: String(a._id), name: a.name || a.email, status: isActive(a) ? 'active' : a.status, type: city ? 'CITY_ADMIN' : 'ADMIN' });
    }
  }
  return map;
};

const snapshot = async () => {
  const [brands, admins] = await Promise.all([allBrands(), Admin.find({ role: 'admin' }).select(FIELDS).sort({ createdAt: -1 }).lean()]);
  const brandMap = new Map(brands.map((b) => [b.brandId, { brandId: b.brandId, name: b.name, code: b.code, city: b.city, state: b.state, status: b.status }]));
  return { brands, admins, brandMap, holders: holderMap(admins), regular: admins.filter((a) => a.adminType !== 'CITY_ADMIN') };
};

export const overview = async () => {
  const s = await snapshot();
  const assigned = s.brands.filter((b) => (s.holders.get(b.brandId) || []).length > 0).length;
  return {
    stats: {
      totalAdmins: s.regular.length,
      activeAdmins: s.regular.filter(isActive).length,
      inactiveAdmins: s.regular.filter((a) => !isActive(a)).length,
      totalBrands: s.brands.length,
      assignedBrands: assigned,
      unassignedBrands: s.brands.length - assigned,
      allBrandAdmins: s.regular.filter((a) => accessOf(a) === 'ALL').length,
    },
    brands: s.brands.map((b) => ({ ...s.brandMap.get(b.brandId), holders: s.holders.get(b.brandId) || [] })),
  };
};

export const listAdmins = async ({ search = '', status = '', brandId = '', page = 1, limit = 10 } = {}) => {
  const s = await snapshot();
  const q = String(search).trim().toLowerCase().slice(0, 80);
  const rows = s.regular
    .map((a) => shape(a, s.brandMap, s.holders))
    .filter((a) => (!q || [a.name, a.email, a.mobile].some((v) => String(v).toLowerCase().includes(q)))
      && (!status || (status === 'active' ? a.status === 'active' : a.status !== 'active'))
      && (!brandId || a.brands.some((b) => b.brandId === brandId)));
  const size = Math.min(100, Math.max(1, Number(limit) || 10));
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(pages, Math.max(1, Number(page) || 1));
  return { admins: rows.slice((current - 1) * size, current * size), total: rows.length, page: current, pages };
};

const findRegular = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(String(id))) fail(404, 'Admin not found.');
  const admin = await Admin.findOne({ _id: id, ...REGULAR });
  if (!admin) fail(404, 'Admin not found.');
  return admin;
};

export const getAdmin = async (id) => {
  const admin = await findRegular(id);
  const s = await snapshot();
  return shape(admin.toObject(), s.brandMap, s.holders);
};

const readDetails = async (body, current = null) => {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!current || has('name')) {
    out.name = String(body.name || '').trim();
    if (out.name.length < 2 || out.name.length > 100) fail(400, 'Enter the admin\'s name (2 to 100 characters).');
  }
  if (!current || has('email')) {
    out.email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL.test(out.email) || out.email.length > 150) fail(400, 'Enter a valid email address.');
    if (await Admin.exists({ email: out.email, ...(current ? { _id: { $ne: current._id } } : {}) })) fail(409, 'An admin account with this email already exists.');
  }
  if (!current || has('mobile')) {
    const digits = String(body.mobile || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    // older accounts may have no mobile number: leaving it empty on edit is allowed
    if (digits.length !== 10 && !(current && !digits)) fail(400, 'Enter a valid 10-digit mobile number.');
    out.mobile = digits;
  }
  return out;
};

const readStatus = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  const v = String(value).toLowerCase();
  if (!['active', 'inactive'].includes(v)) fail(400, 'Status must be active or inactive.');
  return v;
};

const readPassword = (body) => {
  if (body.generatePassword) { const password = generateTemporaryPassword(); return { password, generated: password }; }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!passwordOk(password)) fail(400, 'Password must be at least 8 characters and include a letter and a number.');
  if (body.confirmPassword !== password) fail(400, 'The two passwords do not match.');
  return { password, generated: null };
};

const readIds = (value, label) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 1000 || value.some((x) => typeof x !== 'string')) fail(400, `${label} must be a list of brand ids.`);
  return [...new Set(value.map((x) => x.trim()).filter(Boolean))];
};

/** Works out the new assignment and refuses anything that would take or duplicate a brand without being told to. */
const plan = async (adminId, currentIds, currentExclusive, body) => {
  const brandIds = readIds(body.brandIds, 'brandIds');
  const transfer = new Set(readIds(body.transferBrandIds, 'transferBrandIds'));
  const share = new Set(readIds(body.shareBrandIds, 'shareBrandIds'));
  const s = await snapshot();
  const unknown = brandIds.filter((id) => !s.brandMap.has(id));
  if (unknown.length) fail(400, `Unknown brand: ${unknown.join(', ')}`);

  const added = brandIds.filter((id) => !currentIds.includes(id));
  const removed = currentIds.filter((id) => !brandIds.includes(id));
  const conflicts = [];
  const exclusive = [];
  const moves = []; // { brandId, from: [holder] }
  for (const id of brandIds) {
    const others = (s.holders.get(id) || []).filter((h) => h.adminId !== String(adminId || ''));
    if (!added.includes(id)) {
      if (currentExclusive.includes(id) || others.length === 0) exclusive.push(id);
      continue;
    }
    if (others.length === 0) { exclusive.push(id); continue; }
    if (share.has(id)) continue; // explicitly shared
    const cityHolders = others.filter((h) => h.type === 'CITY_ADMIN');
    if (transfer.has(id) && cityHolders.length === 0) { moves.push({ brandId: id, from: others }); exclusive.push(id); continue; }
    conflicts.push({ brandId: id, brandName: s.brandMap.get(id).name, holders: others, canTransfer: cityHolders.length === 0 });
  }
  if (conflicts.length) {
    fail(409, `Already managed by another admin: ${conflicts.map((c) => `${c.brandName} (${c.holders.map((h) => h.name).join(', ')})`).join('; ')}. Choose "Transfer" or "Share" for each of these brands.`, { code: 'BRAND_CONFLICT', conflicts });
  }
  return { brandIds, exclusive, added, removed, moves, shared: added.filter((id) => share.has(id) && (s.holders.get(id) || []).some((h) => h.adminId !== String(adminId || ''))), snapshot: s };
};

const apply = async (admin, p, actor) => {
  await ensureAdminConfigIndexes();
  const touched = new Map(); // previous holders, to put back if the final write fails
  const putBack = async () => {
    for (const [id, before] of touched) {
      // if somebody else meanwhile took the brand exclusively, the unique index keeps it with them
      await Admin.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, before).catch(() => {});
    }
  };
  try {
    for (const move of p.moves) {
      for (const holder of move.from) {
        if (!touched.has(holder.adminId)) {
          const doc = await Admin.findById(holder.adminId).select('authorizedBrands exclusiveBrands brandAccess').lean();
          const set = { authorizedBrands: doc.authorizedBrands || [], exclusiveBrands: doc.exclusiveBrands || [] };
          touched.set(holder.adminId, doc.brandAccess ? { $set: { ...set, brandAccess: doc.brandAccess } } : { $set: set, $unset: { brandAccess: 1 } });
        }
        await Admin.updateOne({ _id: holder.adminId }, { $pull: { authorizedBrands: move.brandId, exclusiveBrands: move.brandId }, $set: { brandAccess: 'ASSIGNED' } });
      }
    }
    await Admin.updateOne({ _id: admin._id }, { $set: { authorizedBrands: p.brandIds, exclusiveBrands: p.exclusive, brandAccess: 'ASSIGNED' } });
  } catch (e) {
    await putBack();
    if (e?.code === 11000) fail(409, 'Another change assigned one of these brands at the same moment. Reload and try again.', { code: 'BRAND_CONFLICT' });
    throw e;
  }

  const name = (id) => p.snapshot.brandMap.get(id)?.name || id;
  const entry = (brandId, action, previousAdmin, newAdmin) => ({ brandId, brandName: name(brandId), action, previousAdmin, newAdmin, changedBy: actor });
  const rows = [];
  for (const id of p.added) {
    const move = p.moves.find((m) => m.brandId === id);
    if (move) {
      for (const h of move.from) {
        const from = p.snapshot.admins.find((a) => String(a._id) === h.adminId);
        rows.push(entry(id, 'TRANSFERRED', person(from), person(admin)));
      }
    } else rows.push(entry(id, p.shared.includes(id) ? 'SHARED' : 'ASSIGNED', person(null), person(admin)));
  }
  for (const id of p.removed) rows.push(entry(id, 'REMOVED', person(admin), person(null)));
  if (rows.length) await AdminAssignmentLog.insertMany(rows);
  return rows.length;
};

export const createAdmin = async (body = {}, actor) => {
  await ensureAdminConfigIndexes();
  const details = await readDetails(body);
  const status = readStatus(body.status, 'active');
  const { password, generated } = readPassword(body);
  const p = await plan(null, [], [], body); // conflicts are reported before anything is created
  let admin;
  try {
    admin = await Admin.create({ ...details, password, role: 'admin', status, brandAccess: 'ASSIGNED', authorizedBrands: [] });
  } catch (e) {
    if (e?.code === 11000) fail(409, 'An admin account with this email already exists.');
    throw e;
  }
  try {
    await apply(admin, p, actor);
  } catch (e) {
    await Admin.deleteOne({ _id: admin._id });
    throw e;
  }
  return { admin: await getAdmin(admin._id), temporaryPassword: generated };
};

export const updateDetails = async (id, body = {}) => {
  const admin = await findRegular(id);
  const details = await readDetails(body, admin);
  const emailChanged = details.email && details.email !== admin.email;
  admin.set(details);
  if (emailChanged) admin.tokenVersion = (admin.tokenVersion || 0) + 1; // sign in again with the new address
  await admin.save();
  return getAdmin(id);
};

export const setBrands = async (id, body = {}, actor) => {
  const admin = await findRegular(id);
  if (body.brandIds === undefined) fail(400, 'brandIds is required.');
  if (accessOf(admin) === 'ALL' && body.confirmRestrict !== true) {
    fail(409, 'This admin can currently use every brand. Saving will limit them to the selected brands only. Please confirm.', { code: 'CONFIRM_RESTRICT' });
  }
  const current = accessOf(admin) === 'ALL' ? [] : assignedBrandIds(admin);
  const p = await plan(admin._id, current, admin.exclusiveBrands || [], body);
  const changes = await apply(admin, p, actor);
  return { admin: await getAdmin(id), changes };
};

export const setStatus = async (id, value) => {
  const admin = await findRegular(id);
  const status = readStatus(value, null);
  if (!status) fail(400, 'Status must be active or inactive.');
  admin.status = status;
  if (status !== 'active') admin.tokenVersion = (admin.tokenVersion || 0) + 1; // signed out everywhere, immediately
  await admin.save();
  return getAdmin(id);
};

export const resetPassword = async (id, body = {}) => {
  const admin = await findRegular(id);
  const { password, generated } = readPassword(body);
  admin.password = password;
  admin.tokenVersion = (admin.tokenVersion || 0) + 1;
  await admin.save();
  return { temporaryPassword: generated };
};

export const history = async ({ adminId = '', brandId = '', page = 1, limit = 20 } = {}) => {
  const filter = {};
  if (mongoose.Types.ObjectId.isValid(String(adminId))) filter.$or = [{ 'previousAdmin.id': adminId }, { 'newAdmin.id': adminId }];
  if (brandId) filter.brandId = String(brandId);
  const size = Math.min(100, Math.max(1, Number(limit) || 20));
  const current = Math.max(1, Number(page) || 1);
  const [total, rows] = await Promise.all([
    AdminAssignmentLog.countDocuments(filter),
    AdminAssignmentLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((current - 1) * size).limit(size).lean(),
  ]);
  return { history: rows, total, page: current, pages: Math.max(1, Math.ceil(total / size)) };
};

/** Used by the older "admin brand access" editor so it cannot silently duplicate a managed admin's brand. */
export const setBrandsFromList = async (adminDoc, list, actor) => setBrands(adminDoc._id, { brandIds: list, confirmRestrict: true }, actor);

export const managedHoldersOf = (brandIds, exceptId) => Admin.find({ _id: { $ne: exceptId }, brandAccess: 'ASSIGNED', authorizedBrands: { $in: brandIds } }).select('name email authorizedBrands').lean();

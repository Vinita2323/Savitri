/**
 * Writing AdminBrandAccess records, always with an audit row. Which brands an admin has is decided elsewhere
 * (adminAccountService); this only stores and revokes what may be done inside them.
 */
import AdminBrandAccess, { ensureAdminBrandAccessIndexes } from '../models/AdminBrandAccess.model.js';
import AdminPermissionLog from '../models/AdminPermissionLog.model.js';
import { cleanMatrix, enabledModuleCount } from '../utils/permissionCatalog.js';

const person = (a) => ({ id: a?._id || a?.id || null, name: a?.name || '', email: a?.email || '' });
const view = (r) => ({ roleProfile: r?.roleProfile || '', permissions: r ? cleanMatrix(r.permissions) : null });
const same = (a, b) => a.roleProfile === b.roleProfile && JSON.stringify(cleanMatrix(a.permissions)) === JSON.stringify(cleanMatrix(b.permissions));

/** Saves one admin's permissions in one brand. Returns false when nothing changed. */
export const saveBrandAccess = async ({ admin, brandId, brandName, roleProfile, permissions, actor }) => {
  await ensureAdminBrandAccessIndexes();
  const before = await AdminBrandAccess.findOne({ adminId: admin._id, brandId }).lean();
  const next = { roleProfile, permissions: cleanMatrix(permissions) };
  const wasActive = Boolean(before?.isActive);
  if (wasActive && same(before, next)) return false;
  await AdminBrandAccess.updateOne(
    { adminId: admin._id, brandId },
    { $set: { ...next, isActive: true, updatedBy: actor }, $setOnInsert: { createdBy: actor } },
    { upsert: true }
  );
  await AdminPermissionLog.create({
    adminId: admin._id, admin: person(admin), brandId, brandName: brandName || brandId,
    action: wasActive ? 'UPDATED' : 'CONFIGURED',
    before: wasActive ? view(before) : { roleProfile: '', permissions: null }, after: next, changedBy: actor,
  });
  return true;
};

/**
 * Switches records off (brand removed, moved or deleted, or the account changed type). `adminIds` and/or `brandIds` limit
 * what is revoked; at least one of them must be given.
 */
export const revokeBrandAccess = async ({ adminIds, brandIds, actor, brandNames = new Map() }) => {
  const filter = { isActive: true };
  if (adminIds) filter.adminId = { $in: adminIds };
  if (brandIds) filter.brandId = { $in: brandIds };
  if (!adminIds && !brandIds) throw new Error('revokeBrandAccess needs an admin or a brand.');
  const records = await AdminBrandAccess.find(filter).lean();
  if (!records.length) return 0;
  await AdminBrandAccess.updateMany({ _id: { $in: records.map((r) => r._id) } }, { $set: { isActive: false, updatedBy: actor } });
  await AdminPermissionLog.insertMany(records.map((r) => ({
    adminId: r.adminId, admin: { id: r.adminId }, brandId: r.brandId, brandName: brandNames.get(r.brandId) || r.brandId,
    action: 'REVOKED', before: view(r), after: { roleProfile: '', permissions: null }, changedBy: actor,
  })));
  return records.length;
};

/** Map of "adminId|brandId" -> summary of the active record, for lists. */
export const accessSummaries = async (adminIds) => {
  const records = await AdminBrandAccess.find({ adminId: { $in: adminIds }, isActive: true }).lean();
  return new Map(records.map((r) => [`${r.adminId}|${r.brandId}`, {
    configured: true, roleProfile: r.roleProfile, permissions: cleanMatrix(r.permissions),
    enabledModules: enabledModuleCount(r.permissions), updatedAt: r.updatedAt, updatedBy: r.updatedBy?.name || r.updatedBy?.email || '',
  }]));
};

export const NOT_CONFIGURED = Object.freeze({ configured: false, roleProfile: '', permissions: {}, enabledModules: 0 });

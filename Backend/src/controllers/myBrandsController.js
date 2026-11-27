import Brand from '../models/Brand.model.js';
import { isRestrictedAdmin } from '../utils/restrictedAdmin.js';
import { usesBrandPermissions, loadBrandPermissions } from '../middleware/adminPermissionGate.js';
import { MODULES } from '../utils/permissionCatalog.js';

/**
 * GET /api/admin/my-brands: whether the signed-in admin is limited to some brands, which ones, and (for admins with
 * per-brand permissions) what may be done in each. Decided from the database account, never from anything the browser sends.
 */
export const getMyBrands = async (req, res, next) => {
  try {
    const restricted = await isRestrictedAdmin(req.user);
    const filter = restricted ? { brandId: { $in: req.user.authorizedBrands || [] } } : {};
    const brands = await Brand.find(filter).select('brandId name city state status logo').sort({ name: 1 }).lean();
    const enforced = usesBrandPermissions(req.user);
    const access = enforced ? await Promise.all(brands.map((b) => loadBrandPermissions(req.user.id, b.brandId))) : [];
    return res.json({
      success: true,
      restricted,
      enforced,
      // every permission that exists, so the panel knows which controls to hide
      ...(enforced ? { allActions: MODULES.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`)) } : {}),
      brands: restricted ? brands.map((b, i) => ({
        brandId: b.brandId, name: b.name, city: b.city, state: b.state, status: b.status, logo: b.logo,
        ...(enforced ? { configured: access[i].configured, roleProfile: access[i].roleProfile, permissions: access[i].permissions } : {}),
      })) : [],
    });
  } catch (error) {
    return next(error);
  }
};

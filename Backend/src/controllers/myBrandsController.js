import Brand from '../models/Brand.model.js';
import { isRestrictedAdmin } from '../utils/restrictedAdmin.js';

/**
 * GET /api/admin/my-brands: whether the signed-in admin is limited to some brands, and which ones. Decided from the database
 * account (never from anything the browser sends).
 */
export const getMyBrands = async (req, res, next) => {
  try {
    const restricted = await isRestrictedAdmin(req.user);
    const filter = restricted ? { brandId: { $in: req.user.authorizedBrands || [] } } : {};
    const brands = await Brand.find(filter).select('brandId name city state status logo').sort({ name: 1 }).lean();
    return res.json({
      success: true,
      restricted,
      brands: restricted ? brands.map((b) => ({ brandId: b.brandId, name: b.name, city: b.city, state: b.state, status: b.status, logo: b.logo })) : [],
    });
  } catch (error) {
    return next(error);
  }
};

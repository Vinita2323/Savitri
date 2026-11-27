/**
 * Brand gating for admin APIs that show platform-wide data to unrestricted staff. Only a brand-RESTRICTED admin is affected:
 * a Super Admin and an all-brand admin keep exactly the behaviour they had.
 */
import { resolveBrandScope, canAccessAllBrands, getScopedSellerIds, getScopedCaptainIds, getScopedUserIds } from '../middleware/scopeMiddleware.js';

export const isRestrictedAdmin = async (user) => String(user?.role || '') === 'admin' && !(await canAccessAllBrands(user));

/** Middleware: a restricted admin is pinned to the selected, authorised brand (req.restricted = true, req.scope set). */
export const scopeRestrictedAdmin = async (req, res, next) => {
  try {
    if (!(await isRestrictedAdmin(req.user))) return next();
    return resolveBrandScope(req, res, (err) => {
      if (err) return next(err);
      req.restricted = true;
      return next();
    });
  } catch (error) {
    return next(error);
  }
};

/** Middleware for routers that already ran resolveBrandScope: only marks restricted admins. */
export const markRestrictedAdmin = async (req, res, next) => {
  try {
    req.restricted = await isRestrictedAdmin(req.user);
    return next();
  } catch (error) {
    return next(error);
  }
};

// All of these fail closed: no match means an empty list, never "no filter".
export const brandSellerIds = async (req) => (await getScopedSellerIds(req.scope)) || [];
export const brandCaptainIds = async (req) => (await getScopedCaptainIds(req.scope)) || [];
export const brandUserIds = async (req) => (await getScopedUserIds(req.scope)) || [];
export const includesId = (list, id) => Boolean(id) && list.some((x) => String(x) === String(id?._id || id));

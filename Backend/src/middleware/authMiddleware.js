import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import Admin from '../models/Admin.model.js';
import { extractBearerOrCookieToken } from '../utils/adminAuthCookie.js';
import { getJwtSecret, JWT_ALGORITHMS } from '../utils/jwtConfig.js';

/** 'super-admin' / 'Super_Admin' -> 'super_admin' so route declarations cannot drift from token roles. */
export const normalizeRole = (role) => String(role || '').trim().toLowerCase().replace(/-/g, '_');

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/** Whether an Admin document may authenticate. Missing status (legacy documents) = active. */
export const isAdminAccountActive = (admin) => !admin?.status || admin.status === 'active';

export const protect = (...requiredRoles) => {
  return async (req, res, next) => {
    try {
      const token = extractBearerOrCookieToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, no token provided',
        });
      }

      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
      let tokenRole = normalizeRole(decoded.role);
      let effective = { ...decoded, role: tokenRole };

      // Admin / Super Admin: the account must still exist, be active, hold the same role and
      // not have been revoked. Role, brand access and status are always read from MongoDB,
      // never trusted from the token, so changes take effect on the very next request.
      if (ADMIN_ROLES.has(tokenRole)) {
        const adminId = decoded.id || decoded._id;
        const admin = adminId
          ? await Admin.findById(adminId).select('role status tokenVersion authorizedBrands email name').lean().catch(() => null)
          : null;

        if (!admin) {
          return res.status(401).json({ success: false, message: 'Not authorized, account no longer exists' });
        }
        if (!isAdminAccountActive(admin)) {
          return res.status(403).json({ success: false, message: 'Account is inactive or suspended' });
        }
        if (normalizeRole(admin.role) !== tokenRole) {
          return res.status(401).json({ success: false, message: 'Not authorized, session is no longer valid' });
        }
        if (Number(decoded.tokenVersion || 0) !== Number(admin.tokenVersion || 0)) {
          return res.status(401).json({ success: false, message: 'Not authorized, session has been revoked' });
        }

        effective = {
          ...decoded,
          role: normalizeRole(admin.role),
          authorizedBrands: Array.isArray(admin.authorizedBrands) ? admin.authorizedBrands : undefined,
        };
      }

      if (requiredRoles && requiredRoles.length > 0) {
        const roles = requiredRoles.flat().filter(Boolean).map(normalizeRole);
        if (roles.length > 0 && !roles.includes(effective.role)) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Access restricted to ${roles.join(' or ')}`,
          });
        }
      }

      // Active account enforcement: check if customer account is blocked
      if (effective.role === 'user' && decoded.id) {
        const userDoc = await User.findById(decoded.id).select('isBlocked status blockReason').lean();
        if (userDoc && (userDoc.isBlocked || userDoc.status === 'blocked' || userDoc.status === 'suspended')) {
          return res.status(403).json({
            success: false,
            message: userDoc.blockReason
              ? `Account suspended: ${userDoc.blockReason}`
              : 'Your account has been suspended by Admin. Please contact customer support.',
            isBlocked: true,
          });
        }
      }

      req.user = effective;
      next();
    } catch (error) {
      if (error?.message === 'JWT_SECRET is not configured') {
        console.error('[Security] JWT_SECRET missing at request time');
        return res.status(500).json({ success: false, message: 'Server authentication is misconfigured' });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
    }
  };
};

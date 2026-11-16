import jwt from 'jsonwebtoken';
import { extractBearerOrCookieToken } from '../utils/adminAuthCookie.js';
import { getJwtSecret, JWT_ALGORITHMS } from '../utils/jwtConfig.js';
import { normalizeRole } from './authMiddleware.js';

/**
 * Public routes that behave differently for a signed-in admin / seller.
 * Never rejects: a missing or invalid token just means the caller is treated as an anonymous customer.
 * `req.user` is only filled from a token whose signature verifies, never from query strings or headers.
 */
export const optionalAuth = (req, res, next) => {
  try {
    const token = extractBearerOrCookieToken(req);
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
      req.user = { ...decoded, id: decoded.id || decoded._id, role: normalizeRole(decoded.role) };
    }
  } catch {
    /* anonymous */
  }
  next();
};

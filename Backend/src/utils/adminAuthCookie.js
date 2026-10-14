export const ADMIN_AUTH_COOKIE = 'shippnex_admin_token';
export const SUPER_ADMIN_AUTH_COOKIE = 'shippnex_super_admin_token';

export const ADMIN_SESSION_TTL = '8h';
export const ADMIN_REMEMBER_TTL = '30d';
export const ADMIN_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Cookie options for admin / super-admin auth.
 * Production is cross-origin (Vercel frontend → Render API), so cookies must be
 * SameSite=None; Secure or the browser will drop them on XHR after login.
 * Session cookies omit maxAge.
 */
export const getAdminCookieOptions = (rememberMe = false) => {
  const crossSite = isProduction();
  const options = {
    httpOnly: true,
    secure: crossSite ? true : isProduction(),
    // 'none' required for credentialed requests from another site (e.g. *.vercel.app → *.onrender.com)
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
  };

  if (rememberMe) {
    options.maxAge = ADMIN_REMEMBER_MS;
  }

  return options;
};

export const setAdminAuthCookie = (res, token, rememberMe = false, cookieName = ADMIN_AUTH_COOKIE) => {
  res.cookie(cookieName, token, getAdminCookieOptions(rememberMe));
};

export const clearAdminAuthCookie = (res, cookieName = ADMIN_AUTH_COOKIE) => {
  const crossSite = isProduction();
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: crossSite ? true : isProduction(),
    sameSite: crossSite ? 'none' : 'lax',
    path: '/',
  });
};

export const extractBearerOrCookieToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const bearer = req.headers.authorization.split(' ')[1];
    if (bearer) return bearer;
  }

  if (req.cookies?.[ADMIN_AUTH_COOKIE]) return req.cookies[ADMIN_AUTH_COOKIE];
  if (req.cookies?.[SUPER_ADMIN_AUTH_COOKIE]) return req.cookies[SUPER_ADMIN_AUTH_COOKIE];
  return null;
};

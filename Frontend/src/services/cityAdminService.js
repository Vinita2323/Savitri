import API from './api';

/**
 * City Admin management (Super Admin only) and the City Admin login. The brand and city of an admin are decided by the server
 * from the brand record: the browser only names the brand in the URL. Passwords are never read back from the server.
 */
const unwrap = (promise, fallback) =>
  promise.then((res) => res.data).catch((err) => {
    const e = new Error(err.response?.data?.message || fallback || err.message || 'Request failed');
    e.status = err.response?.status;
    e.code = err.response?.data?.code;
    throw e;
  });

const B = '/super-admin/brands';

export const cityAdminService = {
  brandsWithStatus: (params) => unwrap(API.get(`${B}/admin-status`, { params }), 'Could not load the brands'),
  getAdmin: (brandId) => unwrap(API.get(`${B}/${brandId}/admin`), 'Could not load the City Admin'),
  create: (brandId, body) => unwrap(API.post(`${B}/${brandId}/admin`, body), 'Could not create the City Admin'),
  update: (brandId, body) => unwrap(API.put(`${B}/${brandId}/admin`, body), 'Could not update the City Admin'),
  resetPassword: (brandId, body) => unwrap(API.post(`${B}/${brandId}/admin/reset-password`, body), 'Could not reset the password'),
  setStatus: (brandId, status) => unwrap(API.patch(`${B}/${brandId}/admin/status`, { status }), 'Could not change the status'),
  setPermissions: (brandId, permissions) => unwrap(API.put(`${B}/${brandId}/admin/permissions`, { permissions }), 'Could not update the permissions'),
  reassign: (brandId, body) => unwrap(API.post(`${B}/${brandId}/admin/reassign`, body), 'Could not reassign the City Admin'),
  assignable: () => unwrap(API.get(`${B}/assignable-admins`), 'Could not load admin accounts'),

  /** The City Admin login. On success the session is stored exactly like the normal Admin login, so the Admin panel works. */
  login: async (login, password, rememberMe = false) => {
    const res = await API.post('/auth/city-admin/login', { login, password, rememberMe: Boolean(rememberMe) }).catch((err) => {
      throw Object.assign(new Error(err.response?.data?.message || 'Could not sign in'), { status: err.response?.status });
    });
    const d = res.data;
    if (d?.success && d.token) {
      localStorage.setItem('savitri_admin_token', d.token);
      localStorage.setItem('savitri_admin_data', JSON.stringify(d.admin));
      localStorage.setItem('savitri_admin_session', '1');
      try { sessionStorage.setItem('savitri_city_admin_brand', JSON.stringify(d.brand)); } catch { /* ignore */ }
    }
    return d;
  },
  /** `token` is the one returned by this sign-in, sent explicitly so no other saved login can be used by mistake */
  changePassword: (body, token) => unwrap(API.post('/auth/city-admin/change-password', body, { headers: { Authorization: `Bearer ${token}` } }), 'Could not change the password').then((d) => { if (d?.token) localStorage.setItem('savitri_admin_token', d.token); return d; }),
};

export default cityAdminService;

import API from './api';

/** Admin Configuration (Super Admin only). Errors keep the server's code and conflict list so the page can ask what to do. */
const unwrap = (promise, fallback) =>
  promise.then((res) => res.data).catch((err) => {
    const body = err.response?.data || {};
    throw Object.assign(new Error(body.message || fallback || err.message || 'Request failed'), { status: err.response?.status, code: body.code, conflicts: body.conflicts });
  });

const B = '/super-admin/admin-config';

export const adminConfigService = {
  overview: () => unwrap(API.get(`${B}/overview`), 'Could not load the overview'),
  list: (params) => unwrap(API.get(`${B}/admins`, { params }), 'Could not load the admins'),
  get: (id) => unwrap(API.get(`${B}/admins/${id}`), 'Could not load the admin'),
  create: (body) => unwrap(API.post(`${B}/admins`, body), 'Could not create the admin'),
  update: (id, body) => unwrap(API.put(`${B}/admins/${id}`, body), 'Could not save the details'),
  setBrands: (id, body) => unwrap(API.put(`${B}/admins/${id}/brands`, body), 'Could not save the brand assignment'),
  setStatus: (id, status) => unwrap(API.patch(`${B}/admins/${id}/status`, { status }), 'Could not change the status'),
  resetPassword: (id, body) => unwrap(API.post(`${B}/admins/${id}/reset-password`, body), 'Could not reset the password'),
  history: (params) => unwrap(API.get(`${B}/history`, { params }), 'Could not load the history'),
};

export default adminConfigService;

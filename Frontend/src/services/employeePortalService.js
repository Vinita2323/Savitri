import API from './api';

const unwrap = (promise, fallbackMessage) =>
  promise.then((res) => res.data).catch((err) => {
    const e = new Error(err.response?.data?.message || fallbackMessage || err.message || 'Request failed');
    e.status = err.response?.status;
    e.code = err.response?.data?.code;
    throw e;
  });

const TOKEN_KEY = 'savitri_employee_token';
const DATA_KEY = 'savitri_employee_data';

export const employeeSession = {
  getToken: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  getEmployee: () => {
    try { return JSON.parse(localStorage.getItem(DATA_KEY) || 'null'); } catch { return null; }
  },
  save: (token, employee) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(DATA_KEY, JSON.stringify(employee));
    } catch { /* storage unavailable */ }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(DATA_KEY);
    } catch { /* storage unavailable */ }
  },
};

const P = '/employee-portal';

export const employeePortalService = {
  // public
  brands: () => unwrap(API.get(`${P}/public/brands`), 'Could not load brands').then((d) => d.brands || []),
  departments: (brandId) => unwrap(API.get(`${P}/public/departments`, { params: { brandId } }), 'Could not load departments').then((d) => d.departments || []),
  admins: (brandId) => unwrap(API.get(`${P}/public/admins`, { params: { brandId } }), 'Could not load admins').then((d) => d.admins || []),
  register: (body) => unwrap(API.post(`${P}/register`, body), 'Registration failed'),
  login: (identifier, password) => unwrap(API.post(`${P}/login`, { identifier, password }), 'Login failed'),

  // authenticated
  logout: () => API.post(`${P}/logout`).catch(() => null),
  me: () => unwrap(API.get(`${P}/me`)).then((d) => d.employee),
  updateMe: (body) => unwrap(API.put(`${P}/me`, body), 'Could not update profile').then((d) => d.employee),
  changePassword: (currentPassword, newPassword) => unwrap(API.put(`${P}/me/password`, { currentPassword, newPassword }), 'Could not change password'),
  dashboard: () => unwrap(API.get(`${P}/dashboard`), 'Could not load dashboard'),

  attendanceMonth: (month) => unwrap(API.get(`${P}/attendance`, { params: { month } }), 'Could not load attendance'),
  attendanceHistory: (params = {}) => unwrap(API.get(`${P}/attendance/history`, { params }), 'Could not load history'),
  holidays: (year) => unwrap(API.get(`${P}/holidays`, { params: { year } }), 'Could not load holidays'),
  checkIn: () => unwrap(API.post(`${P}/attendance/check-in`), 'Check-in failed'),
  checkOut: () => unwrap(API.post(`${P}/attendance/check-out`), 'Check-out failed'),

  tasks: (params = {}) => unwrap(API.get(`${P}/tasks`, { params }), 'Could not load tasks'),
  task: (id) => unwrap(API.get(`${P}/tasks/${id}`), 'Could not load task'),
  startTask: (id) => unwrap(API.post(`${P}/tasks/${id}/start`), 'Could not start task'),
  setProgress: (id, progressPercent) => unwrap(API.patch(`${P}/tasks/${id}/progress`, { progressPercent }), 'Could not update progress'),
  comment: (id, text) => unwrap(API.post(`${P}/tasks/${id}/comments`, { text }), 'Could not add comment'),
  submitTask: (id, body) => unwrap(API.post(`${P}/tasks/${id}/submit`, body), 'Could not submit task'),
  requestExtension: (id, body) => unwrap(API.post(`${P}/tasks/${id}/extension`, body), 'Could not request extension'),
  uploadDocument: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return unwrap(API.post(`${P}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }), 'Upload failed');
  },

  leaves: () => unwrap(API.get(`${P}/leaves`), 'Could not load leaves').then((d) => d.leaves || []),
  applyLeave: (body) => unwrap(API.post(`${P}/leaves`, body), 'Could not apply for leave'),
  cancelLeave: (id) => unwrap(API.post(`${P}/leaves/${id}/cancel`), 'Could not cancel leave'),

  notifications: (params = {}) => unwrap(API.get(`${P}/notifications`, { params }), 'Could not load notifications'),
  markRead: (id) => unwrap(API.post(`${P}/notifications/${id}/read`)),
  markAllRead: () => unwrap(API.post(`${P}/notifications/read-all`)),

  // Live selfie verification (the photo comes from the camera screen; there is no gallery upload)
  // Salary: read only. The server answers only with this employee's own data.
  salary: () => unwrap(API.get(`${P}/salary`), 'Could not load your salary'),
  salaryPayrolls: () => unwrap(API.get(`${P}/salary/payrolls`), 'Could not load your salary history'),
  salaryPayroll: (id) => unwrap(API.get(`${P}/salary/payrolls/${id}`), 'Could not load this salary'),
  salaryPayments: () => unwrap(API.get(`${P}/salary/payments`), 'Could not load your payments'),
  downloadSlip: async (id) => {
    let res;
    try { res = await API.get(`${P}/salary/payrolls/${id}/slip`, { responseType: 'blob' }); } catch (err) {
      let msg = 'Could not download the salary slip';
      try { msg = JSON.parse(await err.response.data.text()).message || msg; } catch { /* keep default */ }
      throw new Error(msg);
    }
    const m = /filename="?([^";]+)"?/i.exec(res.headers?.['content-disposition'] || '');
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = m ? m[1] : 'salary-slip.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  selfieStatus: () => unwrap(API.get(`${P}/selfie/status`), 'Could not check your selfie status'),
  selfieHistory: (params = {}) => unwrap(API.get(`${P}/selfie/my-history`, { params }), 'Could not load your selfies'),
  submitSelfie: (type, blob, meta = {}, onProgress) => {
    const fd = new FormData();
    fd.append('selfie', blob, 'selfie.jpg');
    if (meta.capturedAt) fd.append('capturedAt', meta.capturedAt);
    fd.append('deviceInfo', JSON.stringify(meta.deviceInfo || {}));
    return unwrap(
      API.post(`${P}/selfie/${type === 'LOGIN' ? 'login' : 'submit'}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.min(100, Math.round((e.loaded / e.total) * 100)) : 0),
      }),
      'Could not submit your selfie'
    );
  },
  registerPush: (token) => unwrap(API.post(`${P}/push-token`, { token }), 'Could not turn on reminders'),

  /** ID proof (image or PDF) at registration, through the same public upload used by seller/captain registration. */
  uploadIdProof: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await API.post('/upload?folder=misc', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }).catch((err) => {
      throw new Error(err.response?.data?.message || 'Document upload failed');
    });
    return res.data?.imageUrl || res.data?.filePath || '';
  },

  /** Registration photo: public upload (the same endpoint seller/captain registration uses). */
  uploadProfilePhoto: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await API.post('/upload?folder=profiles', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }).catch((err) => {
      throw new Error(err.response?.data?.message || 'Photo upload failed');
    });
    return res.data?.imageUrl || res.data?.filePath || '';
  },
};

export default employeePortalService;

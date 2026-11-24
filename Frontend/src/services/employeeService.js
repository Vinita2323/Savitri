import API from './api';

/**
 * Admin / Super Admin employee API. Every call goes to the backend (MongoDB). There is deliberately no
 * local-storage or sample-data fallback: when the server fails the error is shown, never replaced by fake rows.
 */
const unwrap = (promise, fallbackMessage) =>
  promise.then((res) => res.data).catch((err) => {
    throw new Error(err.response?.data?.message || fallbackMessage || err.message || 'Request failed');
  });

export const employeeService = {
  // 1. Employees directory
  getEmployees: (params = {}) => unwrap(API.get('/employees', { params }), 'Could not load employees'),
  getEmployeeById: (id) =>
    API.get(`/employees/${id}`).then((r) => r.data?.employee || null).catch((err) => {
      if (err.response?.status === 404) return null;
      throw new Error(err.response?.data?.message || 'Could not load employee');
    }),
  createEmployee: (data) => unwrap(API.post('/employees', data), 'Could not create employee'),
  updateEmployee: (id, updates) => unwrap(API.put(`/employees/${id}`, updates), 'Could not update employee'),
  toggleEmployeeStatus: (id, status) => unwrap(API.patch(`/employees/${id}/status`, { status }), 'Could not change status'),

  // 2. Attendance
  getAttendanceRecords: (params = {}) => unwrap(API.get('/employees/attendance/records', { params }), 'Could not load attendance'),
  checkIn: (payload) => unwrap(API.post('/employees/attendance/check-in', payload), 'Check-in failed'),
  checkOut: (payload) => unwrap(API.post('/employees/attendance/check-out', payload), 'Check-out failed'),
  manualMarkAttendance: (payload) => unwrap(API.post('/employees/attendance/manual', payload), 'Could not save attendance'),
  correctAttendance: (id, payload) => unwrap(API.patch(`/employees/attendance/${id}/correction`, payload), 'Could not correct attendance'),

  // 3. Tasks
  getTasks: (params = {}) => unwrap(API.get('/employees/tasks/all', { params }), 'Could not load tasks'),
  createTask: (data) => unwrap(API.post('/employees/tasks', data), 'Could not create task'),
  /** Many tasks in one go. Each task succeeds or fails on its own; see results[] in the answer. */
  createTasksBulk: (tasks) => unwrap(API.post('/employees/tasks/bulk', { tasks }), 'Could not create the tasks'),
  updateTask: (id, data) => unwrap(API.put(`/employees/tasks/${id}`, data), 'Could not update task'),
  updateTaskStatus: (id, payload) => unwrap(API.patch(`/employees/tasks/${id}/status`, payload), 'Could not update task'),
  addTaskComment: (id, text) => unwrap(API.post(`/employees/tasks/${id}/comments`, { text }), 'Could not add comment'),

  /** Reference document for a task (images / PDF) through the existing upload endpoint. */
  uploadTaskFile: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const res = await API.post('/upload?folder=misc', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }).catch((err) => {
      throw new Error(err.response?.data?.message || 'Upload failed');
    });
    return { name: file.name, url: res.data?.imageUrl || '' };
  },

  // 4. Leaves
  getLeaveRequests: (params = {}) => unwrap(API.get('/employees/leaves/all', { params }), 'Could not load leave requests'),
  submitLeaveRequest: (data) => unwrap(API.post('/employees/leaves', data), 'Could not submit leave'),
  reviewLeaveRequest: (id, status, notes = '') => unwrap(API.patch(`/employees/leaves/${id}/review`, { status, notes }), 'Could not review leave'),

  // 5. Shifts & holidays
  getShifts: (params = {}) => API.get('/employees/shifts', { params }).then((r) => r.data?.shifts || []),
  createShift: (data) => unwrap(API.post('/employees/shifts', data), 'Could not save shift'),
  getHolidays: (params = {}) => API.get('/employees/holidays', { params }).then((r) => r.data?.holidays || []),
  createHoliday: (data) => unwrap(API.post('/employees/holidays', data), 'Could not save holiday'),

  // 6. Dashboard metrics
  getDashboardSummary: (params = {}) => API.get('/employees/dashboard-summary', { params }).then((r) => r.data?.metrics || {}),
};

/** New employee-management endpoints (registrations, departments, rules, review, activity, ...). */
export const employeeManagementService = {
  overview: (params = {}) => unwrap(API.get('/employee-management/overview', { params }), 'Could not load overview').then((d) => d.overview),

  listRegistrations: (params = {}) => unwrap(API.get('/employee-management/registrations', { params }), 'Could not load registrations'),
  approveRegistration: (id, body = {}) => unwrap(API.post(`/employee-management/registrations/${id}/approve`, body), 'Could not approve'),
  rejectRegistration: (id, reason) => unwrap(API.post(`/employee-management/registrations/${id}/reject`, { reason }), 'Could not reject'),
  resetPassword: (id, password) => unwrap(API.post(`/employee-management/employees/${id}/reset-password`, { password }), 'Could not reset password'),

  getRules: (params = {}) => unwrap(API.get('/employee-management/attendance-rules', { params }), 'Could not load rules'),
  saveRules: (body) => unwrap(API.put('/employee-management/attendance-rules', body), 'Could not save rules'),

  dailyAttendance: (params = {}) => unwrap(API.get('/employee-management/attendance/daily', { params }), 'Could not load attendance'),
  monthlyAttendance: (params = {}) => unwrap(API.get('/employee-management/attendance/monthly', { params }), 'Could not load monthly attendance'),
  employeeAttendance: (id, params = {}) => unwrap(API.get(`/employee-management/attendance/employee/${id}`, { params }), 'Could not load attendance'),
  attendanceAudit: (id) => unwrap(API.get(`/employee-management/attendance/${id}/audit`), 'Could not load audit trail'),
  correctAttendance: (body) => unwrap(API.post('/employee-management/attendance/correct', body), 'Could not save correction'),
  exportAttendance: async (params = {}) => {
    try {
      const res = await API.get('/employee-management/attendance/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${params.month || params.from || 'report'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error(err.response?.status === 400 ? 'Export range is too large or invalid' : 'Export failed');
    }
  },

  listSubmissions: (params = {}) => unwrap(API.get('/employee-management/task-submissions', { params }), 'Could not load submissions'),
  reviewTask: (id, decision, notes = '') => unwrap(API.post(`/employee-management/tasks/${id}/review`, { decision, notes }), 'Could not review task'),
  decideExtension: (taskId, requestId, decision, notes = '') =>
    unwrap(API.post(`/employee-management/tasks/${taskId}/extensions/${requestId}`, { decision, notes }), 'Could not save decision'),

  currentLeaves: (params = {}) => unwrap(API.get('/employee-management/leaves/current', { params }), 'Could not load leaves'),
  decideLeave: (id, status, notes = '') => unwrap(API.post(`/employee-management/leaves/${id}/decision`, { status, notes }), 'Could not save decision'),

  activity: (params = {}) => unwrap(API.get('/employee-management/activity', { params }), 'Could not load activity'),

  // Live selfie verification monitoring
  selfieOverview: (params = {}) => unwrap(API.get('/employee-management/selfies/overview', { params }), 'Could not load selfie monitoring'),
  selfieEmployee: (id, params = {}) => unwrap(API.get(`/employee-management/selfies/employee/${id}`, { params }), 'Could not load the selfies of this employee'),
  selfieAlerts: (params = {}) => unwrap(API.get('/employee-management/selfies/alerts', { params }), 'Could not load alerts'),
  selfieAlertsRead: () => unwrap(API.post('/employee-management/selfies/alerts/read'), 'Could not mark alerts as read'),
  selfieSettings: (params = {}) => unwrap(API.get('/employee-management/selfies/settings', { params }), 'Could not load selfie settings'),
  saveSelfieSettings: (body) => unwrap(API.put('/employee-management/selfies/settings', body), 'Could not save selfie settings'),

  listAdminAccess: () => unwrap(API.get('/employee-management/admin-access'), 'Could not load admins'),
  saveAdminAccess: (id, authorizedBrands) => unwrap(API.put(`/employee-management/admin-access/${id}`, { authorizedBrands }), 'Could not save access'),
};

export default employeeService;

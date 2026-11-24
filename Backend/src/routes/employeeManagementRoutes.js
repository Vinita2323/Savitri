import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import {
  getOverview,
  listRegistrations,
  getRegistration,
  approveRegistration,
  rejectRegistration,
  resetEmployeePassword,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  assignEmployeeDepartment,
  getAttendanceRules,
  saveAttendanceRules,
  getDailyAttendance,
  getEmployeeMonthly,
  getMonthlyAll,
  exportAttendance,
  correctAttendance,
  getAttendanceAudit,
  listSubmissions,
  reviewTask,
  decideExtension,
  currentLeaves,
  decideLeave,
  listActivity,
  listAdminAccess,
  updateAdminAccess,
} from '../controllers/employeeAdminController.js';
import { adminOverview, adminEmployeeDetail, adminAlerts, adminAlertsRead, getSelfieSettings, saveSelfieSettings } from '../controllers/employeeSelfieController.js';

const router = express.Router();

// Admin = their assigned brand(s) only (enforced by resolveBrandScope + per-record checks); Super Admin = all brands.
router.use(protect('admin', 'super_admin'));
router.use(resolveBrandScope);
// A validated brand scope always wins over a brandId in the query/body (no forging another brand).
router.use((req, res, next) => {
  if (req.scope && !req.scope.isAll) {
    Object.defineProperty(req, 'query', { value: { ...req.query, brandId: req.scope.brandId }, writable: true, configurable: true });
    if (req.body && typeof req.body === 'object') req.body.brandId = req.scope.brandId;
  }
  next();
});

const superOnly = (req, res, next) =>
  String(req.user?.role || '').replace(/-/g, '_') === 'super_admin'
    ? next()
    : res.status(403).json({ success: false, message: 'Forbidden: Super Admin only' });

router.get('/overview', getOverview);

// ── live selfie monitoring (Admin: own brand(s); Super Admin: everything) ──
router.get('/selfies/overview', adminOverview);
router.get('/selfies/employee/:id', adminEmployeeDetail);
router.get('/selfies/alerts', adminAlerts);
router.post('/selfies/alerts/read', adminAlertsRead);
router.get('/selfies/settings', getSelfieSettings);
router.put('/selfies/settings', saveSelfieSettings);

router.get('/registrations', listRegistrations);
router.get('/registrations/:id', getRegistration);
router.post('/registrations/:id/approve', approveRegistration);
router.post('/registrations/:id/reject', rejectRegistration);
router.post('/employees/:id/reset-password', resetEmployeePassword);
router.put('/employees/:id/department', assignEmployeeDepartment);

router.get('/departments', listDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

router.get('/attendance-rules', getAttendanceRules);
router.put('/attendance-rules', saveAttendanceRules);

router.get('/attendance/daily', getDailyAttendance);
router.get('/attendance/monthly', getMonthlyAll);
router.get('/attendance/export', exportAttendance);
router.get('/attendance/employee/:id', getEmployeeMonthly);
router.post('/attendance/correct', correctAttendance);
router.post('/attendance/:id/correct', correctAttendance);
router.get('/attendance/:id/audit', getAttendanceAudit);

router.get('/task-submissions', listSubmissions);
router.post('/tasks/:id/review', reviewTask);
router.post('/tasks/:id/extensions/:requestId', decideExtension);

router.get('/leaves/current', currentLeaves);
router.post('/leaves/:id/decision', decideLeave);

router.get('/activity', listActivity);

router.get('/admin-access', superOnly, listAdminAccess);
router.put('/admin-access/:id', superOnly, updateAdminAccess);

export default router;

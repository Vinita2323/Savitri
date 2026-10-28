import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getAttendanceRecords,
  checkIn,
  checkOut,
  requestOrApproveCorrection,
  getTasks,
  createTask,
  updateTaskStatus,
  addTaskComment,
  getLeaveRequests,
  submitLeaveRequest,
  reviewLeaveRequest,
  getShifts,
  createShift,
  getHolidays,
  createHoliday,
  getEmployeeDashboardSummary,
} from '../controllers/employeeController.js';

const router = express.Router();

// Role protection for all employee management endpoints
router.use(protect('admin', 'super_admin', 'super-admin'));

// 1. Dashboard Metrics
router.get('/dashboard-summary', getEmployeeDashboardSummary);

// 2. Attendance Tracking
router.get('/attendance/records', getAttendanceRecords);
router.post('/attendance/check-in', checkIn);
router.post('/attendance/check-out', checkOut);
router.patch('/attendance/:id/correction', requestOrApproveCorrection);

// 3. Task Management
router.get('/tasks/all', getTasks);
router.post('/tasks', createTask);
router.patch('/tasks/:id/status', updateTaskStatus);
router.post('/tasks/:id/comments', addTaskComment);

// 4. Leave Management
router.get('/leaves/all', getLeaveRequests);
router.post('/leaves', submitLeaveRequest);
router.patch('/leaves/:id/review', reviewLeaveRequest);

// 5. Shifts & Holidays
router.get('/shifts', getShifts);
router.post('/shifts', createShift);
router.get('/holidays', getHolidays);
router.post('/holidays', createHoliday);

// 6. Employee CRUD
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/status', toggleEmployeeStatus);

export default router;

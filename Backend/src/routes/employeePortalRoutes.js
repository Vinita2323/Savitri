import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { protectEmployee } from '../middleware/employeeAuth.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import {
  getPublicBrands,
  getPublicDepartments,
  getPublicAdmins,
  registerEmployee,
  loginEmployee,
  logoutEmployee,
  checkOutEmployee,
  checkInEmployee,
  getMe,
  updateMe,
  changeMyPassword,
  getDashboard,
  getMyAttendance,
  getMyAttendanceHistory,
  listMyHolidays,
  listMyTasks,
  getMyTask,
  startMyTask,
  updateMyTaskProgress,
  commentOnMyTask,
  submitMyTask,
  requestTaskExtension,
  uploadDocument,
  listMyLeaves,
  applyMyLeave,
  cancelMyLeave,
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/employeePortalController.js';

const router = express.Router();

const MAX_DOC_BYTES = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(process.cwd(), 'uploads', 'employee_docs');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      // Server-generated name: the client's file name is never used on disk.
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname || '').toLowerCase().slice(0, 8)}`);
    },
  }),
  limits: { fileSize: MAX_DOC_BYTES, files: 1 },
});

// ── public ──
router.get('/public/brands', simpleRateLimit({ windowMs: 60_000, max: 60 }), getPublicBrands);
router.get('/public/departments', simpleRateLimit({ windowMs: 60_000, max: 60 }), getPublicDepartments);
router.get('/public/admins', simpleRateLimit({ windowMs: 60_000, max: 60 }), getPublicAdmins);
router.post('/register', simpleRateLimit({ windowMs: 60_000, max: 8 }), registerEmployee);
router.post('/login', simpleRateLimit({ windowMs: 60_000, max: 20 }), loginEmployee);

// ── authenticated employee only: everything below is scoped to req.employee, never to an id in the request ──
router.use(protectEmployee);

router.post('/logout', logoutEmployee);
router.post('/attendance/check-in', checkInEmployee);
router.post('/attendance/check-out', checkOutEmployee);
router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', changeMyPassword);
router.get('/dashboard', getDashboard);

router.get('/attendance', getMyAttendance);
router.get('/attendance/history', getMyAttendanceHistory);
router.get('/holidays', listMyHolidays);

router.get('/tasks', listMyTasks);
router.get('/tasks/:id', getMyTask);
router.post('/tasks/:id/start', startMyTask);
router.patch('/tasks/:id/progress', updateMyTaskProgress);
router.post('/tasks/:id/comments', commentOnMyTask);
router.post('/tasks/:id/submit', submitMyTask);
router.post('/tasks/:id/extension', requestTaskExtension);
router.post(
  '/upload',
  simpleRateLimit({ windowMs: 60_000, max: 20 }),
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10MB).' : 'Upload failed.' });
      }
      return next();
    }),
  uploadDocument
);

router.get('/leaves', listMyLeaves);
router.post('/leaves', applyMyLeave);
router.post('/leaves/:id/cancel', cancelMyLeave);

router.get('/notifications', listMyNotifications);
router.post('/notifications/read-all', markAllNotificationsRead);
router.post('/notifications/:id/read', markNotificationRead);

export default router;

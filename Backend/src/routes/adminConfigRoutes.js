import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import * as service from '../services/adminAccountService.js';

/** Admin Configuration: Super Admin only. Mounted at /api/super-admin/admin-config (not tied to the selected brand). */
const router = express.Router();
router.use(protect('super_admin'));

const actorOf = (req) => ({ id: req.user.id, name: req.user.name || '', email: req.user.email || '' });
const handle = (fn, status = 200) => async (req, res, next) => {
  try {
    return res.status(status).json({ success: true, ...(await fn(req)) });
  } catch (err) {
    if (err instanceof service.AdminConfigError) return res.status(err.status).json({ success: false, message: err.message, ...err.extra });
    return next(err);
  }
};
const writes = simpleRateLimit({ windowMs: 60_000, max: 60 });

router.get('/overview', handle(() => service.overview()));
router.get('/history', handle((req) => service.history(req.query)));
router.get('/admins', handle((req) => service.listAdmins(req.query)));
router.get('/admins/:id', handle(async (req) => ({ admin: await service.getAdmin(req.params.id) })));
router.post('/admins', writes, handle((req) => service.createAdmin(req.body || {}, actorOf(req)), 201));
router.put('/admins/:id', writes, handle(async (req) => ({ admin: await service.updateDetails(req.params.id, req.body || {}) })));
router.put('/admins/:id/brands', writes, handle((req) => service.setBrands(req.params.id, req.body || {}, actorOf(req))));
router.patch('/admins/:id/status', writes, handle(async (req) => ({ admin: await service.setStatus(req.params.id, req.body?.status) })));
router.post('/admins/:id/reset-password', writes, handle((req) => service.resetPassword(req.params.id, req.body || {})));

export default router;

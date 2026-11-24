import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import { cityAdminLogin, cityAdminChangePassword, cityAdminMe } from '../controllers/cityAdminAuthController.js';

const router = express.Router();
router.post('/login', simpleRateLimit({ windowMs: 60_000, max: 20 }), cityAdminLogin);
router.post('/change-password', protect('admin'), simpleRateLimit({ windowMs: 60_000, max: 10 }), cityAdminChangePassword);
router.get('/me', protect('admin'), cityAdminMe);
export default router;

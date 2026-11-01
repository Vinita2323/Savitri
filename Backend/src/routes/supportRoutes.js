import { protect } from '../middleware/authMiddleware.js';
import express from 'express';
import {
  getSupportSettings,
  updateSupportSettings,
} from '../controllers/supportController.js';

const router = express.Router();

router.get('/', getSupportSettings);
router.put('/', protect('admin', 'super_admin'), updateSupportSettings);

export default router;

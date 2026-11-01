import { protect } from '../middleware/authMiddleware.js';
import express from 'express';
import {
  getPublicFaqs,
  getAdminFaqs,
  createFaq,
  updateFaq,
  deleteFaq
} from '../controllers/faqController.js';

const router = express.Router();

// Public routes
router.get('/', getPublicFaqs);

// Admin routes
router.get('/admin', protect('admin', 'super_admin'), getAdminFaqs);
router.post('/', protect('admin', 'super_admin'), createFaq);
router.put('/:id', protect('admin', 'super_admin'), updateFaq);
router.delete('/:id', protect('admin', 'super_admin'), deleteFaq);

export default router;

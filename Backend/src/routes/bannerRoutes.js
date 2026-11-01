import express from 'express';
import { getBanners, createBanner, updateBanner, deleteBanner } from '../controllers/bannerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for User App to get active banners
router.get('/', getBanners);

// Protected routes for Admin CMS to manage banners
router.post('/', protect('admin', 'super_admin'), createBanner);
router.put('/:id', protect('admin', 'super_admin'), updateBanner);
router.delete('/:id', protect('admin', 'super_admin'), deleteBanner);

export default router;

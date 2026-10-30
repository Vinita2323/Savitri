import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  toggleBrandStatus,
  deleteBrand,
} from '../controllers/brandController.js';

const router = express.Router();

// Both admin and super_admin can read authorized brands
router.get('/', protect('admin', 'super_admin'), getAllBrands);
router.get('/:id', protect('admin', 'super_admin'), getBrandById);

// Only super_admin can create, update, or toggle status of brands/regions
router.post('/', protect('super_admin'), createBrand);
router.put('/:id', protect('super_admin'), updateBrand);
router.patch('/:id/status', protect('super_admin'), toggleBrandStatus);
router.delete('/:id', protect('super_admin'), deleteBrand);

export default router;

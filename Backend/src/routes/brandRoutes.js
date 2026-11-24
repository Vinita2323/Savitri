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
import {
  listBrandsWithAdminStatus, getBrandAdmin, createBrandAdmin, updateBrandAdmin, resetBrandAdminPassword, setBrandAdminStatus, setBrandAdminPermissions, reassignBrandAdmin, listAssignableAdmins,
} from '../controllers/cityAdminController.js';

const router = express.Router();

// City Admin management: Super Admin only. Static paths first so they are not read as a brand id.
router.get('/admin-status', protect('super_admin'), listBrandsWithAdminStatus);
router.get('/assignable-admins', protect('super_admin'), listAssignableAdmins);

// Both admin and super_admin can read authorized brands
router.get('/', protect('admin', 'super_admin'), getAllBrands);
router.get('/:id', protect('admin', 'super_admin'), getBrandById);

// Only super_admin can create, update, or toggle status of brands/regions
router.post('/', protect('super_admin'), createBrand);
router.put('/:id', protect('super_admin'), updateBrand);
router.patch('/:id/status', protect('super_admin'), toggleBrandStatus);
router.delete('/:id', protect('super_admin'), deleteBrand);

router.get('/:id/admin', protect('super_admin'), getBrandAdmin);
router.post('/:id/admin', protect('super_admin'), createBrandAdmin);
router.put('/:id/admin', protect('super_admin'), updateBrandAdmin);
router.post('/:id/admin/reset-password', protect('super_admin'), resetBrandAdminPassword);
router.patch('/:id/admin/status', protect('super_admin'), setBrandAdminStatus);
router.put('/:id/admin/permissions', protect('super_admin'), setBrandAdminPermissions);
router.post('/:id/admin/reassign', protect('super_admin'), reassignBrandAdmin);

export default router;

import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to fetch all categories
router.get('/', getCategories);

// Protected routes for Admin to manage categories
router.post('/', protect('admin', 'super_admin'), createCategory);
router.put('/:id', protect('admin', 'super_admin'), updateCategory);
router.delete('/:id', protect('admin', 'super_admin'), deleteCategory);

export default router;

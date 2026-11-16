import { protect } from '../middleware/authMiddleware.js';
import { scopeUnlessSeller } from '../utils/accessControl.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  moderateProduct,
  bulkUpdateMyProducts
} from '../controllers/productController.js';

const router = express.Router();
const writeAuth = [protect('seller', 'admin', 'super_admin'), scopeUnlessSeller];

// Seller: change price / stock / status of many of their own products at once (before /:id)
router.post('/bulk-update', protect('seller'), bulkUpdateMyProducts);

router.route('/')
  .post(...writeAuth, createProduct)
  .get(optionalAuth, getProducts);

// Admin / Super Admin: deactivate, activate, block or unblock a product (brand scoped)
router.patch('/:id/moderation', protect('admin', 'super_admin'), scopeUnlessSeller, moderateProduct);

router.route('/:id')
  .get(optionalAuth, getProductById)
  .put(...writeAuth, updateProduct)
  .delete(...writeAuth, deleteProduct);

export default router;

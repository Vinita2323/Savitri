import { protect } from '../middleware/authMiddleware.js';
import { scopeUnlessSeller } from '../utils/accessControl.js';
import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';

const router = express.Router();
const writeAuth = [protect('seller', 'admin', 'super_admin'), scopeUnlessSeller];

router.route('/')
  .post(...writeAuth, createProduct)
  .get(getProducts);

router.route('/:id')
  .get(getProductById)
  .put(...writeAuth, updateProduct)
  .delete(...writeAuth, deleteProduct);

export default router;

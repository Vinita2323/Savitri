import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { scopeUnlessSeller } from '../utils/accessControl.js';
import {
  getMyPickupAddress,
  upsertMyPickupAddress,
  getMyShippingConfig,
  getSellerPickupAddressForAdmin,
} from '../controllers/sellerShippingController.js';

const router = express.Router();

// Seller (own data only; identity from the token)
router.get('/seller/pickup-address', protect('seller'), getMyPickupAddress);
router.put('/seller/pickup-address', protect('seller'), upsertMyPickupAddress);
router.get('/seller/config', protect('seller'), getMyShippingConfig);

// Admin / Super Admin: read-only, brand scoped
router.get('/admin/sellers/:sellerId/pickup-address', protect('admin', 'super_admin'), scopeUnlessSeller, getSellerPickupAddressForAdmin);

export default router;

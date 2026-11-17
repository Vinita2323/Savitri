import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { scopeUnlessSeller } from '../utils/accessControl.js';
import { getFulfillmentOptions, getOrderFulfillments, getSellerFulfillments, getAdminFulfillments } from '../controllers/fulfillmentController.js';

const router = express.Router();

router.get('/options', protect('user'), getFulfillmentOptions);
router.get('/seller/orders', protect('seller'), getSellerFulfillments);
router.get('/admin/orders', protect('admin', 'super_admin'), scopeUnlessSeller, getAdminFulfillments);
router.get('/order/:orderId', protect('user', 'seller', 'admin', 'super_admin'), scopeUnlessSeller, getOrderFulfillments);

export default router;

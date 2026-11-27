import { scopeRestrictedAdmin } from '../utils/restrictedAdmin.js';
import { guardSellerFeePayment } from '../middleware/brandRecordGuards.js';
import express from 'express';
import {
  getPublicFeeConfig,
  initiateRegistrationFeeOrder,
  verifyRegistrationFeePayment,
  retryRegistrationFeeOrder,
  handleRegistrationFeeWebhook,
  adminGetFeeConfig,
  adminUpdateFeeConfig,
  adminGetFeePayments,
  adminGetFeePaymentById,
} from '../controllers/sellerRegistrationFeeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ----------------------------------------------------------------------------
// Public & Seller Registration Fee Routes
// ----------------------------------------------------------------------------
router.get('/config', getPublicFeeConfig);
router.post('/initiate-order', initiateRegistrationFeeOrder);
router.post('/verify-payment', verifyRegistrationFeePayment);
router.post('/retry-order', retryRegistrationFeeOrder);
router.post('/webhook', handleRegistrationFeeWebhook);

// ----------------------------------------------------------------------------
// Admin Management Routes (Protected by role='admin')
// ----------------------------------------------------------------------------
router.get('/admin', protect('admin', 'super_admin'), adminGetFeeConfig);
router.put('/admin', protect('admin', 'super_admin'), adminUpdateFeeConfig);
router.get('/admin/payments', protect('admin', 'super_admin'), scopeRestrictedAdmin, adminGetFeePayments);
router.get('/admin/payments/:id', protect('admin', 'super_admin'), scopeRestrictedAdmin, guardSellerFeePayment, adminGetFeePaymentById);

export default router;

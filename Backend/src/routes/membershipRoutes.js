import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getSellerPlans, getCaptainPlans,
  getSellerMembership, getCaptainMembership,
  getSellerMembershipHistory, getCaptainMembershipHistory,
  purchaseSellerMembership, purchaseCaptainMembership,
  renewSellerMembership, renewCaptainMembership,
  adminGetSellerPlans, adminGetCaptainPlans,
  adminCreateSellerPlan, adminCreateCaptainPlan,
  adminUpdateSellerPlan, adminUpdateCaptainPlan,
  adminToggleSellerPlan, adminToggleCaptainPlan,
  adminDeleteSellerPlan, adminDeleteCaptainPlan,
  adminGetSellerSubscriptions, adminGetCaptainSubscriptions,
  adminConfirmSellerPayment, adminConfirmCaptainPayment,
  adminCheckExpiry, adminGetSellerMembershipStats, adminGetCaptainMembershipStats,
  createRazorpayOrder,
} from '../controllers/membershipController.js';

const router = express.Router();

router.get('/seller/plans', getSellerPlans);
router.get('/captain/plans', getCaptainPlans);
router.post('/razorpay/create-order', createRazorpayOrder);

router.get('/seller/current', protect('seller'), getSellerMembership);
router.get('/seller/history', protect('seller'), getSellerMembershipHistory);
router.post('/seller/purchase', protect('seller'), purchaseSellerMembership);
router.post('/seller/renew', protect('seller'), renewSellerMembership);
router.get('/captain/current', protect('captain'), getCaptainMembership);
router.get('/captain/history', protect('captain'), getCaptainMembershipHistory);
router.post('/captain/purchase', protect('captain'), purchaseCaptainMembership);
router.post('/captain/renew', protect('captain'), renewCaptainMembership);
router.get('/admin/seller/plans', protect('admin', 'super_admin'), adminGetSellerPlans);
router.post('/admin/seller/plans', protect('admin', 'super_admin'), adminCreateSellerPlan);
router.put('/admin/seller/plans/:id', protect('admin', 'super_admin'), adminUpdateSellerPlan);
router.put('/admin/seller/plans/:id/toggle', protect('admin', 'super_admin'), adminToggleSellerPlan);
router.delete('/admin/seller/plans/:id', protect('admin', 'super_admin'), adminDeleteSellerPlan);
router.get('/admin/captain/plans', protect('admin', 'super_admin'), adminGetCaptainPlans);
router.post('/admin/captain/plans', protect('admin', 'super_admin'), adminCreateCaptainPlan);
router.put('/admin/captain/plans/:id', protect('admin', 'super_admin'), adminUpdateCaptainPlan);
router.put('/admin/captain/plans/:id/toggle', protect('admin', 'super_admin'), adminToggleCaptainPlan);
router.delete('/admin/captain/plans/:id', protect('admin', 'super_admin'), adminDeleteCaptainPlan);
router.get('/admin/seller/subscriptions', protect('admin', 'super_admin'), adminGetSellerSubscriptions);
router.get('/admin/captain/subscriptions', protect('admin', 'super_admin'), adminGetCaptainSubscriptions);
router.put('/admin/seller/subscriptions/:id/confirm-payment', protect('super_admin'), adminConfirmSellerPayment);
router.put('/admin/captain/subscriptions/:id/confirm-payment', protect('super_admin'), adminConfirmCaptainPayment);
router.get('/admin/seller/stats', protect('admin', 'super_admin'), adminGetSellerMembershipStats);
router.get('/admin/captain/stats', protect('admin', 'super_admin'), adminGetCaptainMembershipStats);
router.post('/admin/check-expiry', protect('admin', 'super_admin'), adminCheckExpiry);

export default router;

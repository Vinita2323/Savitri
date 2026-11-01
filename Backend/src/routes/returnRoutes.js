import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { scopeUnlessSeller } from '../utils/accessControl.js';
import {
  requestItemReturn,
  getMyReturns,
  getReturnById,
  cancelReturnRequest,
  getSellerReturns,
  approveOrRejectReturn,
  getCaptainReturnJobs,
  captainAcceptReturnJob,
  captainUpdateReturnStatus,
  captainVerifyReturnOtp,
  captainFailReturnInspection,
  sellerReceiveReturnedProduct,
  verifyReturnedProduct,
  getAdminReturns,
  adminAssignCaptain,
} from '../controllers/returnController.js';

const router = express.Router();

// ── Customer Routes ──
router.post('/', protect('user'), requestItemReturn);
router.get('/my-returns', protect('user'), getMyReturns);
router.put('/:id/cancel', protect('user'), cancelReturnRequest);

// ── Seller Routes ──
router.get('/seller/returns', protect('seller'), getSellerReturns);
router.put('/:id/seller-approve', protect('seller'), approveOrRejectReturn);
router.put('/:id/seller-receive', protect('seller'), sellerReceiveReturnedProduct);
router.put('/:id/seller-verify', protect('seller'), verifyReturnedProduct);

// ── Captain Routes ──
router.get('/captain/jobs', protect('captain'), getCaptainReturnJobs);
router.put('/captain/:id/accept', protect('captain'), captainAcceptReturnJob);
router.put('/captain/:id/status', protect('captain'), captainUpdateReturnStatus);
router.post('/captain/:id/verify-otp', protect('captain'), captainVerifyReturnOtp);
router.put('/captain/:id/fail-inspection', protect('captain'), captainFailReturnInspection);

// ── Admin Routes ──
router.get('/admin/all', protect('admin', 'super_admin'), scopeUnlessSeller, getAdminReturns);
router.put('/admin/:id/approve', protect('admin', 'super_admin'), scopeUnlessSeller, approveOrRejectReturn);
router.put('/admin/:id/assign-captain', protect('admin', 'super_admin'), scopeUnlessSeller, adminAssignCaptain);
router.put('/admin/:id/verify', protect('admin', 'super_admin'), scopeUnlessSeller, verifyReturnedProduct);

// ── Common Return Detail (Role authorized inside controller) ──
router.get('/:id', protect('user', 'seller', 'captain', 'admin', 'super_admin'), scopeUnlessSeller, getReturnById);

export default router;

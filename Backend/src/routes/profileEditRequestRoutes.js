import { scopeRestrictedAdmin } from '../utils/restrictedAdmin.js';
import { guardEditRequest } from '../middleware/brandRecordGuards.js';
import express from 'express';
import {
  submitEditRequest,
  getMyPendingEditRequest,
  getAllEditRequests,
  getEditRequestById,
  approveEditRequest,
  rejectEditRequest,
} from '../controllers/profileEditRequestController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
// Reviewing edit requests is staff work: admins only, and a brand-restricted admin only for their own brand
const staff = [protect('admin', 'super_admin'), scopeRestrictedAdmin];

// Requester endpoints (User, Seller, Captain)
router.post('/submit', protect(), submitEditRequest);
router.get('/my-pending', protect(), getMyPendingEditRequest);

// Admin endpoints (List, Review, Approve, Reject)
router.get('/admin', ...staff, getAllEditRequests);
router.get('/admin/:id', ...staff, guardEditRequest, getEditRequestById);
router.put('/admin/:id/approve', ...staff, guardEditRequest, approveEditRequest);
router.put('/admin/:id/reject', ...staff, guardEditRequest, rejectEditRequest);

export default router;

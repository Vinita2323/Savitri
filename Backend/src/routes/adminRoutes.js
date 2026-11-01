import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import {
  getDashboardStats,
  getAllUsers,
  toggleUserBlock,
  getAllSellers,
  toggleSellerStatus,
  deleteSeller,
  updateSellerCommission,
  updateSellerDetails,
  getAllCaptains,
  toggleCaptainStatus,
  deleteCaptain,
  updateCaptainDetails,
  getAvailableCaptains,
  assignCaptainToOrder,
  getAdminOrders,
  updateAdminOrderStatus,
  getUserOrdersForAdmin,
  updateReturnOrderStatus,
  getCaptainCashSettlements,
  processCaptainCashSettlement,
} from '../controllers/adminController.js';
import { getAdminProfile, updateAdminProfile } from '../controllers/adminAuthController.js';

const router = express.Router();

// Admin Profile
router.get('/profile', protect('admin', 'super_admin'), getAdminProfile);
router.put('/profile', protect('admin', 'super_admin'), updateAdminProfile);


// Everything below requires an authenticated, active admin / super admin, and every
// request is resolved to a validated brand scope (defaults to ALL only for users
// authorised for all brands). Admin profile routes above are brand-independent.
// (Limited to this router's own prefixes: /api/admin/commission-* is served by commissionRoutes.)
const ADMIN_PREFIXES = ['/dashboard', '/users', '/sellers', '/captains', '/orders', '/captain-cash-settlements'];
router.use(ADMIN_PREFIXES, protect('admin', 'super_admin'), resolveBrandScope);

// Live Dashboard Stats
router.get('/dashboard/stats', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId/orders', getUserOrdersForAdmin);
router.put('/users/:id/block', toggleUserBlock);
router.put('/users/:id/status', toggleUserBlock);

// Seller Management
router.get('/sellers', getAllSellers);
router.put('/sellers/:id/status', toggleSellerStatus);
router.put('/sellers/:id/details', updateSellerDetails);
router.delete('/sellers/:id', deleteSeller);
// Seller Commission Updates
// Commission rates are a privileged financial setting: Super Admin only (admins use the read-only views).
router.put('/sellers/:id/commission', protect('super_admin'), updateSellerCommission);

// Captain Management
router.get('/captains', getAllCaptains);
router.put('/captains/:id/status', toggleCaptainStatus);
router.put('/captains/:id/details', updateCaptainDetails);
router.delete('/captains/:id', deleteCaptain);
router.get('/captains/available', getAvailableCaptains);

// Order Management (Admin)
router.get('/orders', getAdminOrders);
router.put('/orders/:orderId/status', updateAdminOrderStatus);
router.put('/orders/:orderId/assign-captain', assignCaptainToOrder);
router.put('/orders/:orderId/return-status', updateReturnOrderStatus);

// Captain COD Cash Settlements (Admin)
router.get('/captain-cash-settlements', getCaptainCashSettlements);
router.put('/captain-cash-settlements/:id', processCaptainCashSettlement);

export default router;


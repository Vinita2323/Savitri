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
import { setSellerCommission, resetSellerCommission, getSellerCommissionHistory } from '../controllers/sellerCommissionController.js';
import { getAdminProfile, updateAdminProfile } from '../controllers/adminAuthController.js';
import { getMyBrands } from '../controllers/myBrandsController.js';
import { listMyDocuments, addMyDocument, updateMyDocument, deleteMyDocument, downloadMyDocument, uploadMiddleware } from '../controllers/adminDocumentController.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';

const router = express.Router();

// Admin Profile
router.get('/profile', protect('admin', 'super_admin'), getAdminProfile);
router.put('/profile', protect('admin', 'super_admin'), updateAdminProfile);

// The brands the signed-in admin may work with (drives the brand switcher of the Admin panel)
router.get('/my-brands', protect('admin', 'super_admin'), getMyBrands);

// "Your documents": the signed-in admin's own private documents (never visible to anyone else)
const docGuard = protect('admin', 'super_admin');
router.get('/documents', docGuard, listMyDocuments);
router.post('/documents', docGuard, simpleRateLimit({ windowMs: 60_000, max: 20 }), uploadMiddleware, addMyDocument);
router.put('/documents/:id', docGuard, simpleRateLimit({ windowMs: 60_000, max: 30 }), uploadMiddleware, updateMyDocument);
router.delete('/documents/:id', docGuard, deleteMyDocument);
router.get('/documents/:id/file', docGuard, downloadMyDocument);


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
// Seller commission management - Admin and Super Admin, brand-scoped, always audited.
router.put('/sellers/:id/commission', setSellerCommission);
router.post('/sellers/:id/commission/reset', resetSellerCommission);
router.get('/sellers/:id/commission/history', getSellerCommissionHistory);

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


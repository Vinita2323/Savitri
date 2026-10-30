import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getPosStores,
  getPosProducts,
  searchPosCustomers,
  createPosCustomer,
  calculatePosBill,
  completeCounterSale,
  createPosDeliveryOrder,
  saveHeldBill,
  getHeldBills,
  deleteHeldBill,
  getPosHistory,
  getPosDashboardSummary,
} from '../controllers/posController.js';

import { resolveBrandScope } from '../middleware/scopeMiddleware.js';

const router = express.Router();

// Protect: Super Admin and Admin only
router.use(protect('admin', 'super_admin', 'super-admin'));
router.use(resolveBrandScope);

// Store & Inventory
router.get('/stores', getPosStores);
router.get('/products', getPosProducts);

// Customer management
router.get('/customers', searchPosCustomers);
router.post('/customers', createPosCustomer);

// Server-side calculation & validation
router.post('/calculate', calculatePosBill);

// Transactions
router.post('/counter-sale', completeCounterSale);
router.post('/delivery-order', createPosDeliveryOrder);

// Held Bills & Drafts
router.get('/hold', getHeldBills);
router.post('/hold', saveHeldBill);
router.delete('/hold/:id', deleteHeldBill);

// Reports & Audit History
router.get('/history', getPosHistory);
router.get('/dashboard-summary', getPosDashboardSummary);

export default router;

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNextChallanNumber,
  getClients,
  getEligibleOrdersByClient,
  getOrderDispatchSummary,
  getDeliveryChallans,
  getDeliveryChallanById,
  createDeliveryChallan,
  updateDeliveryChallan,
  finalizeDeliveryChallan,
  updateDeliveryStatus,
  cancelDeliveryChallan,
} from '../controllers/deliveryChallanController.js';

const router = express.Router();

// Apply admin and super-admin authentication to all delivery challan routes
router.use(protect('admin', 'super_admin', 'super-admin'));

// Helper / Lookup endpoints
router.get('/next-number', getNextChallanNumber);
router.get('/clients', getClients);
router.get('/clients/:clientId/eligible-orders', getEligibleOrdersByClient);
router.get('/orders/:orderId/dispatch-summary', getOrderDispatchSummary);

// Primary CRUD & Listing endpoints
router.get('/', getDeliveryChallans);
router.post('/', createDeliveryChallan);
router.get('/:id', getDeliveryChallanById);
router.put('/:id', updateDeliveryChallan);

// State transitions & Workflow endpoints
router.post('/:id/finalize', finalizeDeliveryChallan);
router.post('/:id/status', updateDeliveryStatus);
router.post('/:id/cancel', cancelDeliveryChallan);

export default router;

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { scopeUnlessSeller } from '../utils/accessControl.js';
import {
  getStatus, postServiceability, getFulfillmentCourier, postPackage, postQuote, postShipment, postPickup, getLabel, postSimulate,
} from '../controllers/courierController.js';

const router = express.Router();
const staff = [protect('seller', 'admin', 'super_admin'), scopeUnlessSeller];

router.get('/status', protect('seller', 'admin', 'super_admin'), getStatus);
router.post('/serviceability', protect('seller', 'admin', 'super_admin'), postServiceability);
router.get('/fulfillment/:id', ...staff, getFulfillmentCourier);
router.post('/fulfillment/:id/package', ...staff, postPackage);
router.post('/fulfillment/:id/quote', ...staff, postQuote);
router.post('/fulfillment/:id/shipment', ...staff, postShipment);
router.post('/fulfillment/:id/pickup', ...staff, postPickup);
router.get('/fulfillment/:id/label', ...staff, getLabel);
router.post('/fulfillment/:id/simulate', protect('admin', 'super_admin'), scopeUnlessSeller, postSimulate);

export default router;

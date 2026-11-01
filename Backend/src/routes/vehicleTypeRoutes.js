import { protect } from '../middleware/authMiddleware.js';
import express from 'express';
import {
  getActiveVehicles,
  getVehicleById,
  getAllVehiclesAdmin,
  createVehicleType,
  updateVehiclePricing,
  deleteVehicleType,
} from '../controllers/vehicleTypeController.js';

const router = express.Router();

// GET /api/transport/vehicles        — list all active vehicle types (public)
router.get('/', getActiveVehicles);

// GET /api/transport/vehicles/admin/all — list all vehicle types including inactive
router.get('/admin/all', protect('admin', 'super_admin'), getAllVehiclesAdmin);

// POST /api/transport/vehicles       — create new vehicle type
router.post('/', protect('admin', 'super_admin'), createVehicleType);

// GET /api/transport/vehicles/:id    — get single vehicle type (public)
router.get('/:id', getVehicleById);

// PUT /api/transport/vehicles/:id    — update vehicle type
router.put('/:id', protect('admin', 'super_admin'), updateVehiclePricing);

// DELETE /api/transport/vehicles/:id — delete vehicle type
router.delete('/:id', protect('admin', 'super_admin'), deleteVehicleType);

export default router;

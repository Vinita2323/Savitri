/**
 * Quotation Routes
 * Mounted at: /api/quotations
 *
 * All routes require admin or super-admin authentication via JWT.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendQuotationEmailHandler } from '../controllers/quotationController.js';

const router = express.Router();

/**
 * POST /api/quotations/send-email
 * Send a quotation email to the client.
 * Requires: admin or super-admin role.
 */
router.post(
  '/send-email',
  protect('admin', 'super-admin'),
  sendQuotationEmailHandler
);

export default router;

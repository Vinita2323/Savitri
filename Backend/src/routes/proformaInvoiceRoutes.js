import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNextProformaNumberHandler,
  getClientsHandler,
  getProductsHandler,
  getProformaInvoices,
  getProformaInvoiceById,
  createProformaInvoice,
  updateProformaInvoice,
  sendProformaEmailHandler,
  recordConfirmationHandler,
  recordPaymentHandler,
  cancelProformaInvoiceHandler,
  duplicateProformaInvoiceHandler,
  convertToInvoiceHandler,
} from '../controllers/proformaInvoiceController.js';

import { resolveBrandScope } from '../middleware/scopeMiddleware.js';

const router = express.Router();

// Require admin or super-admin role for all Proforma Invoice operations
router.use(protect('admin', 'super_admin', 'super-admin'));
router.use(resolveBrandScope);

// Helper lookups
router.get('/next-number', getNextProformaNumberHandler);
router.get('/clients', getClientsHandler);
router.get('/products', getProductsHandler);

// Core CRUD
router.get('/', getProformaInvoices);
router.post('/', createProformaInvoice);
router.get('/:id', getProformaInvoiceById);
router.put('/:id', updateProformaInvoice);

// Workflow Actions
router.post('/:id/send-email', sendProformaEmailHandler);
router.post('/:id/record-confirmation', recordConfirmationHandler);
router.post('/:id/record-payment', recordPaymentHandler);
router.post('/:id/cancel', cancelProformaInvoiceHandler);
router.post('/:id/duplicate', duplicateProformaInvoiceHandler);
router.post('/:id/convert-to-invoice', convertToInvoiceHandler);

export default router;

/**
 * Quotation Routes — mounted at /api/quotations
 * Every route requires an active admin / super admin and is resolved to a validated brand scope.
 * ('/requests' and '/send-email' are declared before '/:ref' so they are not captured by it.)
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import {
  listQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  markReady,
  cancelQuotation,
  convertQuotation,
  setQuotationStatus,
  duplicateQuotation,
  sendQuotationEmailHandler,
  listRequests,
  createRequest,
  setRequestStatus,
  rejectRequest,
} from '../controllers/quotationController.js';

const router = express.Router();

router.use(protect('admin', 'super_admin'), resolveBrandScope);

router.post('/send-email', sendQuotationEmailHandler);

router.get('/requests', listRequests);
router.post('/requests', createRequest);
router.patch('/requests/:ref/status', setRequestStatus);
router.post('/requests/:ref/reject', rejectRequest);

router.get('/', listQuotations);
router.post('/', createQuotation);
router.get('/:ref', getQuotation);
router.put('/:ref', updateQuotation);
router.delete('/:ref', deleteQuotation);
router.patch('/:ref/status', setQuotationStatus);
router.post('/:ref/ready', markReady);
router.post('/:ref/cancel', cancelQuotation);
router.post('/:ref/convert', convertQuotation);
router.post('/:ref/duplicate', duplicateQuotation);

export default router;

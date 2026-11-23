import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import * as c from '../controllers/payrollController.js';

const router = express.Router();

// Every endpoint: authenticated Admin or Super Admin, brand scope resolved and enforced (an Admin only reaches their own brand's employees).
router.use(protect('admin', 'super_admin'));
router.use(resolveBrandScope);
router.use((req, res, next) => {
  if (req.scope && !req.scope.isAll) {
    Object.defineProperty(req, 'query', { value: { ...req.query, brandId: req.scope.brandId }, writable: true, configurable: true });
    if (req.body && typeof req.body === 'object') req.body.brandId = req.scope.brandId;
  }
  next();
});

router.get('/policy', c.getPolicyH);
router.put('/policy', c.savePolicyH); // Super Admin only (checked in the handler)

router.get('/dashboard', c.dashboardH);
router.get('/next-period', c.suggestPeriodH);

router.get('/salary', c.listSalaryH);
router.get('/salary/:employeeId', c.getSalaryH);
router.put('/salary/:employeeId', c.saveSalaryH);

router.get('/adjustments', c.listAdjustmentsH);
router.post('/adjustments', c.createAdjustmentH);
router.post('/adjustments/:id/cancel', c.cancelAdjustmentH);

router.post('/payrolls/preview', c.previewH);
router.post('/payrolls/generate', c.generateH);
router.get('/payrolls', c.listPayrollsH);
router.get('/payrolls/:id', c.getPayrollH);
router.post('/payrolls/:id/recalculate', c.recalcH);
router.put('/payrolls/:id/overtime', c.overtimeH);
router.post('/payrolls/:id/adjustments', c.addAdjH);
router.delete('/payrolls/:id/adjustments/:adjId', c.removeAdjH);
router.post('/payrolls/:id/submit', c.submitH);
router.post('/payrolls/:id/approve', c.approveH);
router.post('/payrolls/:id/reject', c.rejectH);
router.post('/payrolls/:id/cancel', c.cancelH);
router.post('/payrolls/:id/payments', c.recordPaymentH);
router.get('/payrolls/:id/slip', c.slipH);

router.get('/payments', c.listPaymentsH);
router.post('/payments/:paymentId/reverse', c.reversePaymentH); // Super Admin only (checked in the service)

router.get('/reports/:type', c.reportH);
router.get('/audit', c.auditH); // Super Admin only

export default router;

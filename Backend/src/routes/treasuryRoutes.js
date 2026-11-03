import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import * as t from '../controllers/treasuryController.js';

const router = express.Router();

// Admin and Super Admin only. Every request is resolved to a validated brand scope first;
// an admin is confined to their assigned brand, a Super Admin may pick a brand or All Regions.
router.use(protect('admin', 'super_admin'));
router.use(resolveBrandScope);
const superOnly = protect('super_admin');

// Dashboard & exports
router.get('/dashboard', t.getDashboard);
router.get('/export/transactions', t.exportTransactions);
router.get('/export/settlements', t.exportSettlements);

// Accounts
router.get('/accounts', t.listAccounts);
router.post('/accounts', t.createAccount);
router.put('/accounts/:id', t.updateAccount);
router.patch('/accounts/:id/status', t.setAccountStatus);
router.get('/accounts/:id/transactions', t.getAccountTransactions);

// Journal (double-entry book)
router.get('/journal', t.listJournal);
router.post('/journal/manual', t.addReduceMoney);
router.post('/journal/transfer', t.transferMoney);
router.post('/journal/:id/reverse', t.reverseJournalEntry);

// Unlinked transactions / bank statement lines
router.get('/unlinked', t.listUnlinked);
router.post('/unlinked', t.addUnlinked);
router.post('/unlinked/import', t.importUnlinked);
router.post('/unlinked/:id/link', t.linkUnlinked);
router.post('/unlinked/:id/ignore', t.ignoreUnlinked);

// Razorpay: payments, settlements, reconciliation, refunds
router.get('/razorpay/payments', t.listGatewayPayments);
router.get('/razorpay/settlements', t.listSettlements);
router.get('/razorpay/settlements/:id', t.getSettlement);
router.post('/razorpay/settlements/sync', superOnly, t.syncRazorpaySettlements);
router.post('/razorpay/settlements/:id/post', superOnly, t.postRazorpaySettlement);
router.post('/razorpay/settlements/:id/match', t.matchRazorpaySettlement);
router.post('/razorpay/settlements/:id/unmatch', t.unmatchRazorpaySettlement);
router.get('/razorpay/reconciliation', t.getReconciliation);
router.post('/razorpay/reconciliation/auto', t.autoReconcileRazorpay);
router.post('/razorpay/refunds/:id/sync', t.syncGatewayRefund);
router.post('/razorpay/backfill', superOnly, t.backfillCaptures);

export default router;

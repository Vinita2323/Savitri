import mongoose from 'mongoose';
import AdminPurchase from '../models/AdminPurchase.model.js';
import { markRestrictedAdmin } from '../utils/restrictedAdmin.js';
import { isBrandAuthorizedForUser } from '../middleware/scopeMiddleware.js';
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import * as c from '../controllers/adminPurchaseController.js';

const router = express.Router();

// Admin or Super Admin only. The brand scope is resolved from the verified token and database;
// an admin id or seller id in the request is never trusted.
router.use(protect('admin', 'super_admin'));
router.use(resolveBrandScope);
router.use(markRestrictedAdmin);
// one own purchase by id: a restricted admin only while its brand is still assigned to them
const ownBrandPurchase = async (req, res, next) => {
  try {
    if (!req.restricted || !mongoose.Types.ObjectId.isValid(req.params.id)) return next();
    const p = await AdminPurchase.findById(req.params.id).select('brandId').lean();
    if (p?.brandId && !(await isBrandAuthorizedForUser(req.user, p.brandId))) return res.status(404).json({ success: false, message: 'Purchase not found.' });
    return next();
  } catch (e) { return next(e); }
};
router.use(async (req, res, next) => { try { await c.ensurePurchaseIndexes(); next(); } catch (e) { next(e); } });

// My store (the signed-in admin's own purchases)
router.get('/dashboard', c.adminPurchaseDashboard);
router.get('/products', c.listEligibleProducts);
router.post('/products', simpleRateLimit({ windowMs: 60_000, max: 30 }), c.quickAddProduct);
router.get('/stock-updates', c.listStockUpdates);
router.post('/invoice', simpleRateLimit({ windowMs: 60_000, max: 30 }), c.invoiceUploadMiddleware, c.uploadInvoice);

// Associated sellers: READ ONLY (there is deliberately no write route here)
router.get('/sellers', c.listAssociatedSellers);
router.get('/sellers/purchases', c.listAssociatedSellerPurchases);
router.get('/sellers/purchases/:id', c.getAssociatedSellerPurchase);
router.get('/sellers/summary', c.sellerWiseSummary);

// Super Admin: every admin's purchases
router.get('/all', c.superListAdminPurchases);
router.get('/all/:id', c.superGetAdminPurchase);

router.get('/', c.listMyAdminPurchases);
router.post('/', simpleRateLimit({ windowMs: 60_000, max: 60 }), c.createAdminPurchase);
router.get('/:id', ownBrandPurchase, c.getAdminPurchase);
router.put('/:id/cancel', simpleRateLimit({ windowMs: 60_000, max: 60 }), ownBrandPurchase, c.cancelAdminPurchase);
router.get('/:id/invoice', ownBrandPurchase, c.downloadInvoice);

export default router;

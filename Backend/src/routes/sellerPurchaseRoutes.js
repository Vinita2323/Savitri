import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import {
  createSellerPurchase,
  listMySellerPurchases,
  cancelSellerPurchase,
  uploadPurchaseInvoice,
  setPurchaseInvoice,
  INVOICE_DIR,
  INVOICE_EXT,
  INVOICE_MAX_BYTES,
} from '../controllers/sellerPurchaseController.js';

const router = express.Router();

// Invoice files: stored with the seller id + a random name (never the client's file name).
const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
    cb(null, INVOICE_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.jpeg' ? '.jpg' : ext;
    cb(null, `${String(req.user.id)}-${crypto.randomBytes(12).toString('hex')}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: INVOICE_MAX_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (INVOICE_EXT[path.extname(file.originalname || '').toLowerCase()]) return cb(null, true);
    return cb(new Error('Only PDF, JPG, PNG or WEBP files can be attached.'));
  },
});
const runInvoiceUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The file is too large. The maximum size is 5 MB.' : err.message || 'File upload failed.';
    return res.status(400).json({ success: false, message });
  });
};

// Everything here belongs to the signed-in seller; the super admin reads purchases through /api/super-admin/seller-purchases.
router.use(protect('seller'));
router.get('/', listMySellerPurchases);
router.post('/', simpleRateLimit({ windowMs: 60_000, max: 60 }), createSellerPurchase);
router.post('/invoice', simpleRateLimit({ windowMs: 60_000, max: 30 }), runInvoiceUpload, uploadPurchaseInvoice);
router.put('/:id/invoice', simpleRateLimit({ windowMs: 60_000, max: 60 }), setPurchaseInvoice);
router.put('/:id/cancel', simpleRateLimit({ windowMs: 60_000, max: 60 }), cancelSellerPurchase);

export default router;

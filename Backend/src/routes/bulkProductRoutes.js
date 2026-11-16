import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { resolveBrandScope } from '../middleware/scopeMiddleware.js';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import { LIMITS } from '../services/bulkProducts/constants.js';
import {
  stagingDestination,
  stagingFilename,
  downloadTemplate,
  uploadBulk,
  getImportStatus,
  getImportRows,
  startImport,
  listMyImports,
  discardImport,
  downloadFailedRows,
  adminListImports,
  adminGetImport,
  adminDownloadReport,
} from '../controllers/bulkProductController.js';

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({ destination: stagingDestination, filename: stagingFilename }),
  limits: { fileSize: LIMITS.maxZipBytes, files: 2, fields: 5 },
}).fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 1 }]);

const runUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'A file is too large (images ZIP up to 150 MB, product sheet up to 10 MB).' : 'The upload failed. Please try again.' });
  });

// ── admin (any brand-scoped Admin or Super Admin) ──
router.get('/admin/list', protect('admin', 'super_admin'), resolveBrandScope, adminListImports);
router.get('/admin/:id/report', protect('admin', 'super_admin'), resolveBrandScope, adminDownloadReport);
router.get('/admin/:id', protect('admin', 'super_admin'), resolveBrandScope, adminGetImport);

// ── seller: the seller id is always the authenticated user, never a request value ──
router.use(protect('seller'));
router.get('/template', downloadTemplate);
router.get('/', listMyImports);
router.post('/', simpleRateLimit({ windowMs: 60_000, max: 12 }), runUpload, uploadBulk);
router.get('/:id', getImportStatus);
router.get('/:id/rows', getImportRows);
router.get('/:id/failed', downloadFailedRows);
router.post('/:id/import', simpleRateLimit({ windowMs: 60_000, max: 12 }), startImport);
router.delete('/:id', discardImport);

export default router;

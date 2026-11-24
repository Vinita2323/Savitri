import express from 'express';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import { serveSelfieFile } from '../controllers/employeeSelfieController.js';

const router = express.Router();

// Selfie images are private. This route only answers for a short-lived signed link that an
// already-authorised endpoint (the employee themselves, or an admin in scope) handed out.
router.get('/:id', simpleRateLimit({ windowMs: 60_000, max: 600 }), serveSelfieFile);

export default router;

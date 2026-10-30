import express from 'express';
import { simpleRateLimit } from '../middleware/simpleRateLimit.js';
import { getRegistrationCities, getEligibleBrands } from '../controllers/brandController.js';

const router = express.Router();

// Public (pre-registration) brand discovery. Returns only public-safe brand fields.
const limiter = simpleRateLimit({ windowMs: 60_000, max: 30 });

router.get('/cities', limiter, getRegistrationCities);
router.get('/eligible', limiter, getEligibleBrands);

export default router;

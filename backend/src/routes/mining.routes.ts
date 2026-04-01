import { Router } from 'express';
import * as miningController from '../controllers/mining.controller';
import { authMiddleware } from '../middleware/auth';
import { miningLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authMiddleware);

router.post('/challenge', miningLimiter, miningController.getChallenge);
router.post('/submit', miningLimiter, miningController.submitSolution);
router.get('/stats', miningController.getStats);

export default router;

import { Router } from 'express';
import * as miningController from '../controllers/mining.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/challenge', miningController.getChallenge);
router.post('/submit', miningController.submitSolution);
router.get('/stats', miningController.getStats);

export default router;

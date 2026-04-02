import { Router } from 'express';
import * as miningController from '../controllers/mining.controller';
import * as miningSessionController from '../controllers/mining.session.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Legacy PoW
router.post('/challenge', miningController.getChallenge);
router.post('/submit', miningController.submitSolution);
router.get('/stats', miningController.getStats);

// Session-based mining
router.post('/session/start', miningSessionController.startMiningSession);
router.post('/session/stop', miningSessionController.stopMiningSession);
router.get('/session', miningSessionController.getMiningSession);

export default router;

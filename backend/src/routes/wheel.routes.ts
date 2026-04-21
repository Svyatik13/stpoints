import { Router } from 'express';
import * as wheelController from '../controllers/wheel.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/current', wheelController.getCurrentRound as any);
router.post('/bet', authMiddleware as any, wheelController.placeBet as any);
router.get('/history', wheelController.getHistory as any);

export default router;

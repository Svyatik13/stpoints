import { Router } from 'express';
import * as giveawayController from '../controllers/giveaway.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// Public: view recent giveaways
router.get('/recent', giveawayController.getRecentGiveaways);

// Admin only: manually trigger a giveaway
router.post('/trigger', authMiddleware, adminMiddleware, giveawayController.triggerGiveaway);

export default router;

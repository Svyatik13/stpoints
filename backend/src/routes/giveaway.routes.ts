import { Router } from 'express';
import * as giveawayController from '../controllers/giveaway.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public/Auth routes
router.use(authMiddleware);

router.get('/', giveawayController.getGiveaways);
router.post('/join', giveawayController.joinGiveaway);

export default router;

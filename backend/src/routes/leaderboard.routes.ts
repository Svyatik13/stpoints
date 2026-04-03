import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboard.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', leaderboardController.getLeaderboard);

export default router;

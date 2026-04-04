import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getStreak, claimDaily, getTitles, setTitle } from '../controllers/rewards.controller';

const router = Router();

router.use(authMiddleware);

router.get('/streak', getStreak);
router.post('/daily-claim', claimDaily);
router.get('/titles', getTitles);
router.post('/title', setTitle);

export default router;

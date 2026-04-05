import { Router } from 'express';
import { getLiveRiskCoin, buyRiskCoin, sellRiskCoin } from '../controllers/riskcoin.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/live', getLiveRiskCoin);
router.post('/buy', authMiddleware, buyRiskCoin);
router.post('/sell', authMiddleware, sellRiskCoin);

export default router;

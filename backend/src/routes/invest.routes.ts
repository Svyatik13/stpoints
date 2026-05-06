import { Router } from 'express';
import * as investController from '../controllers/invest.controller';
import * as stcoinController from '../controllers/stcoin.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/stocks', investController.getStocks);
router.post('/buy', investController.buyStock);
router.post('/sell', investController.sellStock);

// New ST Coin Chart Data
router.get('/stcoin/chart', stcoinController.getSTChartData);

export default router;

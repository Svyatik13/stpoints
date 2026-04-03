import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import * as transferController from '../controllers/transfer.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.get('/transfer/fee', transferController.getFee);
router.post('/transfer', transferController.transfer);

export default router;

import { Router } from 'express';
import * as walletController from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);

export default router;

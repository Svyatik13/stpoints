import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getVaults, createStake, earlyUnstake } from '../controllers/vault.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getVaults);
router.post('/stake', createStake);
router.post('/unstake/:id', earlyUnstake);

export default router;

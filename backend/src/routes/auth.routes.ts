import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, authController.register as any);
router.post('/login', authLimiter, authController.login as any);
router.post('/logout', authController.logout as any);
router.post('/refresh', authController.refresh as any);
router.get('/me', authMiddleware as any, authController.me as any);

export default router;

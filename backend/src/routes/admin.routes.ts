import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as giveawayController from '../controllers/giveaway.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// System
router.get('/stats', adminController.getSystemStats);
router.get('/users', adminController.getAllUsers);

// User management
router.post('/grant', adminController.grantTokens);
router.post('/role', adminController.setUserRole);
router.post('/toggle-active', adminController.toggleUserActive);

// Giveaway
router.post('/giveaway/trigger', giveawayController.triggerGiveaway);

export default router;

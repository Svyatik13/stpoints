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
router.post('/giveaway/create', giveawayController.createGiveaway);
router.post('/giveaway/draw', giveawayController.forceDraw);

// Delete User
router.delete('/user/:userId', adminController.deleteUser);

// ST-ROOM Teachers
router.get('/teachers', adminController.getTeachersAdmin);
router.post('/teachers', adminController.addTeacher);
router.post('/teachers/toggle', adminController.toggleTeacherActive);
router.post('/teachers/rarity', adminController.setTeacherRarity);



// Pass Code
router.get('/passcode', adminController.getPassCode);
router.post('/passcode/regenerate', adminController.regeneratePassCode);

// ══════════════════════════════════════════════════════════════
// NEW ENDPOINTS
// ══════════════════════════════════════════════════════════════

// User Detail
router.get('/user/:userId/detail', adminController.getUserDetail);

// Broadcast
router.get('/broadcast', adminController.getBroadcast);
router.post('/broadcast', adminController.setBroadcast);
router.delete('/broadcast', adminController.clearBroadcast);



// Audit Log
router.get('/audit-log', adminController.getAuditLog);

// Coinflip Oversight
router.get('/coinflips', adminController.getCoinflipsAdmin);
router.post('/coinflips/:gameId/cancel', adminController.forceCancelCoinflip);



// Bulk Grant
router.post('/bulk-grant', adminController.bulkGrant);

// Export
router.get('/users/export', adminController.exportUsersCSV);

export default router;

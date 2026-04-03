import { Router } from 'express';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Public profile lookup by handle or username
router.get('/profile/:handle', usersController.getPublicProfile);

// Track referral clicks
router.post('/referral-click/:username', usersController.recordReferralClick);

export default router;

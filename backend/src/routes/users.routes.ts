import { Router } from 'express';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Public profile lookup by handle or username
router.get('/profile/:handle', usersController.getPublicProfile);

export default router;

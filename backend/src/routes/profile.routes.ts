import { Router } from 'express';
import * as profileController from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', profileController.getProfile);

export default router;

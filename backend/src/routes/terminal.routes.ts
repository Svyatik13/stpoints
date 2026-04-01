import { Router } from 'express';
import * as terminalController from '../controllers/terminal.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/access', terminalController.checkAccess);

export default router;

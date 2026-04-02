import { Router } from 'express';
import * as stRoomController from '../controllers/stroom.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/teachers', stRoomController.getTeachers);
router.get('/session', stRoomController.checkSession);
router.post('/buy', stRoomController.buyAccess);

export default router;

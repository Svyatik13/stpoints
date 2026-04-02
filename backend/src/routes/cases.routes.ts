import { Router } from 'express';
import * as casesController from '../controllers/cases.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', casesController.getCases);
router.get('/daily-status', casesController.getDailyStatus);
router.get('/passes', casesController.getMyPasses);
router.post('/open', casesController.openCase);

export default router;

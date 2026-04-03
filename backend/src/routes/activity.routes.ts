import { Router } from 'express';
import * as activityController from '../controllers/activity.controller';

const router = Router();

router.get('/', activityController.getGlobalActivity);

export default router;

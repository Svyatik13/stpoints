import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getMessages, sendMessage } from '../controllers/chat.controller';

const router = Router();

router.get('/', getMessages);
router.post('/send', authMiddleware, sendMessage);

export default router;

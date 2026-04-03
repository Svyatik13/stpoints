import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as usernameController from '../controllers/username.controller';

const router = Router();

router.use(authMiddleware);

router.get('/me', usernameController.getMyUsernames);
router.post('/', usernameController.createUsername);
router.delete('/:id', usernameController.deleteUsername);
router.get('/check/:handle', usernameController.checkHandle);

export default router;

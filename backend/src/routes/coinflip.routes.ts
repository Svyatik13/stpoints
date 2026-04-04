import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createGame, joinGame, cancelGame, listGames, gameHistory } from '../controllers/coinflip.controller';

const router = Router();

router.use(authMiddleware);

router.post('/create', createGame);
router.post('/join/:id', joinGame);
router.post('/cancel/:id', cancelGame);
router.get('/games', listGames);
router.get('/history', gameHistory);

export default router;

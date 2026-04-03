import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as marketController from '../controllers/market.controller';

const router = Router();

// Public
router.get('/', marketController.getListings);

// Authenticated
router.use(authMiddleware);
router.get('/my', marketController.getMyListings);
router.post('/', marketController.createListing);
router.post('/:id/buy', marketController.buyListing);
router.delete('/:id', marketController.cancelListing);

export default router;

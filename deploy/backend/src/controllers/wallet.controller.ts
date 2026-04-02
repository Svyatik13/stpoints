import { Request, Response, NextFunction } from 'express';
import * as walletService from '../services/wallet.service';

export async function getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await walletService.getBalance(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await walletService.getTransactionHistory(req.user!.userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

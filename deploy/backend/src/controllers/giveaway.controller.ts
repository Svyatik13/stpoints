import { Request, Response, NextFunction } from 'express';
import * as giveawayService from '../services/giveaway.service';

export async function triggerGiveaway(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await giveawayService.executeGiveaway();
    if (!result) {
      res.json({ message: 'Žádní aktivní uživatelé pro giveaway.', result: null });
      return;
    }
    res.json({
      message: `Giveaway dokončen! Výherce: ${result.winnerUsername}`,
      result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentGiveaways(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const giveaways = await giveawayService.getRecentGiveaways(limit);
    res.json({ giveaways });
  } catch (error) {
    next(error);
  }
}

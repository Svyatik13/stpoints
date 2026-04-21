import { Request, Response, NextFunction } from 'express';
import * as wheelService from '../services/wheel.service';

export async function getCurrentRound(_req: Request, res: Response, next: NextFunction) {
  try {
    let round = await wheelService.getActiveRound();
    
    // Auto-resolve if endsAt passed
    if (round.status === 'COUNTDOWN' && round.endsAt && new Date() > new Date(round.endsAt)) {
      const resolved = await wheelService.resolveRound(round.id);
      if (resolved) round = resolved as any;
    }

    res.json({ round });
  } catch (error) {
    next(error);
  }
}

export async function placeBet(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount } = req.body;
    const userId = (req as any).user.userId;
    
    const round = await wheelService.placeBet(userId, Number(amount));
    res.json({ success: true, round });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(_req: Request, res: Response, next: NextFunction) {
  try {
    // We'll implement a simple history fetch here
    const history = await (require('../config/database')).default.wheelRound.findMany({
      where: { status: 'FINISHED' },
      orderBy: { resolvedAt: 'desc' },
      take: 20,
      include: {
         bets: { include: { user: { select: { username: true } } } }
      }
    });
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

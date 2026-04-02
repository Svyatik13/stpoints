import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as giveawayService from '../services/giveaway.service';

const createGiveawaySchema = z.object({
  title: z.string().min(1).max(100),
  prizePool: z.string().refine(v => parseFloat(v) > 0),
  winnerCount: z.number().int().min(1).max(100),
  distribution: z.enum(['EQUAL', 'WEIGHTED']),
  durationMinutes: z.number().int().min(1),
});

export async function createGiveaway(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createGiveawaySchema.parse(req.body);
    const endsAt = new Date(Date.now() + validated.durationMinutes * 60 * 1000);
    
    const giveaway = await giveawayService.createGiveaway({
      title: validated.title,
      prizePool: validated.prizePool,
      winnerCount: validated.winnerCount,
      distribution: validated.distribution,
      endsAt,
      creatorId: req.user!.userId,
    });
    
    res.status(201).json({ success: true, giveaway });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Neplatné údaje pro vytvoření ST-Dropu.' });
      return;
    }
    next(error);
  }
}

export async function getGiveaways(req: Request, res: Response, next: NextFunction) {
  try {
    const giveaways = await giveawayService.getGiveaways(req.user!.userId);
    res.json({ giveaways });
  } catch (error) {
    next(error);
  }
}

export async function joinGiveaway(req: Request, res: Response, next: NextFunction) {
  try {
    const { giveawayId } = req.body;
    await giveawayService.joinGiveaway(req.user!.userId, giveawayId);
    res.json({ success: true, message: 'Úspěšně připojeno!' });
  } catch (error) {
    next(error);
  }
}

export async function forceDraw(req: Request, res: Response, next: NextFunction) {
  try {
    const { giveawayId } = req.body;
    await giveawayService.drawGiveaway(giveawayId);
    res.json({ success: true, message: 'ST-Drop vyhodnocen.' });
  } catch (error) {
    next(error);
  }
}

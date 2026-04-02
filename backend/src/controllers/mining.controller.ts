import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as miningService from '../services/mining.service';

const submitSchema = z.object({
  challengeId: z.string(),
  nonce: z.number().int().nonnegative(),
  hashesComputed: z.number().int().positive(),
});

export async function getChallenge(req: Request, res: Response, next: NextFunction) {
  try {
    const challenge = await miningService.createChallenge(req.user!.userId);
    res.json(challenge);
  } catch (error) {
    next(error);
  }
}

export async function submitSolution(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = submitSchema.parse(req.body);
    const result = await miningService.submitSolution(
      req.user!.userId,
      validated.challengeId,
      validated.nonce,
      validated.hashesComputed
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Neplatná data odeslání.' });
      return;
    }
    next(error);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await miningService.getMiningStats(req.user!.userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const ST_PER_SECOND = 0.004166;   // Halved: ~0.25 ST/min, 15 ST/hour

export async function startMiningSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { miningStartedAt: true } });

    if (user.miningStartedAt) {
      // Already mining — return existing session
      const elapsed = Math.floor((Date.now() - user.miningStartedAt.getTime()) / 1000);
      return res.json({ alreadyMining: true, miningStartedAt: user.miningStartedAt, elapsedSeconds: elapsed });
    }

    const now = new Date();
    await prisma.user.update({ where: { id: userId }, data: { miningStartedAt: now } });
    logger.info(`MINING START: User ${userId}`);
    res.json({ success: true, miningStartedAt: now });
  } catch (error) { next(error); }
}

const stopSchema = z.object({
  boostSeconds: z.number().int().nonnegative().optional(),
});

export async function stopMiningSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { boostSeconds = 0 } = stopSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (!user.miningStartedAt) throw new AppError('Těžba nebyla spuštěna.', 400);

      const elapsedMs = Date.now() - new Date(user.miningStartedAt).getTime();
      const elapsedSec = Math.floor(elapsedMs / 1000);

      if (elapsedSec < 5) throw new AppError('Příliš krátká těžba (minimum 5 sekund).', 400);

      // Max possible boost check (sanity check)
      const validBoostSec = Math.min(boostSeconds, elapsedSec);

      // Reward calculation: base duration + boost duration (2x)
      // totalDuration = (elapsedSec - validBoostSec) + (validBoostSec * 2)
      const effectiveSec = (elapsedSec - validBoostSec) + (validBoostSec * 2);

      // Reward with ±15% variance
      const variance = 0.85 + Math.random() * 0.3; // 0.85 – 1.15
      const rawReward = effectiveSec * ST_PER_SECOND * variance;
      const reward = new Decimal(rawReward.toFixed(6));

      const currentBalance = new Decimal(user.balance.toString());
      const newBalance = currentBalance.add(reward);

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance, miningStartedAt: null, lastActiveAt: new Date() },
      });

      await tx.transaction.create({
        data: {
          type: 'MINING_REWARD',
          amount: reward,
          receiverId: userId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `Těžba: ${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s (${validBoostSec}s boost)`,
          metadata: { elapsedSec, boostSeconds: validBoostSec },
        },
      });

      return { reward: reward.toString(), newBalance: newBalance.toString(), elapsedSeconds: elapsedSec, boostSeconds: validBoostSec };
    });

    logger.info(`MINING STOP: User ${userId}, earned ${result.reward} ST (${result.elapsedSeconds}s, boost: ${result.boostSeconds}s)`);
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

export async function getMiningSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { miningStartedAt: true } });

    if (!user.miningStartedAt) return res.json({ active: false });

    const elapsedSeconds = Math.floor((Date.now() - new Date(user.miningStartedAt).getTime()) / 1000);
    const estimatedReward = (elapsedSeconds * ST_PER_SECOND).toFixed(6);

    res.json({ active: true, miningStartedAt: user.miningStartedAt, elapsedSeconds, estimatedReward });
  } catch (error) { next(error); }
}

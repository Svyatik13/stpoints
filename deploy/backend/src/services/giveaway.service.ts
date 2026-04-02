import crypto from 'crypto';
import cron from 'node-cron';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function executeGiveaway(): Promise<{
  winnerId: string;
  winnerUsername: string;
  amount: string;
  pool: number;
} | null> {
  const activeThreshold = new Date(Date.now() - env.giveaway.minActiveHours * 60 * 60 * 1000);

  // Find eligible users (active in the last N hours)
  const eligibleUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      lastActiveAt: { gte: activeThreshold },
      role: 'USER',
    },
    select: { id: true, username: true, balance: true },
  });

  if (eligibleUsers.length === 0) {
    logger.giveaway('Žádní aktivní uživatelé pro giveaway.');
    return null;
  }

  // Cryptographically random selection
  const randomIndex = crypto.randomInt(0, eligibleUsers.length);
  const winner = eligibleUsers[randomIndex];
  const amount = new Decimal(env.giveaway.amount);

  // Atomic: update balance + create records
  await prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUniqueOrThrow({ where: { id: winner.id } });
    const currentBalance = new Decimal(currentUser.balance.toString());
    const newBalance = currentBalance.add(amount);

    await tx.user.update({
      where: { id: winner.id },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        type: 'GIVEAWAY',
        amount,
        receiverId: winner.id,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `ST-Drop: Náhodný giveaway ze ZČU Central Node`,
        metadata: {
          pool: eligibleUsers.length,
          selectionIndex: randomIndex,
        },
      },
    });

    await tx.giveaway.create({
      data: {
        winnerId: winner.id,
        amount,
        reason: 'Pravidelný automatický ST-Drop',
        pool: eligibleUsers.length,
      },
    });
  });

  logger.giveaway(`Výherce: ${winner.username} (${winner.id}) — ${amount} ST z ${eligibleUsers.length} kandidátů`);

  return {
    winnerId: winner.id,
    winnerUsername: winner.username,
    amount: amount.toString(),
    pool: eligibleUsers.length,
  };
}

export async function getRecentGiveaways(limit: number = 10) {
  const giveaways = await prisma.giveaway.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      amount: true,
      reason: true,
      pool: true,
      createdAt: true,
      winner: {
        select: { username: true },
      },
    },
  });

  return giveaways.map(g => ({
    ...g,
    amount: g.amount.toString(),
  }));
}

export function startGiveawayCron() {
  const cronExpression = env.giveaway.cron;

  cron.schedule(cronExpression, async () => {
    logger.giveaway(`Cron spuštěn: ${cronExpression}`);
    try {
      const result = await executeGiveaway();
      if (result) {
        logger.giveaway(`Giveaway dokončen — výherce: ${result.winnerUsername}`);
      }
    } catch (error) {
      logger.error('Chyba při giveaway cronu:', error);
    }
  });

  logger.giveaway(`Cron naplánován: ${cronExpression}`);
}

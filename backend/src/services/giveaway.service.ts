import crypto from 'crypto';
import cron from 'node-cron';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface CreateGiveawayInput {
  title: string;
  prizePool: string;
  winnerCount: number;
  distribution: 'EQUAL' | 'WEIGHTED';
  endsAt: Date;
  creatorId: string;
}

export async function createGiveaway(input: CreateGiveawayInput) {
  const giveaway = await prisma.giveaway.create({
    data: {
      title: input.title,
      prizePool: new Decimal(input.prizePool),
      winnerCount: input.winnerCount,
      distribution: input.distribution,
      endsAt: input.endsAt,
      createdBy: input.creatorId,
    },
  });

  logger.giveaway(`Giveaway vytvořen: ${giveaway.title} (ID: ${giveaway.id})`);
  return giveaway;
}

export async function joinGiveaway(userId: string, giveawayId: string) {
  // Check if giveaway is active
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
  });

  if (!giveaway) throw new AppError('ST-Drop neexistuje.', 404);
  if (giveaway.status !== 'ACTIVE') throw new AppError('Tento ST-Drop již není aktivní.', 400);
  if (new Date() >= giveaway.endsAt) throw new AppError('Tento ST-Drop již skončil.', 400);

  // Check if user is active in last 24h
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true },
  });

  const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (!user?.lastActiveAt || user.lastActiveAt < activeThreshold) {
    throw new AppError('Pro účast musíte být aktivní v posledních 24 hodinách.', 403);
  }

  // Join
  try {
    await prisma.giveawayEntry.create({
      data: {
        userId,
        giveawayId,
      },
    });
    logger.giveaway(`User ${userId} joined ST-Drop ${giveawayId}`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new AppError('Již jste připojeni k tomuto ST-Dropu.', 400);
    }
    throw error;
  }
}

export async function drawGiveaway(giveawayId: string) {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
    include: { participants: true },
  });

  if (!giveaway) return null;
  if (giveaway.status !== 'ACTIVE') return null;

  const participants = giveaway.participants.map(p => p.userId);
  const totalPrize = Number(giveaway.prizePool.toString());

  if (participants.length === 0) {
    // No participants, just cancel/complete with no winners
    await prisma.giveaway.update({
      where: { id: giveaway.id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    logger.giveaway(`Giveaway ${giveaway.id} zrušen — žádní účastníci.`);
    return;
  }

  // Pick random winners
  const winnersCount = Math.min(giveaway.winnerCount, participants.length);
  const winners: string[] = [];

  // Shuffle and pick
  const shuffled = [...participants].sort(() => 0.5 - Math.random());
  for (let i = 0; i < winnersCount; i++) {
    winners.push(shuffled[i]);
  }

  // Calculate prize distribution
  const amounts: Decimal[] = [];
  if (giveaway.distribution === 'EQUAL') {
    const amountPerWinner = new Decimal(totalPrize / winnersCount);
    for (let i = 0; i < winnersCount; i++) amounts.push(amountPerWinner);
  } else {
    // WEIGHTED
    if (winnersCount === 1) {
      amounts.push(new Decimal(totalPrize));
    } else if (winnersCount === 2) {
      amounts.push(new Decimal(totalPrize * 0.6));
      amounts.push(new Decimal(totalPrize * 0.4));
    } else {
      // e.g. 1st 40%, 2nd 25%, 3rd 15%, rest split 20%
      const first = totalPrize * 0.40;
      const second = totalPrize * 0.25;
      const third = totalPrize * 0.15;
      amounts.push(new Decimal(first));
      amounts.push(new Decimal(second));
      amounts.push(new Decimal(third));

      if (winnersCount > 3) {
        const remainingPool = totalPrize * 0.20;
        const restAmount = new Decimal(remainingPool / (winnersCount - 3));
        for (let i = 3; i < winnersCount; i++) {
          amounts.push(restAmount);
        }
      }
    }
  }

  // Transaction to update balances and create records
  await prisma.$transaction(async (tx) => {
    // 1. Mark giveaway complete
    await tx.giveaway.update({
      where: { id: giveaway.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // 2. Award each winner
    for (let i = 0; i < winners.length; i++) {
      const winnerId = winners[i];
      const winAmount = amounts[i];
      const place = i + 1;

      const user = await tx.user.findUniqueOrThrow({ where: { id: winnerId } });
      const currentBalance = new Decimal(user.balance.toString());
      const newBalance = currentBalance.add(winAmount);

      // Update user
      await tx.user.update({
        where: { id: winnerId },
        data: { balance: newBalance },
      });

      // Create transaction
      await tx.transaction.create({
        data: {
          type: 'GIVEAWAY',
          amount: winAmount,
          receiverId: winnerId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `ST-Drop Výhra: ${place}. místo v "${giveaway.title}"`,
          metadata: { giveawayId: giveaway.id, place, participants: participants.length },
        },
      });

      // Create giveaway winner record
      await tx.giveawayWinner.create({
        data: {
          giveawayId: giveaway.id,
          userId: winnerId,
          place,
          amount: winAmount,
        },
      });
    }
  });

  logger.giveaway(`Giveaway ${giveaway.title} (ID: ${giveaway.id}) rozlosován! Hodnota: ${totalPrize} ST. Počet výherců: ${winners.length}`);
}

export function startGiveawayCron() {
  // CRON job running every minute to process expired giveaways
  cron.schedule('* * * * *', async () => {
    try {
      const expiredGiveaways = await prisma.giveaway.findMany({
        where: {
          status: 'ACTIVE',
          endsAt: { lte: new Date() },
        },
        select: { id: true },
      });

      for (const g of expiredGiveaways) {
        logger.giveaway(`Auto-draw ST-Drop: ${g.id}`);
        await drawGiveaway(g.id);
      }
    } catch (error) {
      logger.error('Chyba při kontrole ST-Drops (CRON):', error);
    }
  });

  logger.info('ST-Drops auto-draw CRON spuštěn (interval: 1 min).');
}

export async function getGiveaways(userId: string) {
  const giveaways = await prisma.giveaway.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { participants: true } },
      participants: { where: { userId }, select: { id: true } },
      winners: {
        include: { user: { select: { username: true } } },
        orderBy: { place: 'asc' },
      },
      creator: { select: { username: true } },
    },
  });

  return giveaways.map(g => ({
    ...g,
    prizePool: g.prizePool.toString(),
    participantCount: g._count.participants,
    hasJoined: g.participants.length > 0,
    winners: g.winners.map(w => ({
      ...w,
      amount: w.amount.toString(),
      username: w.user.username,
    })),
  }));
}

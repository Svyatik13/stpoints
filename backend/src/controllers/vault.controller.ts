import { Request, Response } from 'express';
import prisma from '../config/database';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { logger } from '../utils/logger';
import { logActivity } from '../services/activity.service';
import { checkAndGrantAchievement } from '../services/achievement.service';

// e.g., 7 days = 5% APY
const APY_RATES = {
  7: 5.0,
  30: 12.0,
  90: 25.0,
};

const stakeSchema = z.object({
  amount: z.string().or(z.number()),
  durationDays: z.number().int().refine(d => Object.keys(APY_RATES).includes(d.toString()), {
    message: "Nemožná doba uzamčení. Povolené: 7, 30, 90 dnů.",
  }),
});

/**
 * Získat aktivní trezory uživatele
 */
export async function getVaults(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const stakes = await prisma.vaultStake.findMany({
      where: { userId },
      orderBy: { lockedAt: 'desc' },
    });
    res.json({ stakes });
  } catch (error) {
    logger.error('Error fetching vaults =', error);
    res.status(500).json({ error: 'Chyba serveru při načítání trezorů.' });
  }
}

/**
 * Vytvořit nový stake
 */
export async function createStake(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = stakeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors[0].message });
      return;
    }

    const amountNum = Number(result.data.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      res.status(400).json({ error: 'Neplatná částka k uzamčení.' });
      return;
    }

    const duration = result.data.durationDays;
    const apy = APY_RATES[duration as keyof typeof APY_RATES];
    
    // Vypočet yield
    const expectedYield = amountNum * (apy / 100) * (duration / 365);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Uživatel nenalezen.');

      const buyerBalance = new Decimal(user.balance.toString());
      if (buyerBalance.lt(amountNum)) {
        throw new Error('Nedostatečný zůstatek pro uzamčení do trezoru.');
      }

      // Deduct balance
      const balanceBefore = user.balance;
      const balanceAfter = buyerBalance.sub(amountNum);
      
      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      // Záznam transakce (VAULT_LOCK)
      await tx.transaction.create({
        data: {
          type: TransactionType.VAULT_LOCK,
          amount: amountNum,
          description: `Uzamčeno v trezoru na ${duration} dnů (APY: ${apy}%)`,
          receiverId: userId,
          balanceBefore,
          balanceAfter,
        },
      });

      // Vytvořit stake záznam
      const unlocksAt = new Date();
      unlocksAt.setDate(unlocksAt.getDate() + duration);

      await tx.vaultStake.create({
        data: {
          userId,
          amount: amountNum,
          apy,
          expectedYield,
          status: 'ACTIVE',
          unlocksAt,
        },
      });
    });

    // Log activity and check achievement
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await logActivity('STAKE', {
        username: user.username,
        amount: amountNum,
        duration,
      });
      checkAndGrantAchievement(userId, 'FIRST_STAKE').catch(e => logger.error('Achievement error:', e));
    }

    res.json({ message: 'ST úspěšně uzamčeny v trezoru.' });
  } catch (error: any) {
    if (error.message === 'Nedostatečný zůstatek pro uzamčení do trezoru.') {
      res.status(400).json({ error: error.message });
      return;
    }
    logger.error('Error creating stake =', error);
    res.status(500).json({ error: 'Chyba při vytváření vkladu do trezoru.' });
  }
}

/**
 * Odemknout všechny dokončené trezory
 * Tohle pobezi jako cronjob kazdou minutu.
 */
export async function processVaultPayouts() {
  try {
    const readyStakes = await prisma.vaultStake.findMany({
      where: {
        status: 'ACTIVE',
        unlocksAt: { lte: new Date() },
      },
    });

    if (readyStakes.length === 0) return;

    for (const stake of readyStakes) {
      await prisma.$transaction(async (tx) => {
        // Kontrola jestli neni uz oznacen
        const currentStake = await tx.vaultStake.findUnique({ where: { id: stake.id } });
        if (!currentStake || currentStake.status !== 'ACTIVE') return;

        const totalPayout = Number(currentStake.amount) + Number(currentStake.expectedYield);
        
        const user = await tx.user.findUnique({ where: { id: stake.userId } });
        if (!user) return;

        const balanceBefore = user.balance;
        const balanceAfter = new Decimal(user.balance.toString()).add(totalPayout);
        
        await tx.user.update({
          where: { id: stake.userId },
          data: { balance: balanceAfter },
        });

        await tx.transaction.create({
          data: {
            type: TransactionType.VAULT_UNLOCK,
            amount: totalPayout,
            description: `Trezor odemknut (Jistina: ${currentStake.amount} ST + Úrok: ${currentStake.expectedYield} ST)`,
            receiverId: stake.userId,
            balanceBefore,
            balanceAfter,
          },
        });

        await tx.vaultStake.update({
          where: { id: stake.id },
          data: {
            status: 'UNLOCKED',
            unlockedAt: new Date(),
          },
        });
      });
      logger.info(`Processed vault unlock for stake ${stake.id}`);
    }
  } catch (error) {
    logger.error('Error processing vault payouts:', error);
  }
}

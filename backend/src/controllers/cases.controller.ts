import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

function rollItem(items: { id: string; weight: number }[]): string {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item.id;
  }
  return items[items.length - 1].id;
}

export async function getCases(req: Request, res: Response, next: NextFunction) {
  try {
    const cases = await prisma.case.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { weight: 'desc' } } },
    });
    res.json({ cases });
  } catch (error) {
    next(error);
  }
}

export async function openCase(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { caseId } = z.object({ caseId: z.string() }).parse(req.body);

    const result = await prisma.$transaction(async (tx: any) => {
      const caseData = await tx.case.findUnique({
        where: { id: caseId },
        include: { items: true },
      });
      if (!caseData || !caseData.isActive) throw new AppError('Case nenalezen nebo není aktivní.', 404);
      if (caseData.items.length === 0) throw new AppError('Tento case nemá žádné předměty.', 400);

      // Daily case cooldown
      if (caseData.isDaily) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const lastOpen = await tx.caseOpening.findFirst({
          where: { userId, caseId, createdAt: { gte: todayStart } },
        });
        if (lastOpen) throw new AppError('Denní case lze otevřít pouze jednou za den. Vraťte se zítra!', 429);
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
      const balance = new Decimal(user.balance.toString());
      const cost = new Decimal(caseData.price.toString());

      if (balance.lt(cost)) throw new AppError(`Nedostatečný zůstatek. Potřebujete ${cost} ST.`, 403);

      // Roll item
      const wonItemId = rollItem(caseData.items);
      const wonItem = caseData.items.find((i: any) => i.id === wonItemId)!;

      let newBalance = balance.sub(cost);
      let rewardAmount: Decimal | null = null;

      if (wonItem.type === 'ST_REWARD' && wonItem.amount) {
        rewardAmount = new Decimal(wonItem.amount.toString());
        newBalance = newBalance.add(rewardAmount);
      } else if (wonItem.type === 'MYTHIC_PASS') {
        // Grant a pass
        await tx.userPass.create({ data: { userId } });
      }

      await tx.user.update({ where: { id: userId }, data: { balance: newBalance } });

      // Transaction record
      const balanceBefore = balance;
      const balanceAfter = newBalance;
      await tx.transaction.create({
        data: {
          type: 'CASE_OPENING',
          amount: cost,
          senderId: userId,
          receiverId: userId,
          balanceBefore,
          balanceAfter,
          description: `Case: ${caseData.name} → ${wonItem.label}`,
        },
      });

      const opening = await tx.caseOpening.create({
        data: {
          userId,
          caseId,
          itemId: wonItemId,
          costPaid: cost,
          rewardAmount: rewardAmount ?? undefined,
          rewardType: wonItem.type,
        },
        include: { item: true, case: true },
      });

      return { opening, wonItem, newBalance: newBalance.toString() };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getMyPasses(req: Request, res: Response, next: NextFunction) {
  try {
    const passes = await prisma.userPass.findMany({
      where: { userId: req.user!.userId, isUsed: false },
      orderBy: { obtainedAt: 'desc' },
    });
    res.json({ passes, count: passes.length });
  } catch (error) {
    next(error);
  }
}

export async function getDailyStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyCase = await prisma.case.findFirst({ where: { isDaily: true, isActive: true } });
    if (!dailyCase) return res.json({ available: false, reason: 'no_daily_case' });
    const lastOpen = await prisma.caseOpening.findFirst({
      where: { userId, caseId: dailyCase.id, createdAt: { gte: todayStart } },
    });
    res.json({ available: !lastOpen, caseId: dailyCase.id, nextReset: new Date(todayStart.getTime() + 86400000).toISOString() });
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const ST_ROOM_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Cost per rarity (ST)
const RARITY_COST: Record<string, number> = {
  COMMON: 50,
  RARE: 65,
  EPIC: 75,
  LEGENDARY: 85,
  MYTHIC: 100, // cannot be bought normally
};

export async function getTeachers(req: Request, res: Response, next: NextFunction) {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
    });
    // Attach cost to each teacher
    const withCost = teachers.map(t => ({
      ...t,
      cost: RARITY_COST[t.rarity] ?? 50,
    }));
    res.json({ teachers: withCost });
  } catch (error) {
    next(error);
  }
}

export async function checkSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const activeSession = await prisma.stRoomSession.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      include: { teacher: true },
      orderBy: { expiresAt: 'desc' }
    });

    if (activeSession) {
      return res.json({
        hasActiveSession: true,
        session: {
          ...activeSession,
          teacher: {
            ...activeSession.teacher,
            cost: RARITY_COST[activeSession.teacher.rarity] ?? 50,
          }
        }
      });
    }

    res.json({ hasActiveSession: false });
  } catch (error) {
    next(error);
  }
}

export async function buyAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { teacherId } = z.object({ teacherId: z.string() }).parse(req.body);

    const existingSession = await prisma.stRoomSession.findFirst({
      where: { userId, expiresAt: { gt: new Date() } }
    });
    if (existingSession) {
      throw new AppError('Již máte aktivní relaci, vyčkejte na její vypršení.', 400);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { balance: true }
      });
      const balance = new Decimal(user.balance.toString());

      const teacher = await tx.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher || !teacher.isActive) {
        throw new AppError('Tento učitel není dostupný.', 404);
      }
      if (teacher.rarity === 'MYTHIC') {
        throw new AppError('Mythic učitel vyžaduje speciální pass. Nelze zakoupit za ST.', 403);
      }

      const cost = new Decimal(RARITY_COST[teacher.rarity] ?? 50);
      if (balance.lt(cost)) {
        throw new AppError(`Nedostatečný zůstatek. Potřebujete ${cost.toString()} ST pro přístup k ${teacher.name}.`, 403);
      }

      const newBalance = balance.sub(cost);
      await tx.user.update({ where: { id: userId }, data: { balance: newBalance } });

      await tx.transaction.create({
        data: {
          type: 'ST_ROOM_ACCESS',
          amount: cost,
          receiverId: userId,
          senderId: userId,
          balanceBefore: balance,
          balanceAfter: newBalance,
          description: `Vstup do ST-ROOM (${teacher.name} — ${teacher.rarity})`
        }
      });

      const expiresAt = new Date(Date.now() + ST_ROOM_DURATION_MS);
      const session = await tx.stRoomSession.create({
        data: { userId, teacherId, cost, expiresAt },
        include: { teacher: true }
      });

      return { ...session, teacher: { ...session.teacher, cost: RARITY_COST[teacher.rarity] ?? 50 } };
    });

    res.json({ success: true, session: result });
  } catch (error) {
    next(error);
  }
}

export async function redeemPass(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { teacherId, passCode } = z.object({ teacherId: z.string(), passCode: z.string() }).parse(req.body);

    // Future: validate passCode against a case/pass table
    // For now just placeholder structure
    throw new AppError('Pass systém bude dostupný brzy.', 501);
  } catch (error) {
    next(error);
  }
}

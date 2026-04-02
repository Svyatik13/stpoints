import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const ST_ROOM_COST = new Decimal(50);
const ST_ROOM_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function getTeachers(req: Request, res: Response, next: NextFunction) {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ teachers });
  } catch (error) {
    next(error);
  }
}

export async function checkSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    // Check if user has an active session
    const activeSession = await prisma.stRoomSession.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      include: {
        teacher: true
      },
      orderBy: { expiresAt: 'desc' }
    });

    if (activeSession) {
      return res.json({
        hasActiveSession: true,
        session: activeSession
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

    // Check if they already have an active session
    const existingSession = await prisma.stRoomSession.findFirst({
      where: { userId, expiresAt: { gt: new Date() } }
    });

    if (existingSession) {
      throw new AppError('Již máte aktivní relaci, vyčkejte na její vypršení.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { balance: true }
      });
      const balance = new Decimal(user.balance.toString());

      if (balance.lt(ST_ROOM_COST)) {
        throw new AppError(`Nedostatečný zůstatek. Potřebujete 50 ST pro přístup.`, 403);
      }

      const teacher = await tx.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher || !teacher.isActive) {
        throw new AppError('Tento učitel není dostupný.', 404);
      }

      const newBalance = balance.sub(ST_ROOM_COST);

      // Deduct balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          type: 'ST_ROOM_ACCESS',
          amount: ST_ROOM_COST,
          receiverId: userId,
          senderId: userId, // technically paid to system, we can just use system debit or custom
          balanceBefore: balance,
          balanceAfter: newBalance,
          description: `Vstup do ST-ROOM (${teacher.name})`
        }
      });

      // Create session
      const expiresAt = new Date(Date.now() + ST_ROOM_DURATION_MS);
      const session = await tx.stRoomSession.create({
        data: {
          userId,
          teacherId,
          cost: ST_ROOM_COST,
          expiresAt
        },
        include: { teacher: true }
      });

      return session;
    });

    res.json({ success: true, session: result });
  } catch (error) {
    next(error);
  }
}

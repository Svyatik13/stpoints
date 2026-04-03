import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const USERNAME_COST = new Decimal('2');
const USERNAME_MAX = 3;
const USERNAME_COOLDOWN_HOURS = 24;

const handleSchema = z.string()
  .min(3, 'Handle musí mít alespoň 3 znaky.')
  .max(20, 'Handle může mít nejvýše 20 znaků.')
  .regex(/^[a-zA-Z0-9_]+$/, 'Handle smí obsahovat pouze písmena, čísla a podtržítka.');

// GET /usernames/me — my handles
export async function getMyUsernames(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const usernames = await prisma.username.findMany({
      where: { ownerId: userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ usernames });
  } catch (error) { next(error); }
}

// POST /usernames — create handle
export async function createUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { handle } = z.object({ handle: handleSchema }).parse(req.body);
    const normalizedHandle = handle.toLowerCase();

    const result = await prisma.$transaction(async (tx: any) => {
      // Max 3 check
      const count = await tx.username.count({ where: { ownerId: userId, isActive: true } });
      if (count >= USERNAME_MAX) throw new AppError(`Můžete vlastnit maximálně ${USERNAME_MAX} handlery současně.`, 400);

      // Uniqueness
      const existing = await tx.username.findUnique({ where: { handle: normalizedHandle } });
      if (existing) throw new AppError('Tento handle je již obsazený.', 409);

      // Balance check
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
      const balance = new Decimal(user.balance.toString());
      if (balance.lt(USERNAME_COST)) throw new AppError(`Nedostatečný zůstatek. Potřebujete ${USERNAME_COST} ST.`, 403);

      const canSellAt = new Date();
      canSellAt.setHours(canSellAt.getHours() + USERNAME_COOLDOWN_HOURS);

      const [username] = await Promise.all([
        tx.username.create({ data: { handle: normalizedHandle, ownerId: userId, canSellAt } }),
        tx.user.update({ where: { id: userId }, data: { balance: { decrement: USERNAME_COST } } }),
        tx.transaction.create({
          data: {
            type: 'HANDLE_CREATE',
            amount: USERNAME_COST,
            description: `Handle @${normalizedHandle} created`,
            receiverId: userId,
            senderId: userId,
            balanceBefore: balance,
            balanceAfter: balance.sub(USERNAME_COST),
          },
        }),
      ]);

      return username;
    });

    logger.info(`User ${userId} created handle @${normalizedHandle}`);
    res.status(201).json({ username: result });
  } catch (error) { next(error); }
}

// DELETE /usernames/:id — release handle
export async function deleteUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    const username = await prisma.username.findUnique({ where: { id } });
    if (!username || username.ownerId !== userId) throw new AppError('Handle nenalezen.', 404);
    if (!username.isActive) throw new AppError('Handle již není aktivní.', 400);

    // Check if listed on market — can't delete if listed
    const listed = await prisma.marketListing.findFirst({
      where: { usernameId: id, status: 'ACTIVE' },
    });
    if (listed) throw new AppError('Handle je momentálně na tržišti. Nejdříve jej stáhněte.', 400);

    await prisma.username.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) { next(error); }
}

// GET /usernames/check/:handle — check availability
export async function checkHandle(req: Request, res: Response, next: NextFunction) {
  try {
    const handle = (req.params.handle as string).toLowerCase();
    const existing = await prisma.username.findUnique({ where: { handle } });
    const available = !existing || !existing.isActive;
    logger.info(`Handle check: @${handle} -> available: ${available}`);
    res.json({ available });
  } catch (error) { next(error); }
}

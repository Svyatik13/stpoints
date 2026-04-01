import { Request, Response, NextFunction } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const TERMINAL_MIN_BALANCE = new Decimal(500);

export async function checkAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { balance: true, username: true },
    });

    if (!user) {
      throw new AppError('Uživatel nenalezen.', 404);
    }

    const balance = new Decimal(user.balance.toString());
    const hasAccess = balance.gte(TERMINAL_MIN_BALANCE);

    res.json({
      hasAccess,
      requiredBalance: TERMINAL_MIN_BALANCE.toString(),
      currentBalance: balance.toString(),
      deficit: hasAccess ? '0' : TERMINAL_MIN_BALANCE.sub(balance).toString(),
      message: hasAccess
        ? 'Přístup povolen. Vítejte v ST-RM Terminálu.'
        : `Nedostatečný zůstatek. Potřebujete ${TERMINAL_MIN_BALANCE.sub(balance).toString()} ST.`,
    });
  } catch (error) {
    next(error);
  }
}

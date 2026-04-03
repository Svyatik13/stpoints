import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import * as walletService from '../services/wallet.service';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export async function getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await walletService.getBalance(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const result = await walletService.getTransactionHistory(req.user!.userId, page, limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * ST/USD price ticker — simulated based on network metrics.
 * Base price $8.50, adjusted by supply scarcity and recent activity.
 */
export async function getPrice(_req: Request, res: Response, next: NextFunction) {
  try {
    const [supplyAgg, userCount, recentTxCount] = await Promise.all([
      prisma.user.aggregate({ _sum: { balance: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.transaction.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const totalSupply = parseFloat(supplyAgg._sum.balance?.toString() || '0');

    // Price algorithm: base price + scarcity bonus + activity bonus
    const BASE_PRICE = 8.50;
    const scarcityFactor = totalSupply > 0 ? Math.max(0.85, 500 / (totalSupply + 200)) : 1;
    const activityBonus = Math.min(recentTxCount * 0.15, 3.0);

    // Add deterministic "volatility" based on current hour
    const hourSeed = Math.sin(Date.now() / 3600000) * 0.40;

    const price = Math.max(1.00, BASE_PRICE * scarcityFactor + activityBonus + hourSeed);
    const change24h = ((activityBonus + hourSeed) / BASE_PRICE) * 100;

    res.json({
      price: price.toFixed(4),
      change24h: change24h.toFixed(2),
      totalSupply: totalSupply.toFixed(2),
      holders: userCount,
      volume24h: recentTxCount,
      marketCap: (price * totalSupply).toFixed(2),
    });
  } catch (error) {
    next(error);
  }
}

export async function sendST(req: Request, res: Response, next: NextFunction) {
  try {
    const senderId = req.user!.userId;
    const { toWalletId, amount } = z.object({
      toWalletId: z.string().length(5, 'Wallet ID musí mít přesně 5 znaků.').toUpperCase(),
      amount: z.string().refine(v => parseFloat(v) > 0, 'Částka musí být kladná'),
    }).parse(req.body);

    const amountDecimal = new Decimal(amount);

    await prisma.$transaction(async (tx: any) => {
      const sender = await tx.user.findUniqueOrThrow({ where: { id: senderId }, select: { balance: true, walletId: true } });
      if (sender.walletId?.toUpperCase() === toWalletId.toUpperCase()) throw new AppError('Nemůžete poslat ST sami sobě.', 400);

      const recipient = await tx.user.findUnique({ where: { walletId: toWalletId.toUpperCase() } });
      if (!recipient) throw new AppError(`Wallet ID "${toWalletId}" nebylo nalezeno.`, 404);

      const senderBalance = new Decimal(sender.balance.toString());
      if (senderBalance.lt(amountDecimal)) throw new AppError('Nedostatečný zůstatek.', 403);

      const recipientBalance = new Decimal(recipient.balance.toString());

      await tx.user.update({ where: { id: senderId }, data: { balance: { decrement: amountDecimal } } });
      await tx.user.update({ where: { id: recipient.id }, data: { balance: { increment: amountDecimal } } });
      await tx.transaction.create({
        data: {
          type: 'TRANSFER',
          amount: amountDecimal,
          description: `Převod → ${recipient.username} (${toWalletId})`,
          senderId,
          receiverId: recipient.id,
          balanceBefore: senderBalance,
          balanceAfter: senderBalance.sub(amountDecimal),
        },
      });
    });

    res.json({ success: true, message: 'ST odeslány úspěšně.' });
  } catch (error) { next(error); }
}

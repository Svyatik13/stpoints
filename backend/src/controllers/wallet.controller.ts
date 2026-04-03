import { Request, Response, NextFunction } from 'express';
import * as walletService from '../services/wallet.service';
import prisma from '../config/database';

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
 * Base price $0.12, adjusted by supply scarcity and recent activity.
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
    const BASE_PRICE = 0.12;
    const scarcityFactor = totalSupply > 0 ? Math.max(0.8, 1000 / (totalSupply + 500)) : 1;
    const activityBonus = Math.min(recentTxCount * 0.002, 0.15);

    // Add deterministic "volatility" based on current hour
    const hourSeed = Math.sin(Date.now() / 3600000) * 0.03;

    const price = Math.max(0.01, BASE_PRICE * scarcityFactor + activityBonus + hourSeed);
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

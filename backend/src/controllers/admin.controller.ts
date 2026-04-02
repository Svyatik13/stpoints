import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// ── All Users ──
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string || '';

    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          balance: true,
          role: true,
          isActive: true,
          lastActiveAt: true,
          createdAt: true,
          _count: { select: { miningChallenges: true, giveawayWins: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map(u => ({
        ...u,
        balance: u.balance.toString(),
        miningCount: u._count.miningChallenges,
        giveawayCount: u._count.giveawayWins,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

// ── System Stats ──
export async function getSystemStats(req: Request, res: Response, next: NextFunction) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalBalance,
      totalMined,
      totalGiveaways,
      giveawayCount,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.user.aggregate({ _sum: { balance: true } }),
      prisma.transaction.aggregate({ where: { type: 'MINING_REWARD' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'GIVEAWAY' }, _sum: { amount: true } }),
      prisma.giveaway.count(),
      prisma.transaction.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    res.json({
      totalUsers,
      activeUsers24h: activeUsers,
      totalBalance: totalBalance._sum.balance?.toString() ?? '0',
      totalMined: totalMined._sum.amount?.toString() ?? '0',
      totalGiveaways: totalGiveaways._sum.amount?.toString() ?? '0',
      giveawayCount,
      recentTransactions24h: recentTransactions,
    });
  } catch (error) {
    next(error);
  }
}

// ── Grant ST to user ──
const grantSchema = z.object({
  userId: z.string(),
  amount: z.string().refine(v => parseFloat(v) > 0, 'Částka musí být kladná'),
  reason: z.string().min(1).max(200),
});

export async function grantTokens(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, amount, reason } = grantSchema.parse(req.body);
    const grantAmount = new Decimal(amount);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const currentBalance = new Decimal(user.balance.toString());
      const newBalance = currentBalance.add(grantAmount);

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      await tx.transaction.create({
        data: {
          type: 'ADMIN_GRANT',
          amount: grantAmount,
          receiverId: userId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `Admin Grant: ${reason}`,
          metadata: { grantedBy: req.user!.userId, reason },
        },
      });

      return { newBalance: newBalance.toString(), username: user.username };
    });

    logger.info(`ADMIN GRANT: ${req.user!.userId} → ${result.username}: ${amount} ST (${reason})`);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ── Set user role ──
const roleSchema = z.object({
  userId: z.string(),
  role: z.enum(['USER', 'ADMIN']),
});

export async function setUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role } = roleSchema.parse(req.body);
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    logger.info(`ADMIN: Role changed for ${userId} → ${role}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ── Ban/Unban user ──
export async function toggleUserActive(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
    logger.info(`ADMIN: User ${userId} ${user.isActive ? 'banned' : 'unbanned'}`);
    res.json({ success: true, isActive: !user.isActive });
  } catch (error) {
    next(error);
  }
}

// ── Manual giveaway with custom amount ──
const manualGiveawaySchema = z.object({
  amount: z.string().refine(v => parseFloat(v) > 0),
  reason: z.string().min(1).max(200).optional(),
});

export async function manualGiveaway(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, reason } = manualGiveawaySchema.parse(req.body);
    
    // Import and execute giveaway with custom amount
    const { executeGiveaway } = await import('../services/giveaway.service');
    const result = await executeGiveaway();
    
    if (!result) {
      res.json({ success: false, message: 'Žádní aktivní uživatelé.' });
      return;
    }
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export async function getLeaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const type = (req.query.type as string) || 'balance';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (type === 'balance') {
      const users = await prisma.user.findMany({
        where: { role: { not: 'ADMIN' }, isActive: true },
        orderBy: { balance: 'desc' },
        take: limit,
        select: { id: true, username: true, balance: true, createdAt: true },
      });
      res.json({
        leaderboard: users.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          value: u.balance.toString(),
          createdAt: u.createdAt,
        })),
        type: 'balance',
      });
    } else if (type === 'mining') {
      const miners = await prisma.transaction.groupBy({
        by: ['receiverId'],
        where: { type: 'MINING_REWARD' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });

      const userIds = miners.map(m => m.receiverId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true, role: { not: 'ADMIN' } },
        select: { id: true, username: true },
      });
      const userMap = new Map(users.map(u => [u.id, u.username]));

      res.json({
        leaderboard: miners
          .filter(m => userMap.has(m.receiverId))
          .map((m, i) => ({
            rank: i + 1,
            username: userMap.get(m.receiverId)!,
            value: m._sum.amount?.toString() ?? '0',
          })),
        type: 'mining',
      });
    } else {
      res.status(400).json({ error: 'Neplatný typ žebříčku. Použijte "balance" nebo "mining".' });
    }
  } catch (error) {
    next(error);
  }
}

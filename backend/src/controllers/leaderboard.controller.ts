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
        select: { id: true, username: true, balance: true, activeTitle: true },
      });
      res.json({
        leaderboard: users.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          activeTitle: u.activeTitle,
          value: u.balance.toString(),
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
        select: { id: true, username: true, activeTitle: true },
      });
      const userMap = new Map(users.map(u => [u.id, { username: u.username, title: u.activeTitle }]));

      res.json({
        leaderboard: miners
          .filter(m => userMap.has(m.receiverId))
          .map((m, i) => {
            const data = userMap.get(m.receiverId)!;
            return {
              rank: i + 1,
              username: data.username,
              activeTitle: data.title,
              value: m._sum.amount?.toString() ?? '0',
            };
          }),
        type: 'mining',
      });
    } else if (type === 'tips') {
      const givers = await prisma.transaction.groupBy({
        by: ['senderId'],
        where: { type: 'TIP', senderId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });

      const userIds = givers.map(g => g.senderId as string);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true, role: { not: 'ADMIN' } },
        select: { id: true, username: true, activeTitle: true },
      });
      const userMap = new Map(users.map(u => [u.id, { username: u.username, title: u.activeTitle }]));

      res.json({
        leaderboard: givers
          .filter(g => g.senderId && userMap.has(g.senderId))
          .map((g, i) => {
            const data = userMap.get(g.senderId as string)!;
            return {
              rank: i + 1,
              username: data.username,
              activeTitle: data.title,
              value: g._sum.amount?.toString() ?? '0',
            };
          }),
        type: 'tips',
      });
    } else if (type === 'gambling') {
      const winners = await prisma.transaction.groupBy({
        by: ['receiverId'],
        where: { type: 'COINFLIP_WIN' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });

      const userIds = winners.map(w => w.receiverId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true, role: { not: 'ADMIN' } },
        select: { id: true, username: true, activeTitle: true },
      });
      const userMap = new Map(users.map(u => [u.id, { username: u.username, title: u.activeTitle }]));

      res.json({
        leaderboard: winners
          .filter(w => userMap.has(w.receiverId))
          .map((w, i) => {
            const data = userMap.get(w.receiverId)!;
            return {
              rank: i + 1,
              username: data.username,
              activeTitle: data.title,
              value: w._sum.amount?.toString() ?? '0',
            };
          }),
        type: 'gambling',
      });
    } else {
      res.status(400).json({ error: 'Neplatný typ žebříčku.' });
    }
  } catch (error) {
    next(error);
  }
}

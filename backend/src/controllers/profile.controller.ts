import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { walletAddress } from '../utils/crypto';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        balance: true,
        role: true,
        referralCount: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    // Mining stats
    const miningStats = await prisma.miningChallenge.aggregate({
      where: { userId, status: 'SOLVED' },
      _count: true,
      _sum: { reward: true },
    });

    // Transaction stats
    const [sentCount, receivedCount] = await Promise.all([
      prisma.transaction.count({ where: { senderId: userId, type: 'TRANSFER' } }),
      prisma.transaction.count({ where: { receiverId: userId, type: 'TRANSFER' } }),
    ]);

    // Giveaway wins
    const giveawayWins = await prisma.transaction.count({
      where: { receiverId: userId, type: 'GIVEAWAY' },
    });

    // Case openings
    const caseOpenings = await prisma.caseOpening.count({
      where: { userId },
    });

    // Total earned (all incoming transactions)
    const totalEarned = await prisma.transaction.aggregate({
      where: { receiverId: userId },
      _sum: { amount: true },
    });

    res.json({
      user: {
        ...user,
        balance: user.balance.toString(),
        address: walletAddress(user.id),
      },
      stats: {
        miningSessionsCompleted: miningStats._count,
        totalMined: miningStats._sum.reward?.toString() ?? '0',
        transfersSent: sentCount,
        transfersReceived: receivedCount,
        giveawayWins,
        caseOpenings,
        totalEarned: totalEarned._sum.amount?.toString() ?? '0',
      },
    });
  } catch (error) {
    next(error);
  }
}

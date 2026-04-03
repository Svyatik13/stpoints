import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { txHash, walletAddress } from '../utils/crypto';

export async function getBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, walletId: true },
  });

  if (!user) throw new AppError('Uživatel nenalezen.', 404);

  // Generate walletId lazily for existing users
  let walletId = user.walletId;
  if (!walletId) {
    const alphabet = 'ABCDEFGHJKLMNPQRTUVWXY23456789';
    let attempts = 0;
    while (attempts < 20) {
      walletId = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
      const taken = await prisma.user.findUnique({ where: { walletId } });
      if (!taken) break;
      attempts++;
    }
    await prisma.user.update({ where: { id: userId }, data: { walletId } });
  }

  return { balance: user.balance.toString(), address: walletAddress(userId), walletId };
}

export async function getTransactionHistory(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        OR: [
          { receiverId: userId },
          { senderId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        balanceBefore: true,
        balanceAfter: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
        sender: {
          select: { username: true },
        },
        receiver: {
          select: { username: true },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        OR: [
          { receiverId: userId },
          { senderId: userId },
        ],
      },
    }),
  ]);

  return {
    transactions: transactions.map(tx => ({
      ...tx,
      hash: txHash(tx.id),
      amount: tx.amount.toString(),
      balanceBefore: tx.balanceBefore.toString(),
      balanceAfter: tx.balanceAfter.toString(),
      isIncoming: tx.receiverId === userId,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

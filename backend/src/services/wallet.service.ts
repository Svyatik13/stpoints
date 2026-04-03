import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { txHash, walletAddress } from '../utils/crypto';

export async function getBalance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, address: true },
  });

  if (!user) throw new AppError('Uživatel nenalezen.', 404);

  // If address is missing (pre-migration), generate it lazily
  let address = user.address;
  if (!address) {
    address = walletAddress(userId);
    await prisma.user.update({ where: { id: userId }, data: { address } });
  }

  return { balance: user.balance.toString(), address };
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
    transactions: transactions.map((tx: any) => ({
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

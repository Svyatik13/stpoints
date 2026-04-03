import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export async function transferST(senderId: string, recipientUsername: string, amount: string, note?: string) {
  const transferAmount = new Decimal(amount);

  if (transferAmount.lte(0)) {
    throw new AppError('Částka musí být kladná.', 400);
  }

  if (transferAmount.lt(new Decimal('0.000001'))) {
    throw new AppError('Minimální převod je 0.000001 ST.', 400);
  }

  const recipient = await prisma.user.findUnique({
    where: { username: recipientUsername },
    select: { id: true, username: true, isActive: true },
  });

  if (!recipient) {
    throw new AppError('Příjemce nenalezen.', 404);
  }

  if (!recipient.isActive) {
    throw new AppError('Účet příjemce je deaktivován.', 403);
  }

  if (recipient.id === senderId) {
    throw new AppError('Nelze převést sám sobě.', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUniqueOrThrow({ where: { id: senderId } });
    const senderBalance = new Decimal(sender.balance.toString());

    if (senderBalance.lt(transferAmount)) {
      throw new AppError('Nedostatečný zůstatek.', 400);
    }

    const recipientUser = await tx.user.findUniqueOrThrow({ where: { id: recipient.id } });
    const recipientBalance = new Decimal(recipientUser.balance.toString());

    const newSenderBalance = senderBalance.sub(transferAmount);
    const newRecipientBalance = recipientBalance.add(transferAmount);

    // Update balances
    await tx.user.update({
      where: { id: senderId },
      data: { balance: newSenderBalance, lastActiveAt: new Date() },
    });

    await tx.user.update({
      where: { id: recipient.id },
      data: { balance: newRecipientBalance, lastActiveAt: new Date() },
    });

    const description = note
      ? `Převod: ${note}`
      : `Převod na ${recipient.username}`;

    // Sender transaction record
    await tx.transaction.create({
      data: {
        type: 'TRANSFER',
        amount: transferAmount,
        senderId,
        receiverId: recipient.id,
        balanceBefore: senderBalance,
        balanceAfter: newSenderBalance,
        description,
      },
    });

    // Receiver transaction record
    await tx.transaction.create({
      data: {
        type: 'TRANSFER',
        amount: transferAmount,
        senderId,
        receiverId: recipient.id,
        balanceBefore: recipientBalance,
        balanceAfter: newRecipientBalance,
        description: `Převod od ${sender.username}${note ? ': ' + note : ''}`,
      },
    });

    logger.info(`Transfer: ${sender.username} → ${recipient.username}: ${amount} ST`);

    return {
      amount: transferAmount.toString(),
      newBalance: newSenderBalance.toString(),
      recipient: recipient.username,
    };
  });

  return result;
}

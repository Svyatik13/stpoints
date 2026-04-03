import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Gas fee: 2% of transfer amount, minimum 0.000001 ST
const GAS_FEE_RATE = new Decimal('0.02');
const GAS_FEE_MIN = new Decimal('0.000001');

export function calculateGasFee(amount: string): string {
  const fee = Decimal.max(new Decimal(amount).mul(GAS_FEE_RATE), GAS_FEE_MIN);
  // Round to 6 decimal places
  return fee.toDecimalPlaces(6, Decimal.ROUND_UP).toString();
}

export async function transferST(senderId: string, recipientUsername: string, amount: string, note?: string) {
  const transferAmount = new Decimal(amount);

  if (transferAmount.lte(0)) {
    throw new AppError('Částka musí být kladná.', 400);
  }

  if (transferAmount.lt(new Decimal('0.000001'))) {
    throw new AppError('Minimální převod je 0.000001 ST.', 400);
  }

  // Resolve recipient by username, @handle, or walletId
  let recipient: { id: string; username: string; isActive: boolean } | null = null;

  const input = recipientUsername.trim();

  if (input.startsWith('@')) {
    // Lookup by handle
    const handle = input.slice(1).toLowerCase();
    const usernameRecord = await prisma.username.findUnique({
      where: { handle },
      select: { owner: { select: { id: true, username: true, isActive: true } } },
    });
    recipient = usernameRecord?.owner ?? null;
  } else {
    // Try username
    recipient = await prisma.user.findUnique({
      where: { username: input },
      select: { id: true, username: true, isActive: true },
    });
  }

  if (!recipient) {
    throw new AppError('Příjemce nenalezen.', 404);
  }

  if (!recipient.isActive) {
    throw new AppError('Účet příjemce je deaktivován.', 403);
  }

  if (recipient.id === senderId) {
    throw new AppError('Nelze převést sám sobě.', 400);
  }

  const gasFee = new Decimal(calculateGasFee(amount));
  const totalCost = transferAmount.add(gasFee);

  const result = await prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUniqueOrThrow({ where: { id: senderId } });
    const senderBalance = new Decimal(sender.balance.toString());

    if (senderBalance.lt(totalCost)) {
      throw new AppError(`Nedostatečný zůstatek. Potřebujete ${totalCost.toString()} ST (včetně ${gasFee.toString()} ST poplatku).`, 400);
    }

    const recipientUser = await tx.user.findUniqueOrThrow({ where: { id: recipient.id } });
    const recipientBalance = new Decimal(recipientUser.balance.toString());

    const newSenderBalance = senderBalance.sub(totalCost);
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
      ? `Převod: ${note} (poplatek: ${gasFee.toString()} ST)`
      : `Převod na ${recipient.username} (poplatek: ${gasFee.toString()} ST)`;

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
      fee: gasFee.toString(),
      totalCost: totalCost.toString(),
      newBalance: newSenderBalance.toString(),
      recipient: recipient.username,
    };
  });

  return result;
}

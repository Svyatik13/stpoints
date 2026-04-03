import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { logActivity } from '../services/activity.service';
import { TransactionType } from '@prisma/client';
import { checkAndGrantAchievement } from '../services/achievement.service';

// GET /users/profile/:handle — public profile
export async function getPublicProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const handle = (req.params.handle as string).toLowerCase().replace('@', '');

    // Find by username handle or by username (account name)
    const username = await prisma.username.findFirst({
      where: { handle, isActive: true },
      include: { owner: { select: { id: true, username: true, balance: true, createdAt: true, address: true } } },
    });

    let user;
    if (username) {
      user = username.owner;
    } else {
      // Fall back to looking up by account username
      user = await prisma.user.findUnique({
        where: { username: handle },
        select: { id: true, username: true, balance: true, createdAt: true, address: true },
      });
    }

    if (!user) throw new AppError('Profil nenalezen.', 404);

    // Get all active usernames owned by this user
    const handles = await prisma.username.findMany({
      where: { ownerId: user.id, isActive: true },
      select: { handle: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Get user's earned achievements
    const earned = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
    const earnedTypes = new Set(earned.map(e => e.achievement.type));

    // Get ALL achievements in the system
    const allAchievements = await prisma.achievement.findMany({ orderBy: { rarity: 'asc' } });

    // Merge: earned ones get full data, locked ones show requirements
    const badges = allAchievements.map(a => {
      const userAch = earned.find(e => e.achievement.type === a.type);
      return {
        id: a.id,
        type: a.type,
        label: a.label,
        description: a.description,
        icon: userAch ? a.icon : '???',
        rarity: a.rarity,
        earned: !!userAch,
        earnedAt: userAch?.earnedAt || null,
      };
    });

    res.json({
      profile: {
        username: user.username,
        balance: parseFloat(user.balance.toString()).toFixed(4),
        address: user.address,
        joinedAt: user.createdAt,
        handles,
        badges,
        earnedCount: earned.length,
        totalCount: allAchievements.length,
      },
    });
  } catch (error) { next(error); }
}

// POST /users/referral-click/:username — track links
export async function recordReferralClick(req: Request, res: Response, next: NextFunction) {
  try {
    const username = req.params.username as string;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { address: { equals: username, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (user) {
      // Increment click count
      await prisma.user.update({
        where: { id: user.id },
        data: { referralClicks: { increment: 1 } },
      });
      
      logger.info(`Referral click recorded for: ${username}`);
    }

    res.json({ success: true });
  } catch (error) {
    // Silent fail for the user, just log it
    logger.error('Error recording referral click:', error);
    res.json({ success: false });
  }
}

// POST /users/tip/:handle — send ST to user
export async function tipUser(req: Request, res: Response, next: NextFunction) {
  try {
    const senderId = req.user!.userId;
    const handle = (req.params.handle as string).toLowerCase().replace('@', '');
    const { amount, message } = z.object({
      amount: z.string().refine(v => parseFloat(v) >= 0.1, 'Minimální tip je 0.1 ST'),
      message: z.string().max(50).optional(),
    }).parse(req.body);

    const tipAmount = new Decimal(amount);
    const sender = await prisma.user.findUniqueOrThrow({ where: { id: senderId } });

    if (sender.balance.lessThan(tipAmount)) {
      throw new AppError('Nedostatečný zůstatek pro spropitné.', 400);
    }

    // Find receiver
    const username = await prisma.username.findFirst({
      where: { handle, isActive: true },
      include: { owner: true },
    });

    const receiver = username ? username.owner : await prisma.user.findUnique({ where: { username: handle } });
    if (!receiver) throw new AppError('Příjemce nenalezen.', 404);
    if (receiver.id === senderId) throw new AppError('Nemůžete dát spropitné sami sobě.', 400);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct from sender
      const s = await tx.user.update({
        where: { id: senderId },
        data: { balance: { decrement: tipAmount } },
      });

      // 2. Add to receiver
      const r = await tx.user.update({
        where: { id: receiver.id },
        data: { balance: { increment: tipAmount } },
      });

      // 3. Create transaction
      await tx.transaction.create({
        data: {
          type: TransactionType.TIP,
          amount: tipAmount,
          description: `Spropitné pro @${handle}${message ? `: ${message}` : ''}`,
          senderId,
          receiverId: receiver.id,
          balanceBefore: sender.balance,
          balanceAfter: s.balance,
          metadata: { message, recipientHandle: handle },
        },
      });

      return { senderBalance: s.balance };
    });

    // 4. Log activity
    await logActivity('TIP', {
      from: sender.username,
      to: handle,
      amount: parseFloat(amount),
      message,
    });

    // 5. Check achievements
    await checkAndGrantAchievement(senderId, 'TIPPING_GENEROUS');
    await checkAndGrantAchievement(senderId, 'WHALE');

    res.json({ message: `Posláno ${amount} ST uživateli @${handle}!`, balance: result.senderBalance.toString() });
  } catch (error) { next(error); }
}

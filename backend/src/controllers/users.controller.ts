import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

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

    res.json({
      profile: {
        username: user.username,
        balance: parseFloat(user.balance.toString()).toFixed(4),
        address: user.address,
        joinedAt: user.createdAt,
        handles,
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

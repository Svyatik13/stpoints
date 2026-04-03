import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// GET /users/profile/:handle — public profile
export async function getPublicProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const handle = req.params.handle.toLowerCase().replace('@', '');

    // Find by username handle or by username (account name)
    const username = await prisma.username.findUnique({
      where: { handle },
      include: { owner: { select: { id: true, username: true, balance: true, createdAt: true, walletId: true } } },
    });

    let user;
    if (username) {
      user = username.owner;
    } else {
      // Fall back to looking up by account username
      user = await prisma.user.findUnique({
        where: { username: handle },
        select: { id: true, username: true, balance: true, createdAt: true, walletId: true },
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
        walletId: user.walletId,
        joinedAt: user.createdAt,
        handles,
      },
    });
  } catch (error) { next(error); }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// ── All Users ──
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string || '';

    const where = search ? {
      username: { contains: search, mode: 'insensitive' as const },
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          balance: true,
          role: true,
          isActive: true,
          lastActiveAt: true,
          createdAt: true,
          _count: { select: { miningChallenges: true, giveawayWins: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map(u => ({
        ...u,
        balance: u.balance.toString(),
        miningCount: u._count.miningChallenges,
        giveawayCount: u._count.giveawayWins,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

// ── System Stats ──
export async function getSystemStats(req: Request, res: Response, next: NextFunction) {
  try {
    const nonAdmin = { role: { not: 'ADMIN' as const } };
    const [
      totalUsers,
      activeUsers,
      totalBalance,
      totalMined,
      totalGiveaways,
      giveawayCount,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count({ where: nonAdmin }),
      prisma.user.count({ where: { ...nonAdmin, lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      // Balance: sum only non-admin users
      prisma.user.aggregate({ where: nonAdmin, _sum: { balance: true } }),
      // Mining: only transactions where receiver is not admin
      prisma.transaction.aggregate({
        where: { type: 'MINING_REWARD', receiver: nonAdmin },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({ where: { type: 'GIVEAWAY' }, _sum: { amount: true } }),
      prisma.giveaway.count(),
      prisma.transaction.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);

    res.json({
      totalUsers,
      activeUsers24h: activeUsers,
      totalBalance: totalBalance._sum.balance?.toString() ?? '0',
      totalMined: totalMined._sum.amount?.toString() ?? '0',
      totalGiveaways: totalGiveaways._sum.amount?.toString() ?? '0',
      giveawayCount,
      recentTransactions24h: recentTransactions,
    });
  } catch (error) {
    next(error);
  }
}

// ── Grant ST to user ──
const grantSchema = z.object({
  userId: z.string(),
  amount: z.string().refine(v => parseFloat(v) > 0, 'Částka musí být kladná'),
  reason: z.string().min(1).max(200),
});

export async function grantTokens(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, amount, reason } = grantSchema.parse(req.body);
    const grantAmount = new Decimal(amount);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const currentBalance = new Decimal(user.balance.toString());
      const newBalance = currentBalance.add(grantAmount);

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      await tx.transaction.create({
        data: {
          type: 'ADMIN_GRANT',
          amount: grantAmount,
          receiverId: userId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: `Admin Grant: ${reason}`,
          metadata: { grantedBy: req.user!.userId, reason },
        },
      });

      return { newBalance: newBalance.toString(), username: user.username };
    });

    logger.info(`ADMIN GRANT: ${req.user!.userId} → ${result.username}: ${amount} ST (${reason})`);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ── Set user role ──
const roleSchema = z.object({
  userId: z.string(),
  role: z.enum(['USER', 'ADMIN']),
});

export async function setUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role } = roleSchema.parse(req.body);
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    logger.info(`ADMIN: Role changed for ${userId} → ${role}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ── Ban/Unban user ──
export async function toggleUserActive(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
    logger.info(`ADMIN: User ${userId} ${user.isActive ? 'banned' : 'unbanned'}`);
    res.json({ success: true, isActive: !user.isActive });
  } catch (error) {
    next(error);
  }
}

// ── Delete user (Hard Delete) ──
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);

    await prisma.$transaction(async (tx) => {
      // 1. Delete all mining challenges
      await tx.miningChallenge.deleteMany({ where: { userId } });

      // 2. Delete giveaway participations and wins
      await tx.giveawayEntry.deleteMany({ where: { userId } });
      await tx.giveawayWinner.deleteMany({ where: { userId } });

      // 3. Find if user created any giveaways and delete their related records
      const createdGiveaways = await tx.giveaway.findMany({ where: { createdBy: userId }, select: { id: true } });
      if (createdGiveaways.length > 0) {
        const gaIds = createdGiveaways.map(g => g.id);
        await tx.giveawayEntry.deleteMany({ where: { giveawayId: { in: gaIds } } });
        await tx.giveawayWinner.deleteMany({ where: { giveawayId: { in: gaIds } } });
        await tx.giveaway.deleteMany({ where: { id: { in: gaIds } } });
      }

      // 4. Delete transactions (sender or receiver)
      await tx.transaction.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }]
        }
      });

      // 5. Finally, delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    logger.info(`ADMIN: User ${userId} hard deleted from database and all relations.`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ── Teachers (ST-ROOM) ──
export async function getTeachersAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const teachers = await prisma.teacher.findMany({ orderBy: { name: 'asc' } });
    res.json({ teachers });
  } catch (error) {
    next(error);
  }
}

export async function addTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = z.object({ name: z.string().min(2).max(50) }).parse(req.body);
    const teacher = await prisma.teacher.create({ data: { name } });
    logger.info(`ADMIN: Nový učitel přidán: ${name}`);
    res.json({ success: true, teacher });
  } catch (error) {
    next(error);
  }
}

export async function toggleTeacherActive(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacherId } = z.object({ teacherId: z.string() }).parse(req.body);
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } });
    await prisma.teacher.update({ where: { id: teacherId }, data: { isActive: !teacher.isActive } });
    res.json({ success: true, isActive: !teacher.isActive });
  } catch (error) {
    next(error);
  }
}

export async function setTeacherRarity(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacherId, rarity } = z.object({
      teacherId: z.string(),
      rarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']),
    }).parse(req.body);
    await prisma.teacher.update({ where: { id: teacherId }, data: { rarity } });
    logger.info(`ADMIN: Teacher ${teacherId} rarity set to ${rarity}`);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ── Pass Code (Admin) ──
import * as passCodeService from '../services/passcode.service';

export async function getPassCode(req: Request, res: Response, next: NextFunction) {
  try {
    const code = await passCodeService.getActiveCode();
    const history = await passCodeService.getCodeHistory(5);
    res.json({ code, history });
  } catch (error) { next(error); }
}

export async function regeneratePassCode(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUser = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { username: true } });
    const adminName = adminUser?.username || 'admin';
    const code = await passCodeService.regenerateCode(adminName);
    const history = await passCodeService.getCodeHistory(5);
    logger.info(`ADMIN: PassCode regenerated by ${adminName}`);
    res.json({ code, history });
  } catch (error) { next(error); }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── NEW ADMIN ENDPOINTS ──
// ══════════════════════════════════════════════════════════════════════════════

// Helper: log admin action
async function logAdminAction(adminId: string, action: string, details: Record<string, any> = {}) {
  try {
    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { username: true } });
    await prisma.activityEvent.create({
      data: {
        type: 'ADMIN_ACTION',
        payload: { admin: admin?.username || adminId, action, ...details, timestamp: new Date().toISOString() },
      },
    });
  } catch {}
}

// ── User Detail ──
export async function getUserDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, username: true, balance: true, role: true, isActive: true,
        address: true, lastActiveAt: true, createdAt: true, activeTitle: true,
        loginStreak: true, lastLoginRewardAt: true, referralCount: true,
        _count: {
          select: {
            miningChallenges: true, giveawayWins: true,
            coinflipsCreated: true, chatMessages: true,
            sentTransactions: true, receivedTransactions: true, userPasses: true,
            usernames: true,
          },
        },
      },
    });

    // Recent transactions (last 20)
    const transactions = await prisma.transaction.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, type: true, amount: true, description: true, createdAt: true },
    });

    // Recent mining (last 10)
    const mining = await prisma.miningChallenge.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      take: 10,
      select: { id: true, status: true, reward: true, issuedAt: true, solvedAt: true },
    });

    res.json({
      user: { ...user, balance: user.balance.toString() },
      transactions: transactions.map(t => ({ ...t, amount: t.amount.toString() })),
      mining: mining.map(m => ({ ...m, reward: m.reward?.toString() || null })),
    });
  } catch (error) { next(error); }
}

// ── Broadcast Message ──
export async function getBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'broadcast_message' } });
    res.json({ message: setting?.value || null, updatedAt: setting?.updatedAt || null });
  } catch (error) { next(error); }
}

export async function setBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    const { message } = z.object({ message: z.string().min(1).max(500) }).parse(req.body);
    await prisma.systemSetting.upsert({
      where: { key: 'broadcast_message' },
      update: { value: message },
      create: { key: 'broadcast_message', value: message },
    });
    await logAdminAction(req.user!.userId, 'BROADCAST_SET', { message });
    logger.info(`ADMIN: Broadcast set: "${message}"`);
    res.json({ success: true, message });
  } catch (error) { next(error); }
}

export async function clearBroadcast(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.systemSetting.deleteMany({ where: { key: 'broadcast_message' } });
    await logAdminAction(req.user!.userId, 'BROADCAST_CLEARED');
    res.json({ success: true });
  } catch (error) { next(error); }
}

// ── Audit Log ──
export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

    const [events, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where: { type: 'ADMIN_ACTION' },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityEvent.count({ where: { type: 'ADMIN_ACTION' } }),
    ]);

    res.json({ events, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}

// ── Coinflip Oversight ──
export async function getCoinflipsAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string) || 'all';
    const where: any = {};
    if (status === 'WAITING') where.status = 'WAITING';
    if (status === 'FINISHED') where.status = 'FINISHED';

    const games = await prisma.coinflipGame.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        creator: { select: { username: true } },
        joiner: { select: { username: true } },
      },
    });

    const stats = await prisma.coinflipGame.groupBy({
      by: ['status'],
      _count: true,
      _sum: { amount: true },
    });

    res.json({
      games: games.map(g => ({ ...g, amount: g.amount.toString() })),
      stats: stats.map(s => ({ status: s.status, count: s._count, totalAmount: s._sum.amount?.toString() || '0' })),
    });
  } catch (error) { next(error); }
}

export async function forceCancelCoinflip(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId } = z.object({ gameId: z.string() }).parse(req.params);

    const game = await prisma.coinflipGame.findUniqueOrThrow({ where: { id: gameId } });
    if (game.status !== 'WAITING') {
      return res.status(400).json({ error: 'Lze zrušit pouze čekající hry.' });
    }

    const wager = new Decimal(game.amount.toString());

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: game.creatorId } });
      const balance = new Decimal(user.balance.toString());
      await tx.user.update({
        where: { id: game.creatorId },
        data: { balance: { increment: wager } },
      });
      await tx.transaction.create({
        data: {
          type: 'COINFLIP_WIN',
          amount: wager,
          receiverId: game.creatorId,
          balanceBefore: balance,
          balanceAfter: balance.add(wager),
          description: 'Admin: Vrácení sázky (hra zrušena adminem)',
          metadata: { gameId, action: 'admin_cancel' },
        },
      });
      await tx.coinflipGame.update({ where: { id: gameId }, data: { status: 'CANCELLED' } });
    });

    await logAdminAction(req.user!.userId, 'COINFLIP_CANCELLED', { gameId, amount: wager.toString() });
    logger.info(`ADMIN: Coinflip ${gameId} force-cancelled, refunded ${wager} ST`);
    res.json({ success: true });
  } catch (error) { next(error); }
}

// ── Bulk Grant ──
export async function bulkGrant(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount, reason, filter } = z.object({
      amount: z.string().refine(v => parseFloat(v) > 0, 'Must be positive'),
      reason: z.string().min(1).max(200),
      filter: z.enum(['all', 'active_24h', 'active_7d']),
    }).parse(req.body);

    const grantAmount = new Decimal(amount);
    const now = Date.now();

    const where: any = { role: { not: 'ADMIN' as const } };
    if (filter === 'active_24h') where.lastActiveAt = { gte: new Date(now - 24 * 60 * 60 * 1000) };
    if (filter === 'active_7d') where.lastActiveAt = { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };

    const users = await prisma.user.findMany({ where, select: { id: true, balance: true, username: true } });

    let granted = 0;
    for (const u of users) {
      const currentBalance = new Decimal(u.balance.toString());
      const newBalance = currentBalance.add(grantAmount);
      await prisma.$transaction([
        prisma.user.update({ where: { id: u.id }, data: { balance: newBalance } }),
        prisma.transaction.create({
          data: {
            type: 'ADMIN_GRANT',
            amount: grantAmount,
            receiverId: u.id,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            description: `Bulk Grant: ${reason}`,
            metadata: { grantedBy: req.user!.userId, reason, filter },
          },
        }),
      ]);
      granted++;
    }

    await logAdminAction(req.user!.userId, 'BULK_GRANT', { amount, reason, filter, usersAffected: granted });
    logger.info(`ADMIN: Bulk grant ${amount} ST to ${granted} users (filter: ${filter})`);
    res.json({ success: true, usersAffected: granted, totalAmount: grantAmount.mul(granted).toString() });
  } catch (error) { next(error); }
}

// ── Export Users CSV ──
export async function exportUsersCSV(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, username: true, balance: true, role: true, isActive: true,
        lastActiveAt: true, createdAt: true, loginStreak: true,
        _count: { select: { miningChallenges: true, giveawayWins: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Username,Balance,Role,Active,LastActive,Created,LoginStreak,MiningCount,GiveawayWins\n';
    const rows = users.map(u => [
      u.username,
      u.balance.toString(),
      u.role,
      u.isActive ? 'Yes' : 'No',
      u.lastActiveAt?.toISOString() || '',
      u.createdAt.toISOString(),
      u.loginStreak,
      u._count.miningChallenges,
      u._count.giveawayWins,
    ].join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=stpoints_users.csv');
    res.send(header + rows);
  } catch (error) { next(error); }
}

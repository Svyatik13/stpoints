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
    const [
      totalUsers,
      activeUsers,
      totalBalance,
      totalMined,
      totalGiveaways,
      giveawayCount,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.user.aggregate({ _sum: { balance: true } }),
      prisma.transaction.aggregate({ where: { type: 'MINING_REWARD' }, _sum: { amount: true } }),
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

// ── Cases (Admin) ──
export async function getCasesAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const cases = await prisma.case.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { weight: 'desc' } }, _count: { select: { openings: true } } },
    });
    res.json({ cases });
  } catch (error) { next(error); }
}

export async function createCase(req: Request, res: Response, next: NextFunction) {
  try {
    const data = z.object({
      name: z.string().min(1).max(80),
      description: z.string().optional(),
      price: z.string(),
      isDaily: z.boolean().optional().default(false),
    }).parse(req.body);
    const maxOrder = await prisma.case.count();
    const newCase = await prisma.case.create({ data: { ...data, sortOrder: maxOrder } });
    logger.info(`ADMIN: Case created: ${data.name}`);
    res.json({ success: true, case: newCase });
  } catch (error) { next(error); }
}

export async function updateCase(req: Request, res: Response, next: NextFunction) {
  try {
    const { caseId } = req.params;
    const data = z.object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      isDaily: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);
    const updated = await prisma.case.update({ where: { id: caseId }, data });
    res.json({ success: true, case: updated });
  } catch (error) { next(error); }
}

export async function deleteCase(req: Request, res: Response, next: NextFunction) {
  try {
    const { caseId } = req.params;
    await prisma.case.delete({ where: { id: caseId } });
    logger.info(`ADMIN: Case deleted: ${caseId}`);
    res.json({ success: true });
  } catch (error) { next(error); }
}

export async function addCaseItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { caseId } = req.params;
    const data = z.object({
      type: z.enum(['ST_REWARD', 'MYTHIC_PASS']),
      label: z.string().min(1).max(50),
      amount: z.string().optional().nullable(),
      weight: z.number().int().min(1).max(10000),
    }).parse(req.body);
    const item = await prisma.caseItem.create({ data: { caseId, ...data } });
    res.json({ success: true, item });
  } catch (error) { next(error); }
}

export async function updateCaseItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { itemId } = req.params;
    const data = z.object({
      label: z.string().min(1).max(50).optional(),
      type: z.enum(['ST_REWARD', 'MYTHIC_PASS']).optional(),
      amount: z.string().optional().nullable(),
      weight: z.number().int().min(1).max(10000).optional(),
    }).parse(req.body);
    const item = await prisma.caseItem.update({ where: { id: itemId }, data });
    res.json({ success: true, item });
  } catch (error) { next(error); }
}

export async function deleteCaseItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { itemId } = req.params;
    await prisma.caseItem.delete({ where: { id: itemId } });
    res.json({ success: true });
  } catch (error) { next(error); }
}

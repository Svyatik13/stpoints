import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

// ── Daily Streak Rewards ──────────────────────────────────────────────────────
const STREAK_REWARDS = [0.5, 1, 1.5, 2, 3, 5, 10]; // Day 1-7

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isYesterday(d1: Date, d2: Date): boolean {
  const yesterday = new Date(d2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d1, yesterday);
}

// GET /api/rewards/streak
export async function getStreak(req: Request, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const now = new Date();
  const canClaim = !user.lastLoginRewardAt || !isSameDay(user.lastLoginRewardAt, now);
  const currentDay = Math.min(user.loginStreak, 7);
  const nextReward = STREAK_REWARDS[Math.min(currentDay, STREAK_REWARDS.length - 1)];

  res.json({
    streak: user.loginStreak,
    canClaim,
    currentDay,
    nextReward,
    rewards: STREAK_REWARDS,
  });
}

// POST /api/rewards/daily-claim
export async function claimDaily(req: Request, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const now = new Date();

  // Already claimed today
  if (user.lastLoginRewardAt && isSameDay(user.lastLoginRewardAt, now)) {
    throw new AppError('Dnešní odměna již vyzvednuta.', 400);
  }

  // Calculate streak
  let newStreak: number;
  if (user.lastLoginRewardAt && isYesterday(user.lastLoginRewardAt, now)) {
    newStreak = Math.min(user.loginStreak + 1, 7);
  } else {
    newStreak = 1; // Reset streak
  }

  const rewardIndex = Math.min(newStreak - 1, STREAK_REWARDS.length - 1);
  const reward = new Decimal(STREAK_REWARDS[rewardIndex].toString());
  const balance = new Decimal(user.balance.toString());
  const newBalance = balance.add(reward);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        balance: newBalance,
        loginStreak: newStreak,
        lastLoginRewardAt: now,
      },
    });

    await tx.transaction.create({
      data: {
        type: 'DAILY_REWARD',
        amount: reward,
        receiverId: userId,
        balanceBefore: balance,
        balanceAfter: newBalance,
        description: `Denní streak (den ${newStreak}): +${reward.toString()} ST`,
        metadata: { day: newStreak, streak: newStreak },
      },
    });

    // Auto-grant titles based on streak milestones
    if (newStreak >= 7 && !user.activeTitle) {
      await tx.user.update({
        where: { id: userId },
        data: { activeTitle: 'dedicated' },
      });
    }
  });

  res.json({
    success: true,
    streak: newStreak,
    reward: reward.toString(),
    newBalance: newBalance.toString(),
    day: newStreak,
  });
}

// ── Title System ──────────────────────────────────────────────────────────────

// All available titles with their display properties
export const TITLES: Record<string, { label: string; color: string; icon: string; description: string }> = {
  miner:      { label: 'Miner',      color: '#a855f7', icon: '⛏️',  description: 'Odtěžil 100+ ST' },
  whale:      { label: 'Whale',      color: '#06b6d4', icon: '🐋',  description: 'Zůstatek 1000+ ST' },
  veteran:    { label: 'Veteran',    color: '#10b981', icon: '⭐',  description: 'Člen 30+ dní' },
  gambler:    { label: 'Gambler',    color: '#eab308', icon: '🎰',  description: '50+ coinflipů' },
  generous:   { label: 'Generous',   color: '#ec4899', icon: '💝',  description: '100+ tipů odesláno' },
  dedicated:  { label: 'Dedicated',  color: '#f97316', icon: '🔥',  description: '7-denní streak' },
  trader:     { label: 'Trader',     color: '#14b8a6', icon: '📈',  description: '20+ tržních obchodů' },
  lord:       { label: 'Lord',       color: '#facc15', icon: '💍',  description: 'Zůstatek 5000+ ST' },
  god:        { label: 'God',        color: '#f472b6', icon: '🎇',  description: 'Zůstatek 25000+ ST' },
  og:         { label: 'OG',         color: '#ef4444', icon: '👑',  description: 'Jeden z prvních uživatelů' },
};

// GET /api/rewards/titles
export async function getTitles(req: Request, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Compute which titles this user has unlocked
  const [miningStats, transferStats, coinflipStats] = await Promise.all([
    prisma.transaction.aggregate({
      where: { receiverId: userId, type: 'MINING_REWARD' },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: { senderId: userId, type: 'TIP' },
    }),
    prisma.coinflipGame.count({
      where: { OR: [{ creatorId: userId }, { joinerId: userId }], status: 'FINISHED' },
    }),
  ]);

  const balance = parseFloat(user.balance.toString());
  const totalMined = parseFloat(miningStats._sum.amount?.toString() || '0');
  const daysSinceCreation = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const unlocked: string[] = [];
  if (totalMined >= 100) unlocked.push('miner');
  if (balance >= 1000) unlocked.push('whale');
  if (balance >= 5000) unlocked.push('lord');
  if (balance >= 25000) unlocked.push('god');
  if (daysSinceCreation >= 30) unlocked.push('veteran');
  if (coinflipStats >= 50) unlocked.push('gambler');
  if (transferStats >= 100) unlocked.push('generous');
  if (user.loginStreak >= 7) unlocked.push('dedicated');

  // First 20 users are OGs
  const userCount = await prisma.user.count({ where: { createdAt: { lte: user.createdAt } } });
  if (userCount <= 20) unlocked.push('og');

  res.json({
    activeTitle: user.activeTitle,
    unlockedTitles: unlocked,
    allTitles: TITLES,
  });
}

// POST /api/rewards/title
export async function setTitle(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { title } = req.body;

  // null means remove title
  if (title !== null && !TITLES[title]) {
    throw new AppError('Neznámý titul.', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeTitle: title || null },
  });

  res.json({ success: true, activeTitle: title || null });
}

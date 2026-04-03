import prisma from '../config/database';

export type AchievementType = 'FIRST_STAKE' | 'MINING_NOOKIE' | 'MARKET_MAKER' | 'WHALE' | 'TIPPING_GENEROUS';

export async function checkAndGrantAchievement(userId: string, type: AchievementType) {
  try {
    // 1. Check if achievement exists in DB
    const achievement = await prisma.achievement.findUnique({
      where: { type },
    });

    if (!achievement) return;

    // 2. Check if user already has it
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing) return;

    // 3. Evaluate criteria
    let granted = false;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    switch (type) {
      case 'FIRST_STAKE':
        const stakeCount = await prisma.vaultStake.count({ where: { userId } });
        if (stakeCount >= 1) granted = true;
        break;
      
      case 'MINING_NOOKIE':
        const solves = await prisma.miningChallenge.count({ where: { userId, status: 'SOLVED' } });
        if (solves >= 10) granted = true;
        break;

      case 'MARKET_MAKER':
        const sales = await prisma.marketListing.count({ where: { sellerId: userId, status: 'SOLD' } });
        if (sales >= 5) granted = true;
        break;

      case 'WHALE':
        if (user.balance.greaterThanOrEqualTo(1000)) granted = true;
        break;

      case 'TIPPING_GENEROUS':
        const tips = await prisma.transaction.count({ where: { senderId: userId, type: 'TIP' } });
        if (tips >= 5) granted = true;
        break;
    }

    if (granted) {
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
        },
      });
      console.log(`Achievement ${type} granted to user ${user.username}`);
    }
  } catch (error) {
    console.error('Achievement check failed:', error);
  }
}

/**
 * Seeding script for base achievements
 */
export async function seedAchievements() {
  const achievements = [
    { type: 'FIRST_STAKE', label: 'Vault Starter', description: 'Udělej svůj první vklad do trezoru', icon: '🏦', rarity: 'COMMON' },
    { type: 'MINING_NOOKIE', label: 'Miner Nováček', description: 'Vyřeš 10 mining challengí', icon: '⛏️', rarity: 'COMMON' },
    { type: 'MARKET_MAKER', label: 'Obchodník', description: 'Prodej 5 položek na tržišti', icon: '🏪', rarity: 'RARE' },
    { type: 'WHALE', label: 'Velryba', description: 'Měj zůstatek přes 1000 ST', icon: '🐋', rarity: 'EPIC' },
    { type: 'TIPPING_GENEROUS', label: 'Štědrý dárce', description: 'Pošli 5 spropitných ostatním', icon: '🎁', rarity: 'RARE' },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { type: a.type },
      update: a,
      create: a,
    });
  }
}

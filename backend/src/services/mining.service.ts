import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { env } from '../config/env';
import { sha256, generateRandomPrefix, computeTarget } from '../utils/hash';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export async function createChallenge(userId: string) {
  // Expire any pending challenges for this user
  await prisma.miningChallenge.updateMany({
    where: {
      userId,
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });

  // Check if user already has an active challenge
  const existing = await prisma.miningChallenge.findFirst({
    where: {
      userId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    return {
      challengeId: existing.id,
      prefix: existing.prefix,
      difficulty: existing.difficulty,
      target: existing.target,
      expiresAt: existing.expiresAt,
    };
  }

  const prefix = generateRandomPrefix(16);
  const difficulty = env.mining.difficulty;
  const target = computeTarget(difficulty);
  const expiresAt = new Date(Date.now() + env.mining.challengeExpiryMinutes * 60 * 1000);

  const challenge = await prisma.miningChallenge.create({
    data: {
      userId,
      prefix,
      difficulty,
      target,
      expiresAt,
    },
  });

  logger.mining(`Challenge vytvořen pro uživatele ${userId}: ${challenge.id}`);

  return {
    challengeId: challenge.id,
    prefix: challenge.prefix,
    difficulty: challenge.difficulty,
    target: challenge.target,
    expiresAt: challenge.expiresAt,
  };
}

export async function submitSolution(
  userId: string,
  challengeId: string,
  nonce: number,
  hashesComputed: number
) {
  // 1. Fetch challenge
  const challenge = await prisma.miningChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new AppError('Challenge nenalezen.', 404);
  }

  if (challenge.userId !== userId) {
    throw new AppError('Tento challenge vám nepatří.', 403);
  }

  if (challenge.status !== 'PENDING') {
    throw new AppError('Challenge již byl zpracován.', 409);
  }

  if (new Date() > challenge.expiresAt) {
    await prisma.miningChallenge.update({
      where: { id: challengeId },
      data: { status: 'EXPIRED' },
    });
    throw new AppError('Challenge vypršel. Vyžádejte si nový.', 410);
  }

  // 2. Recompute hash server-side
  const hash = sha256(challenge.prefix + nonce.toString());

  // 3. Verify difficulty
  if (hash >= challenge.target) {
    await prisma.miningChallenge.update({
      where: { id: challengeId },
      data: { status: 'INVALID' },
    });
    logger.mining(`INVALID: Hash nesplňuje obtížnost. User: ${userId}, Challenge: ${challengeId}`);
    throw new AppError('Hash nesplňuje požadovanou obtížnost.', 400);
  }

  // 4. Timing plausibility check
  const elapsedMs = Date.now() - challenge.issuedAt.getTime();
  const elapsedSeconds = elapsedMs / 1000;
  const maxPossibleHashes = env.mining.maxHashRate * elapsedSeconds;

  if (hashesComputed > maxPossibleHashes) {
    await prisma.miningChallenge.update({
      where: { id: challengeId },
      data: { status: 'INVALID' },
    });
    logger.mining(`CHEAT DETECTED: Nereálná rychlost hashování. User: ${userId}, Claimed: ${hashesComputed}, Max: ${Math.floor(maxPossibleHashes)}`);
    throw new AppError('Nereálná rychlost výpočtu. Podezření na podvod.', 400);
  }

  // 5. Calculate reward: 0.001 per 10,000 hashes
  const rewardMultiplier = Math.floor(hashesComputed / 10000);
  const reward = new Decimal(env.mining.rewardPer10k).mul(Math.max(rewardMultiplier, 1));

  // 6. Atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const currentBalance = new Decimal(user.balance.toString());
    const newBalance = currentBalance.add(reward);

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: {
        balance: newBalance,
        lastActiveAt: new Date(),
      },
    });

    // Create transaction record
    await tx.transaction.create({
      data: {
        type: 'MINING_REWARD',
        amount: reward,
        receiverId: userId,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Těžba: ${hashesComputed.toLocaleString('cs-CZ')} hashů zpracováno`,
        metadata: {
          challengeId,
          nonce: nonce.toString(),
          hash,
          difficulty: challenge.difficulty,
        },
      },
    });

    // Mark challenge as solved
    await tx.miningChallenge.update({
      where: { id: challengeId },
      data: {
        status: 'SOLVED',
        nonce: BigInt(nonce),
        resultHash: hash,
        hashesComputed,
        reward,
        solvedAt: new Date(),
      },
    });

    return { reward: reward.toString(), newBalance: newBalance.toString() };
  });

  logger.mining(`SOLVED: User ${userId} odtěžil ${result.reward} ST (${hashesComputed} hashů)`);

  return result;
}

export async function getMiningStats(userId: string) {
  const [totalChallenges, solvedChallenges, totalReward] = await Promise.all([
    prisma.miningChallenge.count({ where: { userId } }),
    prisma.miningChallenge.count({ where: { userId, status: 'SOLVED' } }),
    prisma.transaction.aggregate({
      where: { receiverId: userId, type: 'MINING_REWARD' },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalChallenges,
    solvedChallenges,
    totalReward: totalReward._sum.amount?.toString() ?? '0',
  };
}

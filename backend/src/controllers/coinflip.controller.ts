import { Request, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const GAS_RATE = 0.02;
const MIN_WAGER = 0.5;
const MAX_WAGER = 10000;

function calculateGasFee(amount: Decimal): Decimal {
  const fee = amount.mul(GAS_RATE);
  const minFee = new Decimal('0.000001');
  return fee.lt(minFee) ? minFee : fee;
}

// POST /api/coinflip/create
export async function createGame(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { amount, side } = req.body;

  const wager = parseFloat(amount);
  if (!wager || wager < MIN_WAGER || wager > MAX_WAGER) {
    throw new AppError(`Sázka musí být mezi ${MIN_WAGER} a ${MAX_WAGER} ST.`, 400);
  }

  const chosenSide = side === 'tails' ? 'tails' : 'heads';
  const wagerDecimal = new Decimal(wager.toFixed(6));

  // Check balance
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const balance = new Decimal(user.balance.toString());
  if (balance.lt(wagerDecimal)) {
    throw new AppError('Nedostatečný zůstatek.', 400);
  }

  // Check max active games
  const activeGames = await prisma.coinflipGame.count({
    where: { creatorId: userId, status: 'WAITING' },
  });
  if (activeGames >= 3) {
    throw new AppError('Maximálně 3 aktivní hry najednou.', 400);
  }

  // Deduct wager from creator
  const newBalance = balance.sub(wagerDecimal);
  const game = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        type: 'COINFLIP_LOSS',
        amount: wagerDecimal,
        senderId: userId,
        receiverId: userId,
        balanceBefore: balance,
        balanceAfter: newBalance,
        description: `Coinflip sázka: ${wager} ST`,
        metadata: { action: 'wager_placed', side: chosenSide },
      },
    });

    return tx.coinflipGame.create({
      data: {
        creatorId: userId,
        amount: wagerDecimal,
        side: chosenSide,
        status: 'WAITING',
      },
      include: { creator: { select: { username: true } } },
    });
  });

  res.json({ game });
}

// POST /api/coinflip/join/:id
export async function joinGame(req: Request, res: Response) {
  const userId = (req as any).userId;
  const id = req.params.id as string;

  const game = await prisma.coinflipGame.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, username: true } },
    },
  });

  if (!game) throw new AppError('Hra nenalezena.', 404);
  if (game.status !== 'WAITING') throw new AppError('Tato hra už není dostupná.', 400);
  if (game.creatorId === userId) throw new AppError('Nemůžete hrát sám proti sobě.', 400);

  const joiner = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const joinerBalance = new Decimal(joiner.balance.toString());
  const wager = new Decimal(game.amount.toString());

  if (joinerBalance.lt(wager)) {
    throw new AppError('Nedostatečný zůstatek.', 400);
  }

  // Flip the coin
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const creatorWins = result === game.side;
  const winnerId = creatorWins ? game.creatorId : userId;
  const loserId = creatorWins ? userId : game.creatorId;

  const totalPot = wager.mul(2);
  const fee = calculateGasFee(totalPot);
  const payout = totalPot.sub(fee);

  // Resolve game atomically
  const resolvedGame = await prisma.$transaction(async (tx) => {
    // Deduct joiner's wager
    const joinerNewBalance = joinerBalance.sub(wager);
    await tx.user.update({
      where: { id: userId },
      data: { balance: joinerNewBalance },
    });

    await tx.transaction.create({
      data: {
        type: 'COINFLIP_LOSS',
        amount: wager,
        senderId: userId,
        receiverId: userId,
        balanceBefore: joinerBalance,
        balanceAfter: joinerNewBalance,
        description: `Coinflip sázka: ${wager.toString()} ST`,
        metadata: { gameId: id, action: 'wager_placed' },
      },
    });

    // Pay the winner
    const winner = await tx.user.findUniqueOrThrow({ where: { id: winnerId } });
    const winnerBalance = new Decimal(winner.balance.toString());
    const winnerNewBalance = winnerBalance.add(payout);

    await tx.user.update({
      where: { id: winnerId },
      data: { balance: winnerNewBalance },
    });

    await tx.transaction.create({
      data: {
        type: 'COINFLIP_WIN',
        amount: payout,
        receiverId: winnerId,
        balanceBefore: winnerBalance,
        balanceAfter: winnerNewBalance,
        description: `Coinflip výhra: ${payout.toString()} ST (poplatek: ${fee.toString()} ST)`,
        metadata: { gameId: id, fee: fee.toString(), result },
      },
    });

    // Update game
    const updated = await tx.coinflipGame.update({
      where: { id },
      data: {
        joinerId: userId,
        winnerId,
        result,
        status: 'FINISHED',
        resolvedAt: new Date(),
      },
      include: {
        creator: { select: { username: true } },
        joiner: { select: { username: true } },
      },
    });

    // Emit activity event
    const creatorUsername = game.creator.username;
    const winnerName = creatorWins ? creatorUsername : joiner.username;
    await tx.activityEvent.create({
      data: {
        type: 'COINFLIP',
        payload: {
          username: winnerName,
          amount: payout.toString(),
          wager: wager.toString(),
          result,
        },
      },
    });

    return updated;
  });

  res.json({
    game: resolvedGame,
    result,
    winnerId,
    payout: payout.toString(),
    fee: fee.toString(),
  });
}

// POST /api/coinflip/cancel/:id
export async function cancelGame(req: Request, res: Response) {
  const userId = (req as any).userId;
  const id = req.params.id as string;

  const game = await prisma.coinflipGame.findUnique({ where: { id } });
  if (!game) throw new AppError('Hra nenalezena.', 404);
  if (game.creatorId !== userId) throw new AppError('Můžete zrušit pouze vlastní hru.', 403);
  if (game.status !== 'WAITING') throw new AppError('Tuto hru nelze zrušit.', 400);

  const wager = new Decimal(game.amount.toString());

  await prisma.$transaction(async (tx) => {
    // Refund creator
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balance = new Decimal(user.balance.toString());
    const newBalance = balance.add(wager);

    await tx.user.update({
      where: { id: userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        type: 'COINFLIP_WIN', // refund
        amount: wager,
        receiverId: userId,
        balanceBefore: balance,
        balanceAfter: newBalance,
        description: `Coinflip vrácení sázky: ${wager.toString()} ST`,
        metadata: { gameId: id, action: 'refund' },
      },
    });

    await tx.coinflipGame.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  });

  res.json({ message: 'Hra byla zrušena a sázka vrácena.' });
}

// GET /api/coinflip/games
export async function listGames(req: Request, res: Response) {
  const games = await prisma.coinflipGame.findMany({
    where: { status: 'WAITING' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      creator: { select: { username: true } },
    },
  });

  res.json({ games });
}

// GET /api/coinflip/history
export async function gameHistory(req: Request, res: Response) {
  const userId = (req as any).userId;

  const games = await prisma.coinflipGame.findMany({
    where: {
      status: 'FINISHED',
      OR: [{ creatorId: userId }, { joinerId: userId }],
    },
    orderBy: { resolvedAt: 'desc' },
    take: 20,
    include: {
      creator: { select: { username: true } },
      joiner: { select: { username: true } },
    },
  });

  res.json({ games });
}

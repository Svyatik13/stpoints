import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

const HOUSE_FEE = 0.03; // 3%
const ROUND_DURATION_MS = 30000; // 30 seconds

export async function getActiveRound() {
  let round = await prisma.wheelRound.findFirst({
    where: { status: { in: ['WAITING', 'COUNTDOWN'] } },
    include: {
      bets: {
        include: { user: { select: { id: true, username: true } } }
      }
    }
  });

  if (!round) {
    round = await prisma.wheelRound.create({
      data: { status: 'WAITING', totalAmount: 0 },
      include: {
        bets: {
          include: { user: { select: { id: true, username: true } } }
        }
      }
    });
  }

  return round;
}

export async function placeBet(userId: string, amount: number) {
  if (amount < 0.5) throw new AppError('Minimální sázka je 0.5 ST.', 400);

  return await prisma.$transaction(async (tx) => {
    // 1. Check user balance
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || new Decimal(user.balance).lt(amount)) {
      throw new AppError('Nedostatečný zůstatek.', 400);
    }

    // 2. Get active round
    let round = await tx.wheelRound.findFirst({
      where: { status: { in: ['WAITING', 'COUNTDOWN'] } },
      include: { bets: true }
    });

    if (!round || round.status === 'FINISHED') {
      round = await tx.wheelRound.create({
        data: { status: 'WAITING', totalAmount: 0 },
        include: { bets: true }
      });
    }

    // 3. Deduct balance
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } }
    });

    // 4. Record transaction
    await tx.transaction.create({
      data: {
        type: 'WHEEL_LOSS',
        amount: amount,
        receiverId: userId,
        balanceBefore: user.balance,
        balanceAfter: new Decimal(user.balance).sub(amount),
        description: `Sázka do Wheel round #${round.id.slice(-6)}`
      }
    });

    // 5. Calculate segments
    const currentTotal = Number(round.totalAmount);
    const newTotal = currentTotal + amount;
    const segmentStart = currentTotal === 0 ? 0 : (currentTotal / newTotal) * 100;
    const segmentEnd = 100;

    // Shift previous bets segments to fit the new total (since their % changed)
    // Actually, we can just store the amount and calculate slices on effectively every read, 
    // but storing segment boundaries at the time of resolution is easier for the "Winning Number" logic.
    // For now, we'll store them relative to the current round state.
    
    const bet = await tx.wheelBet.create({
      data: {
        roundId: round.id,
        userId: userId,
        amount: amount,
        segmentStart: 0, // We'll recalculate all segments on resolution or broadcast
        segmentEnd: 0
      }
    });

    // 6. Update round total
    const updatedRound = await tx.wheelRound.update({
      where: { id: round.id },
      data: { 
        totalAmount: { increment: amount },
        // Start countdown if it's the 2nd player
        ...(round.status === 'WAITING' && round.bets.length >= 1 ? {
          status: 'COUNTDOWN',
          endsAt: new Date(Date.now() + ROUND_DURATION_MS)
        } : {})
      },
      include: {
        bets: {
          include: { user: { select: { id: true, username: true } } }
        }
      }
    });

    return updatedRound;
  });
}

export async function resolveRound(roundId: string) {
  return await prisma.$transaction(async (tx) => {
    const round = await tx.wheelRound.findUnique({
      where: { id: roundId },
      include: { bets: { include: { user: true } } }
    });

    if (!round || round.status !== 'COUNTDOWN') return null;

    // 1. Pick winner
    const winningNumber = Math.random() * 100;
    let accumulated = 0;
    let winnerBet = null;
    const total = Number(round.totalAmount);

    // Assign slices dynamically for resolution
    for (const bet of round.bets) {
      const sliceSize = (Number(bet.amount) / total) * 100;
      const start = accumulated;
      const end = accumulated + sliceSize;
      
      // Update bet with its final segments for history
      await tx.wheelBet.update({
        where: { id: bet.id },
        data: { segmentStart: start, segmentEnd: end }
      });

      if (winningNumber >= start && winningNumber < end) {
        winnerBet = bet;
      }
      accumulated = end;
    }

    if (!winnerBet) {
      // Fallback to last bet if precision issues occur
      winnerBet = round.bets[round.bets.length - 1];
    }

    // 2. Calculate payout
    const pot = Number(round.totalAmount);
    const fee = pot * HOUSE_FEE;
    const payout = pot - fee;

    // 3. Update winner balance
    await tx.user.update({
      where: { id: winnerBet.userId },
      data: { balance: { increment: payout } }
    });

    // 4. Record win transaction
    await tx.transaction.create({
      data: {
        type: 'WHEEL_WIN',
        amount: payout,
        receiverId: winnerBet.userId,
        balanceBefore: winnerBet.user.balance,
        balanceAfter: new Decimal(winnerBet.user.balance).add(payout),
        description: `Výhra ve Wheel round #${round.id.slice(-6)}`,
        metadata: { pot, fee, winningNumber }
      }
    });

    // 5. Mark round finished
    return await tx.wheelRound.update({
      where: { id: round.id },
      data: {
        status: 'FINISHED',
        winnerId: winnerBet.userId,
        winningNumber: winningNumber,
        resolvedAt: new Date()
      },
      include: {
        bets: {
          include: { user: { select: { id: true, username: true } } }
        }
      }
    });
  });
}

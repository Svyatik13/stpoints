import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// GET /api/invest/stocks — get available stocks and current prices
export async function getStocks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const stocks = await prisma.stock.findMany({
      include: {
        history: {
          orderBy: { timestamp: 'desc' },
          take: 24, // last 24 points for the graph
        },
        investments: {
          where: { userId },
          select: { shares: true, amount: true, avgPrice: true }
        }
      },
      orderBy: { symbol: 'asc' },
    });

    res.json({ stocks });
  } catch (error) { next(error); }
}

// POST /api/invest/buy — buy shares
export async function buyStock(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { stockId, amount } = z.object({
      stockId: z.string(),
      amount: z.string().refine(v => parseFloat(v) >= 1, 'Minimální investice je 1 ST'),
    }).parse(req.body);

    const investmentAmount = new Decimal(amount);

    const result = await prisma.$transaction(async (tx: any) => {
      const stock = await tx.stock.findUnique({ where: { id: stockId } });
      if (!stock) throw new AppError('Akcie nenalezena.', 404);

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
      const balance = new Decimal(user.balance.toString());

      if (balance.lt(investmentAmount)) {
        throw new AppError(`Nedostatečný zůstatek. Potřebujete ${investmentAmount} ST.`, 403);
      }

      const currentPrice = new Decimal(stock.currentPrice.toString());
      const sharesToBuy = investmentAmount.div(currentPrice).toDecimalPlaces(6, Decimal.ROUND_DOWN);

      if (sharesToBuy.isZero()) throw new AppError('Částka je příliš malá na nákup ani jedné tisíciny akcie.', 400);

      // Deduct ST
      const newBalance = balance.sub(investmentAmount);
      await tx.user.update({ where: { id: userId }, data: { balance: newBalance } });

      // Update or create investment
      const existing = await tx.userInvestment.findUnique({
        where: { userId_stockId: { userId, stockId } }
      });

      if (existing) {
        const totalShares = new Decimal(existing.shares.toString()).add(sharesToBuy);
        const totalAmount = new Decimal(existing.amount.toString()).add(investmentAmount);
        const avgPrice = totalAmount.div(totalShares).toDecimalPlaces(6);

        await tx.userInvestment.update({
          where: { id: existing.id },
          data: { shares: totalShares, amount: totalAmount, avgPrice }
        });
      } else {
        await tx.userInvestment.create({
          data: {
            userId,
            stockId,
            shares: sharesToBuy,
            amount: investmentAmount,
            avgPrice: currentPrice,
          }
        });
      }

      // Record transaction
      await tx.transaction.create({
        data: {
          type: 'INVESTMENT_BUY',
          amount: investmentAmount,
          receiverId: userId,
          senderId: userId,
          balanceBefore: balance,
          balanceAfter: newBalance,
          description: `Nákup ${sharesToBuy.toString()} ks ${stock.symbol} (@${currentPrice.toString()} ST)`,
        },
      });

      return { sharesBought: sharesToBuy.toString(), currentPrice: currentPrice.toString() };
    });

    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

// POST /api/invest/sell — sell shares
export async function sellStock(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { stockId, shares } = z.object({
      stockId: z.string(),
      shares: z.string().refine(v => parseFloat(v) > 0, 'Počet akcií musí být kladný'),
    }).parse(req.body);

    const sharesToSell = new Decimal(shares);

    const result = await prisma.$transaction(async (tx: any) => {
      const stock = await tx.stock.findUnique({ where: { id: stockId } });
      if (!stock) throw new AppError('Akcie nenalezena.', 404);

      const investment = await tx.userInvestment.findUnique({
        where: { userId_stockId: { userId, stockId } }
      });

      if (!investment || new Decimal(investment.shares.toString()).lt(sharesToSell)) {
        throw new AppError('Nemáte dostatek akcií k prodeji.', 403);
      }

      const currentPrice = new Decimal(stock.currentPrice.toString());
      const payoutAmount = sharesToSell.mul(currentPrice).toDecimalPlaces(6, Decimal.ROUND_DOWN);

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
      const balance = new Decimal(user.balance.toString());
      const newBalance = balance.add(payoutAmount);

      // Update balance
      await tx.user.update({ where: { id: userId }, data: { balance: newBalance } });

      // Update or delete investment
      const remainingShares = new Decimal(investment.shares.toString()).sub(sharesToSell);
      if (remainingShares.isZero()) {
        await tx.userInvestment.delete({ where: { id: investment.id } });
      } else {
        const remainingAmount = remainingShares.mul(new Decimal(investment.avgPrice.toString())).toDecimalPlaces(6);
        await tx.userInvestment.update({
          where: { id: investment.id },
          data: { shares: remainingShares, amount: remainingAmount }
        });
      }

      // Record transaction
      await tx.transaction.create({
        data: {
          type: 'INVESTMENT_SELL',
          amount: payoutAmount,
          receiverId: userId,
          senderId: userId,
          balanceBefore: balance,
          balanceAfter: newBalance,
          description: `Prodej ${sharesToSell.toString()} ks ${stock.symbol} (@${currentPrice.toString()} ST)`,
        },
      });

      return { payoutAmount: payoutAmount.toString(), currentPrice: currentPrice.toString() };
    });

    res.json({ success: true, ...result });
  } catch (error) { next(error); }
}

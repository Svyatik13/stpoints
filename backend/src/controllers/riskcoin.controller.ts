import { Request, Response } from 'express';
import prisma from '../config/database';
import { getRiskCoinState } from '../services/riskcoin.service';
import { Decimal } from '@prisma/client/runtime/library';

// Fee percentage
const TRADING_FEE = 0.02; // 2% fee

export const getLiveRiskCoin = async (req: Request, res: Response) => {
  res.json(getRiskCoinState());
};

export const buyRiskCoin = async (req: Request, res: Response) => {
  try {
    const { amountST } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const buyAmount = new Decimal(amountST);
    if (buyAmount.lte(0)) {
      return res.status(400).json({ error: 'Částka musí být větší než 0.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.balance.lt(buyAmount)) {
      return res.status(400).json({ error: 'Nemáte dostatek ST-Points.' });
    }

    const currentState = getRiskCoinState();
    const serverPrice = new Decimal(currentState.currentPrice);
    
    const feeAmount = buyAmount.mul(TRADING_FEE);
    const costAfterFee = buyAmount.sub(feeAmount);
    const sharesBought = costAfterFee.div(serverPrice);

    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: buyAmount },
        riskCoinBalance: { increment: sharesBought }
      }
    });

    res.json({
      message: 'Úspěšně nakoupeno',
      sharesBought: sharesBought.toString(),
      purchasedPrice: serverPrice.toString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sellRiskCoin = async (req: Request, res: Response) => {
  try {
    const { amountCoins } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sellAmount = new Decimal(amountCoins);
    if (sellAmount.lte(0)) {
      return res.status(400).json({ error: 'Množství musí být větší než 0.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.riskCoinBalance.lt(sellAmount)) {
      return res.status(400).json({ error: 'Nemáte tolik Risk-Coinů.' });
    }

    const currentState = getRiskCoinState();
    const serverPrice = new Decimal(currentState.currentPrice);

    const stOutput = sellAmount.mul(serverPrice);
    const feeAmount = stOutput.mul(TRADING_FEE);
    const finalStOutput = stOutput.sub(feeAmount);

    await prisma.user.update({
      where: { id: userId },
      data: {
        riskCoinBalance: { decrement: sellAmount },
        balance: { increment: finalStOutput }
      }
    });

    res.json({
      message: 'Úspěšně prodáno',
      stReceived: finalStOutput.toString(),
      soldPrice: serverPrice.toString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

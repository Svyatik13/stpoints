import { Request, Response, NextFunction } from 'express';
import yahooFinance from 'yahoo-finance2';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// We use a real crypto pair so it trades 24/7, providing a realistic "crypto" feel.
// The user never sees this ticker.
const SECRET_TICKER = 'RNDR-USD'; 
// We can scale the price. RNDR is around $10. Let's multiply by 2 so ST is around 20.
const PRICE_MULTIPLIER = 2.5;

export async function getSTChartData(req: Request, res: Response, next: NextFunction) {
  try {
    const period = (req.query.period as string) || '1mo'; // 1d, 5d, 1mo, 3mo, 6mo, 1y

    let interval: '1m' | '5m' | '15m' | '1h' | '1d' = '1h';
    let period1 = new Date();

    if (period === '1d') {
        interval = '5m';
        period1.setDate(period1.getDate() - 1);
    } else if (period === '5d') {
        interval = '15m';
        period1.setDate(period1.getDate() - 5);
    } else if (period === '1mo') {
        interval = '1h';
        period1.setMonth(period1.getMonth() - 1);
    } else if (period === '3mo') {
        interval = '1d';
        period1.setMonth(period1.getMonth() - 3);
    }

    const result = await yahooFinance.chart(SECRET_TICKER, {
      period1: period1,
      interval: interval,
    });

    if (!result || !result.quotes) {
        return res.json({ symbol: 'ST', data: [] });
    }

    const maskedData = result.quotes
      .filter(q => q.open !== null && q.close !== null)
      .map(quote => ({
        time: Math.floor(quote.date.getTime() / 1000),
        open: quote.open! * PRICE_MULTIPLIER,
        high: quote.high! * PRICE_MULTIPLIER,
        low: quote.low! * PRICE_MULTIPLIER,
        close: quote.close! * PRICE_MULTIPLIER,
        volume: quote.volume || 0
      }));

    res.json({ symbol: 'ST', data: maskedData });
  } catch (error) {
    logger.error('Failed to fetch ST chart data', error);
    next(error);
  }
}

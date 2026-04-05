import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Stocks to seed if not exists
const DEFAULT_STOCKS = [
  { name: 'ZČU Corp', symbol: 'ZCU', price: 100 },
  { name: 'ST-Mining Inc', symbol: 'STMI', price: 50 },
];

/**
 * Price Random Walk Engine
 * All users see synchronized prices because they are stored in the DB.
 */
export async function updateStockPrices() {
  try {
    const stocks = await prisma.stock.findMany();

    // Seed if empty
    if (stocks.length === 0) {
      for (const s of DEFAULT_STOCKS) {
        await prisma.stock.create({
          data: {
            name: s.name,
            symbol: s.symbol,
            currentPrice: new Decimal(s.price),
            lastPrice: new Decimal(s.price),
          }
        });
      }
      return;
    }

    for (const stock of stocks) {
      const current = new Decimal(stock.currentPrice.toString());
      
      // Random walk: change between -2% and +2.1% (slight upward bias)
      const changePercent = (Math.random() * 4.1 - 2) / 100;
      const change = current.mul(new Decimal(changePercent.toString()));
      let nextPrice = current.add(change);

      // Floor price at 1 ST
      if (nextPrice.lt(1)) nextPrice = new Decimal(1);

      await prisma.$transaction([
        // Update stock
        prisma.stock.update({
          where: { id: stock.id },
          data: {
            currentPrice: nextPrice,
            lastPrice: current,
          }
        }),
        // Add to history
        prisma.stockPriceHistory.create({
          data: {
            stockId: stock.id,
            price: nextPrice,
          }
        })
      ]);

      // Cleanup old history (keep last 100 points per stock)
      const count = await prisma.stockPriceHistory.count({ where: { stockId: stock.id } });
      if (count > 100) {
        const oldest = await prisma.stockPriceHistory.findFirst({
          where: { stockId: stock.id },
          orderBy: { timestamp: 'asc' }
        });
        if (oldest) {
          await prisma.stockPriceHistory.delete({ where: { id: oldest.id } });
        }
      }
    }
  } catch (error) {
    logger.error('Stock price update failed:', error);
  }
}

/**
 * Start the price engine interval
 */
export function startStockEngine() {
  // Update every 3 seconds for an intense "Live" feel
  setInterval(updateStockPrices, 3 * 1000);
  // Initial run
  updateStockPrices();
}

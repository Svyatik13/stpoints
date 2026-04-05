import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Stocks to seed if not exists
const DEFAULT_STOCKS = [
  { name: 'ST-Points Token', symbol: 'STP', price: 1.0, volatility: 0.8 },
  { name: 'Nvidia Corp', symbol: 'NVDA', price: 850, volatility: 2.5 },
  { name: 'Tesla Inc', symbol: 'TSLA', price: 170, volatility: 3.5 },
  { name: 'Bitcoin', symbol: 'BTC', price: 65000, volatility: 4.0 },
  { name: 'Ethereum', symbol: 'ETH', price: 3500, volatility: 3.8 },
  { name: 'Apple Inc', symbol: 'AAPL', price: 180, volatility: 1.2 },
  { name: 'Gold Bullion', symbol: 'GOLD', price: 2300, volatility: 0.5 },
  { name: 'ZČU Corp', symbol: 'ZCU', price: 100, volatility: 1.5 },
  { name: 'ST-Mining Inc', symbol: 'STMI', price: 50, volatility: 2.0 },
];

let globalSentiment = 0.0005; // Default slight bullish bias
let sentimentChangeCounter = 0;

/**
 * Price Engine
 * Randomized but influenced by volatility and market sentiment.
 */
export async function updateStockPrices() {
  try {
    const stocks = await prisma.stock.findMany();

    // Update global sentiment every 20 cycles (~1 minute)
    sentimentChangeCounter++;
    if (sentimentChangeCounter > 20) {
      // Shift sentiment between deep bear (-0.005) and sharp bull (+0.005)
      globalSentiment = (Math.random() * 0.01 - 0.005);
      sentimentChangeCounter = 0;
    }

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
      
      // Find stock config for volatility
      const config = DEFAULT_STOCKS.find(s => s.symbol === stock.symbol) || { volatility: 1.0 };
      const volatility = config.volatility;

      // Base move: random between -1 and 1
      let rawMove = (Math.random() * 2 - 1);
      
      // Apply volatility and global sentiment
      // A volatility of 1.0 means typical ±1.5% moves.
      const movePercent = (rawMove * 0.015 * volatility) + globalSentiment;
      
      const change = current.mul(new Decimal(movePercent.toString()));
      let nextPrice = current.add(change);

      // rare black swan events (0.5% chance)
      if (Math.random() < 0.005) {
        const jump = Math.random() < 0.5 ? 0.92 : 1.08; // ±8% jump
        nextPrice = nextPrice.mul(new Decimal(jump.toString()));
      }

      // Floor price at 0.01 ST
      if (nextPrice.lt(0.01)) nextPrice = new Decimal(0.01);

      await prisma.$transaction([
        prisma.stock.update({
          where: { id: stock.id },
          data: {
            currentPrice: nextPrice,
            lastPrice: current,
          }
        }),
        prisma.stockPriceHistory.create({
          data: {
            stockId: stock.id,
            price: nextPrice,
          }
        })
      ]);

      // Cleanup old history (keep last 120 points per stock for charts)
      const count = await prisma.stockPriceHistory.count({ where: { stockId: stock.id } });
      if (count > 120) {
        const toDeleteCount = count - 120;
        const oldestRecords = await prisma.stockPriceHistory.findMany({
          where: { stockId: stock.id },
          orderBy: { timestamp: 'asc' },
          take: toDeleteCount
        });
        
        if (oldestRecords.length > 0) {
          await prisma.stockPriceHistory.deleteMany({
            where: { id: { in: oldestRecords.map(r => r.id) } }
          });
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

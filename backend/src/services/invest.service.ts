import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Stocks to seed if not exists
const DEFAULT_STOCKS = [
  { name: 'ST-Points Token', symbol: 'STP', price: 1.0, volatility: 0.8 },
  { name: 'Nvidia Corp', symbol: 'NVDA', price: 850, volatility: 2.5 },
  { name: 'Bitcoin', symbol: 'BTC', price: 65000, volatility: 4.0 },
  { name: 'ZČU Corp', symbol: 'ZCU', price: 100, volatility: 1.5 },
];

let globalSentiment = 0.0005; // Default slight bullish bias
let sentimentChangeCounter = 0;
const stockMomentum: Record<string, number> = {}; // Tracks momentum per stock for realistic rends

/**
 * Price Engine
 * Produces realistic trends using brownian motion with momentum and occasional black swan events.
 */
export async function updateStockPrices() {
  try {
    const isPaused = await prisma.systemSetting.findUnique({ where: { key: 'market_paused' } });
    if (isPaused?.value === 'true') return; // Don't update prices if market is globally paused

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

      // Initialize momentum if not exists
      if (!stockMomentum[stock.id]) {
        stockMomentum[stock.id] = (Math.random() * 2 - 1) * 0.005;
      }

      // Shift momentum gradually
      const shift = (Math.random() * 2 - 1) * 0.002 * volatility;
      stockMomentum[stock.id] += shift;

      // Cap momentum so it doesn't go to infinity
      const maxMomentum = 0.012 * volatility;
      if (stockMomentum[stock.id] > maxMomentum) stockMomentum[stock.id] = maxMomentum;
      if (stockMomentum[stock.id] < -maxMomentum) stockMomentum[stock.id] = -maxMomentum;

      // Add base random noise
      let rawNoise = (Math.random() * 2 - 1) * 0.004 * volatility;
      
      const movePercent = rawNoise + stockMomentum[stock.id] + globalSentiment;
      
      const change = current.mul(new Decimal(movePercent.toString()));
      let nextPrice = current.add(change);

      // rare black swan events (0.5% chance)
      if (Math.random() < 0.005) {
        const jump = Math.random() < 0.5 ? 0.90 : 1.10; // ±10% jump
        nextPrice = nextPrice.mul(new Decimal(jump.toString()));
      }

      // Floor price at 0.0001 ST limit
      if (nextPrice.lt(0.0001)) nextPrice = new Decimal(0.0001);

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

      // Cleanup old history: keep last 1800 points per stock for nice charts (approx 1.5h at 3s updates)
      const count = await prisma.stockPriceHistory.count({ where: { stockId: stock.id } });
      if (count > 1800) {
        const toDeleteCount = count - 1800;
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

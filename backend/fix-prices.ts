import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DEFAULT_STOCKS = [
  { symbol: 'STP', price: 1.0 },
  { symbol: 'NVDA', price: 850 },
  { symbol: 'BTC', price: 65000 },
  { symbol: 'ZCU', price: 100 },
];

async function main() {
  for (const ds of DEFAULT_STOCKS) {
    const s = await prisma.stock.findFirst({ where: { symbol: ds.symbol } });
    if (s) {
      await prisma.stock.update({ where: { id: s.id }, data: { currentPrice: ds.price, lastPrice: ds.price } });
      await prisma.stockPriceHistory.deleteMany({ where: { stockId: s.id } });
      console.log(`Reset ${ds.symbol} to ${ds.price} and cleared history`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());

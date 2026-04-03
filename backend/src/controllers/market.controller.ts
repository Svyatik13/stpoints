import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const MIN_PRICE = new Decimal('1');
const MARKET_FEE_RATE = new Decimal('0.05'); // 5% selling fee (burned)
const ST_PAYOUT_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

// GET /market — all active listings
export async function getListings(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = req.query;
    const where: any = { status: 'ACTIVE' };
    if (type === 'MYTHIC_PASS' || type === 'USERNAME') where.type = type;

    const listings = await prisma.marketListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { username: true, walletId: true } },
        username: { select: { handle: true } },
      },
    });
    res.json({ listings });
  } catch (error) { next(error); }
}

// POST /market — create listing
export async function createListing(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { type, price, passId, usernameId } = z.object({
      type: z.enum(['MYTHIC_PASS', 'USERNAME']),
      price: z.string().refine(v => parseFloat(v) >= 1, 'Minimální cena je 1 ST'),
      passId: z.string().optional(),
      usernameId: z.string().optional(),
    }).parse(req.body);

    const priceDecimal = new Decimal(price);

    if (type === 'MYTHIC_PASS') {
      if (!passId) throw new AppError('Musíte zadat ID passu.', 400);
      const pass = await prisma.userPass.findUnique({ where: { id: passId } });
      if (!pass || pass.userId !== userId) throw new AppError('Pass nenalezen.', 404);
      if (pass.isUsed) throw new AppError('Pass je již použitý.', 400);

      // Check not already listed
      const existing = await prisma.marketListing.findFirst({ where: { passId, status: 'ACTIVE' } });
      if (existing) throw new AppError('Tento pass je již na tržišti.', 409);

      const listing = await prisma.marketListing.create({
        data: { type: 'MYTHIC_PASS', price: priceDecimal, sellerId: userId, passId },
        include: { seller: { select: { username: true } } },
      });
      return res.status(201).json({ listing });
    }

    if (type === 'USERNAME') {
      if (!usernameId) throw new AppError('Musíte zadat ID handleru.', 400);
      const uname = await prisma.username.findUnique({ where: { id: usernameId } });
      if (!uname || uname.ownerId !== userId || !uname.isActive) throw new AppError('Handle nenalezen.', 404);
      // Cooldown disabled for testing
      // if (new Date() < uname.canSellAt) {
      //   const hoursLeft = Math.ceil((uname.canSellAt.getTime() - Date.now()) / 3600000);
      //   throw new AppError(`Handle lze prodat až za ${hoursLeft} hod (24h cooldown).`, 400);
      // }

      const existing = await prisma.marketListing.findFirst({ where: { usernameId, status: 'ACTIVE' } });
      if (existing) throw new AppError('Tento handle je již na tržišti.', 409);

      const listing = await prisma.marketListing.create({
        data: { type: 'USERNAME', price: priceDecimal, sellerId: userId, usernameId },
        include: { seller: { select: { username: true } }, username: { select: { handle: true } } },
      });
      return res.status(201).json({ listing });
    }
  } catch (error) { next(error); }
}

// POST /market/:id/buy — buy a listing
export async function buyListing(req: Request, res: Response, next: NextFunction) {
  try {
    const buyerId = req.user!.userId;
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx: any) => {
      const listing = await tx.marketListing.findUnique({
        where: { id },
        include: { username: true },
      });

      if (!listing || listing.status !== 'ACTIVE') throw new AppError('Inzerce nenalezena nebo již není aktivní.', 404);
      if (listing.sellerId === buyerId) throw new AppError('Nemůžete koupit vlastní inzerci.', 400);

      const buyer = await tx.user.findUniqueOrThrow({ where: { id: buyerId }, select: { balance: true } });
      const buyerBalance = new Decimal(buyer.balance.toString());
      const price = new Decimal(listing.price.toString());

      if (buyerBalance.lt(price)) throw new AppError(`Nedostatečný zůstatek. Potřebujete ${price} ST.`, 403);

      const soldAt = new Date();
      const stDueAt = new Date(soldAt.getTime() + ST_PAYOUT_DELAY_MS);

      // Deduct ST from buyer immediately
      await tx.user.update({ where: { id: buyerId }, data: { balance: { decrement: price } } });

      // Record buyer payment transaction
      await tx.transaction.create({
        data: {
          type: 'MARKET_PURCHASE',
          amount: price,
          description: listing.type === 'MYTHIC_PASS' ? 'Market: koupě Mythic Pass' : `Market: koupě handle @${listing.username?.handle}`,
          senderId: buyerId,
          receiverId: listing.sellerId,
          balanceBefore: buyerBalance,
          balanceAfter: buyerBalance.sub(price),
        },
      });

      // Transfer the item to buyer
      if (listing.type === 'MYTHIC_PASS' && listing.passId) {
        await tx.userPass.update({ where: { id: listing.passId }, data: { userId: buyerId } });
      } else if (listing.type === 'USERNAME' && listing.usernameId) {
        await tx.username.update({ where: { id: listing.usernameId }, data: { ownerId: buyerId } });
      }

      // Mark listing as sold with payout schedule
      const updated = await tx.marketListing.update({
        where: { id },
        data: { status: 'SOLD', buyerId, soldAt, stDueAt },
      });

      return updated;
    });

    logger.info(`Market: listing ${id} bought by ${buyerId}, ST payout scheduled`);
    res.json({ listing: result, message: 'Koupě úspěšná! Prodávající dostane ST po 2 hodinách.' });
  } catch (error) { next(error); }
}

// DELETE /market/:id — cancel listing
export async function cancelListing(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const listing = await prisma.marketListing.findUnique({ where: { id } });
    if (!listing || listing.sellerId !== userId) throw new AppError('Inzerce nenalezena.', 404);
    if (listing.status !== 'ACTIVE') throw new AppError('Inzerci nelze stáhnout.', 400);

    await prisma.marketListing.update({ where: { id }, data: { status: 'CANCELLED' } });
    res.json({ success: true });
  } catch (error) { next(error); }
}

// GET /market/my — my listings
export async function getMyListings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const listings = await prisma.marketListing.findMany({
      where: { OR: [{ sellerId: userId }, { buyerId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { username: true } },
        buyer: { select: { username: true } },
        username: { select: { handle: true } },
      },
    });
    res.json({ listings });
  } catch (error) { next(error); }
}

// Background job: process pending ST payouts (call every 5 min)
export async function processPendingPayouts() {
  try {
    const pending = await prisma.marketListing.findMany({
      where: {
        status: 'SOLD',
        stPaidAt: null,
        stDueAt: { lte: new Date() },
      },
      include: {
        seller: { select: { balance: true } },
        username: { select: { handle: true } },
      },
    });

    for (const listing of pending) {
      try {
        await prisma.$transaction(async (tx: any) => {
          const seller = await tx.user.findUniqueOrThrow({ where: { id: listing.sellerId }, select: { balance: true } });
          const sellerBalance = new Decimal(seller.balance.toString());
          const price = new Decimal(listing.price.toString());
          const fee = price.mul(MARKET_FEE_RATE).toDecimalPlaces(6, Decimal.ROUND_UP);
          const payout = price.sub(fee);

          await tx.user.update({ where: { id: listing.sellerId }, data: { balance: { increment: payout } } });
          await tx.transaction.create({
            data: {
              type: 'MARKET_SALE',
              amount: payout,
              description: listing.type === 'MYTHIC_PASS'
                ? `Market: prodej Mythic Pass (poplatek ${fee} ST)`
                : `Market: prodej handle @${listing.username?.handle} (poplatek ${fee} ST)`,
              receiverId: listing.sellerId,
              senderId: listing.buyerId!,
              balanceBefore: sellerBalance,
              balanceAfter: sellerBalance.add(payout),
            },
          });
          await tx.marketListing.update({ where: { id: listing.id }, data: { stPaidAt: new Date() } });
        });
        logger.info(`Market payout: listing ${listing.id} → seller ${listing.sellerId}`);
      } catch (e) {
        logger.error(`Market payout failed for listing ${listing.id}: ${e}`);
      }
    }
  } catch (e) {
    logger.error(`Market payout job error: ${e}`);
  }
}

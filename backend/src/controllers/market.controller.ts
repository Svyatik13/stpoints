import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { placeBidSchema } from '../validators/market.validator';
import { logActivity } from '../services/activity.service';

const MIN_PRICE = new Decimal('1');
const MARKET_FEE_RATE = new Decimal('0.05'); // 5% selling fee (burned)
const ST_PAYOUT_DELAY_MS = 2 * 60 * 60 * 1000; // 2 hours

// GET /market — all listings with sorting and filtering
export async function getListings(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, filter, sort } = req.query;
    
    // Status filter
    const where: any = {};
    if (filter === 'SOLD') {
      where.status = 'SOLD';
    } else {
      where.status = 'ACTIVE';
    }

    // Type filter
    if (type === 'MYTHIC_PASS' || type === 'USERNAME') where.type = type;
    if (filter === 'AUCTION') where.isAuction = true;
    if (filter === 'DIRECT') where.isAuction = false;

    // Sorting
    let orderBy: any = { createdAt: 'desc' }; // default: Recently listed
    if (sort === 'PRICE_ASC') orderBy = { price: 'asc' };
    if (sort === 'PRICE_DESC') orderBy = { price: 'desc' };
    if (sort === 'ENDING_SOON') orderBy = { endsAt: 'asc' };

    const listings = await prisma.marketListing.findMany({
      where,
      orderBy,
      include: {
        seller: { select: { username: true, address: true } },
        username: { select: { handle: true } },
        buyer: { select: { username: true } },
        _count: { select: { bids: true } },
      },
    }).catch(err => {
      logger.error('Market listing findMany failed:', err);
      throw new AppError('Chyba při načítání inzerce z databáze: ' + err.message, 500);
    });

    res.json({ listings });
  } catch (error) { next(error); }
}

// GET /market/:id — single listing details with bid history
export async function getListing(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const listing = await prisma.marketListing.findUnique({
      where: { id },
      include: {
        seller: { select: { username: true, address: true, createdAt: true } },
        buyer: { select: { username: true } },
        username: { select: { handle: true } },
        bids: {
          orderBy: { amount: 'desc' },
          include: {
            bidder: { select: { username: true, id: true } }
          }
        }
      }
    });

    if (!listing) throw new AppError('Záznam nenalezen.', 404);
    res.json({ listing });
  } catch (error) { next(error); }
}

// POST /market — create listing
export async function createListing(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { type, price, passId, usernameId, isAuction, durationHours, minIncrement, note } = z.object({
      type: z.enum(['MYTHIC_PASS', 'USERNAME']),
      price: z.string().refine(v => parseFloat(v) >= 1, 'Minimální cena je 1 ST'),
      passId: z.string().optional(),
      usernameId: z.string().optional(),
      isAuction: z.boolean().optional().default(false),
      durationHours: z.number().min(1).max(168).optional(), // Max 7 days
      minIncrement: z.string().optional().default('1'),
      note: z.string().max(200).optional(),
    }).parse(req.body);

    const priceDecimal = new Decimal(price);
    const endsAt = isAuction && durationHours ? new Date(Date.now() + durationHours * 3600000) : null;
    const incrementDecimal = new Decimal(minIncrement);

    if (type === 'MYTHIC_PASS') {
      if (!passId) throw new AppError('Musíte zadat ID passu.', 400);
      const pass = await prisma.userPass.findUnique({ where: { id: passId } });
      if (!pass || pass.userId !== userId) throw new AppError('Pass nenalezen.', 404);
      if (pass.isUsed) throw new AppError('Pass je již použitý.', 400);

      const existing = await prisma.marketListing.findFirst({ where: { passId, status: 'ACTIVE' } });
      if (existing) throw new AppError('Tento pass je již na tržišti.', 409);

      const listing = await prisma.marketListing.create({
        data: { 
          type: 'MYTHIC_PASS', 
          price: priceDecimal, 
          sellerId: userId, 
          passId,
          isAuction,
          endsAt,
          minIncrement: isAuction ? incrementDecimal : null,
          startingPrice: isAuction ? priceDecimal : null,
          note
        },
        include: { seller: { select: { username: true } } },
      });
      return res.status(201).json({ listing });
    }

    if (type === 'USERNAME') {
      if (!usernameId) throw new AppError('Musíte zadat ID handleru.', 400);
      const uname = await prisma.username.findUnique({ where: { id: usernameId } });
      if (!uname || uname.ownerId !== userId || !uname.isActive) throw new AppError('Handle nenalezen.', 404);

      const existing = await prisma.marketListing.findFirst({ where: { usernameId, status: 'ACTIVE' } });
      if (existing) throw new AppError('Tento handle je již na tržišti.', 409);

      const listing = await prisma.marketListing.create({
        data: { 
          type: 'USERNAME', 
          price: priceDecimal, 
          sellerId: userId, 
          usernameId,
          isAuction,
          endsAt,
          minIncrement: isAuction ? incrementDecimal : null,
          startingPrice: isAuction ? priceDecimal : null,
          note
        },
        include: { seller: { select: { username: true } }, username: { select: { handle: true } } },
      });
      return res.status(201).json({ listing });
    }
  } catch (error) { next(error); }
}

// POST /market/:id/buy — buy a listing (direct sale)
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
      if (listing.isAuction) throw new AppError('Toto je aukce. Musíte přihodit.', 400);
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

      // Transfer asset to buyer
      if (listing.type === 'MYTHIC_PASS' && listing.passId) {
        await tx.userPass.update({ where: { id: listing.passId }, data: { userId: buyerId } });
      } else if (listing.type === 'USERNAME' && listing.usernameId) {
        await tx.username.update({ where: { id: listing.usernameId }, data: { ownerId: buyerId } });
      }

      // Mark as sold
      const updated = await tx.marketListing.update({
        where: { id },
        data: { status: 'SOLD', buyerId, soldAt, stDueAt },
      });

      return updated;
    });

    res.json({ listing: result, message: 'Koupě úspěšná! Prodávající dostane ST po 2 hodinách.' });
  } catch (error) { next(error); }
}

// POST /market/:id/bid — place a bid in auction
export async function placeBid(req: Request, res: Response, next: NextFunction) {
  try {
    const bidderId = req.user!.userId;
    const { id } = req.params;
    const { amount } = placeBidSchema.parse(req.body);
    const amountNum = parseFloat(amount);
    const bidAmount = new Decimal(amount);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: bidderId } });

    const { updatedListing, bid } = await prisma.$transaction(async (tx: any) => {
      const listing = await tx.marketListing.findUnique({
        where: { id },
        include: { bids: { orderBy: { amount: 'desc' }, take: 1 }, username: true },
      });

      if (!listing || listing.status !== 'ACTIVE' || !listing.isAuction) {
        throw new AppError('Aukce nenalezena nebo již není aktivní.', 404);
      }
      if (listing.endsAt && new Date() > listing.endsAt) {
        throw new AppError('Aukce již skončila.', 400);
      }
      if (listing.sellerId === bidderId) {
        throw new AppError('Nemůžete přihazovat ve vlastní aukci.', 400);
      }

      const currentHighest = listing.bids[0];
      const minRequired = currentHighest 
        ? new Decimal(currentHighest.amount.toString()).add(new Decimal(listing.minIncrement?.toString() || '1'))
        : new Decimal(listing.price.toString());

      if (bidAmount.lt(minRequired)) {
        throw new AppError(`Minimální příhoz je ${minRequired} ST.`, 400);
      }

      const bidder = await tx.user.findUniqueOrThrow({ where: { id: bidderId }, select: { balance: true } });
      const bidderBalance = new Decimal(bidder.balance.toString());

      if (bidderBalance.lt(bidAmount)) {
        throw new AppError(`Nedostatečný zůstatek. Potřebujete ${bidAmount} ST.`, 403);
      }

      // 1. Refund previous highest bidder
      if (currentHighest) {
        const prevBidder = await tx.user.findUnique({ where: { id: currentHighest.bidderId }, select: { balance: true } });
        if (prevBidder) {
          const prevBidderBalance = new Decimal(prevBidder.balance.toString());
          const refundAmount = new Decimal(currentHighest.amount.toString());

          await tx.user.update({
            where: { id: currentHighest.bidderId },
            data: { balance: { increment: refundAmount } },
          });

          await tx.transaction.create({
            data: {
              type: 'AUCTION_REFUND',
              amount: refundAmount,
              description: `Vrácení přehozené nabídky: ${listing.type === 'USERNAME' ? `@${listing.username?.handle}` : 'Mythic Pass'}`,
              receiverId: currentHighest.bidderId,
              senderId: bidderId,
              balanceBefore: prevBidderBalance,
              balanceAfter: prevBidderBalance.add(refundAmount),
            },
          });
        }
      }

      // 2. Deduct ST from new bidder
      await tx.user.update({
        where: { id: bidderId },
        data: { balance: { decrement: bidAmount } },
      });

      await tx.transaction.create({
        data: {
          type: 'MARKET_PURCHASE',
          amount: bidAmount,
          description: `Příhoz v aukci: ${listing.type === 'USERNAME' ? `@${listing.username?.handle}` : 'Mythic Pass'}`,
          senderId: bidderId,
          receiverId: listing.sellerId,
          balanceBefore: bidderBalance,
          balanceAfter: bidderBalance.sub(bidAmount),
        },
      });

      // 3. Create Bid record
      const bid = await tx.bid.create({
        data: {
          listingId: id,
          bidderId,
          amount: bidAmount,
        },
      });

      // 4. Update Listing
      let newEndsAt = listing.endsAt;
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (listing.endsAt && (listing.endsAt.getTime() - Date.now()) < FIVE_MINUTES) {
        newEndsAt = new Date(Date.now() + FIVE_MINUTES);
      }

      const updatedListing = await tx.marketListing.update({
        where: { id },
        data: {
          currentHighestBid: bidAmount,
          endsAt: newEndsAt,
          buyerId: bidderId,
        },
        include: { username: true }
      });

      return { updatedListing, bid };
    });

    // 6. Log activity
    await logActivity('BID', {
      username: user.username,
      amount: amountNum,
      item: updatedListing.type === 'USERNAME' ? `@${updatedListing.username?.handle}` : 'Mythic Pass',
    });

    res.json({ message: 'Nabídka potvrzena!', listing: updatedListing });
  } catch (error) { next(error); }
}

// DELETE /market/:id — cancel listing
export async function cancelListing(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

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

// Background jobs
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
          const seller = await tx.user.findUniqueOrThrow({ where: { id: listing.sellerId } });
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
      } catch (e) { logger.error(`Market payout failed for listing ${listing.id}: ${e}`); }
    }
  } catch (e) { logger.error(`Market payout job error: ${e}`); }
}

export async function processExpiredAuctions() {
  try {
    const expired = await prisma.marketListing.findMany({
      where: {
        isAuction: true,
        status: 'ACTIVE',
        endsAt: { lte: new Date() },
      },
      include: {
        bids: { orderBy: { amount: 'desc' }, take: 1 },
      },
    });

    for (const listing of expired) {
      try {
        await prisma.$transaction(async (tx: any) => {
          const highestBid = listing.bids[0];
          if (!highestBid) {
            await tx.marketListing.update({ where: { id: listing.id }, data: { status: 'CANCELLED' } });
            return;
          }
          const soldAt = new Date();
          const stDueAt = new Date(soldAt.getTime() + ST_PAYOUT_DELAY_MS);
          if (listing.type === 'MYTHIC_PASS' && listing.passId) {
            await tx.userPass.update({ where: { id: listing.passId }, data: { userId: highestBid.bidderId } });
          } else if (listing.type === 'USERNAME' && listing.usernameId) {
            await tx.username.update({ where: { id: listing.usernameId }, data: { ownerId: highestBid.bidderId } });
          }
          await tx.marketListing.update({
            where: { id: listing.id },
            data: { 
              status: 'SOLD', 
              buyerId: highestBid.bidderId, 
              soldAt, 
              stDueAt,
              price: highestBid.amount
            },
          });
        });
      } catch (e) { logger.error(`Settle auction failed for ${listing.id}: ${e}`); }
    }
  } catch (e) { logger.error(`Settle auction job error: ${e}`); }
}

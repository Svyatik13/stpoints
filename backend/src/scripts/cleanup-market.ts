import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import prisma from '../config/database';
import { logger } from '../utils/logger';

async function run() {
  logger.info('🚀 Starting market cleanup script...');
  
  const listings = await prisma.marketListing.findMany({
    include: {
      seller: true,
      username: true,
    }
  });

  logger.info(`Checking ${listings.length} listings...`);
  let deletedCount = 0;

  for (const listing of listings) {
    let shouldDelete = false;
    let reason = '';

    if (!listing.seller) {
      shouldDelete = true;
      reason = 'Seller missing';
    } else if (listing.type === 'USERNAME' && !listing.username) {
      shouldDelete = true;
      reason = 'Username record missing for USERNAME type listing';
    }

    if (shouldDelete) {
      logger.warn(`Deleting orphaned listing ${listing.id}: ${reason}`);
      await prisma.marketListing.delete({ where: { id: listing.id } });
      deletedCount++;
    }
  }

  logger.success(`✅ Done! Deleted ${deletedCount} orphaned listings.`);
}

run()
  .catch(e => {
    logger.error('Cleanup failed: ' + e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

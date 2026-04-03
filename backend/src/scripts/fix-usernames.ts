import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import prisma from '../config/database';
import { logger } from '../utils/logger';

async function run() {
  logger.info('🚀 Starting fix-usernames script...');
  
  const users = await prisma.user.findMany({
    include: { usernames: true }
  });

  logger.info(`Found ${users.length} users to check.`);
  let createdCount = 0;

  for (const user of users) {
    const primaryHandle = user.username.toLowerCase();
    const hasPrimaryHandle = user.usernames.some(u => u.handle === primaryHandle);

    if (!hasPrimaryHandle) {
      logger.info(`Creating handle @${primaryHandle} for user ${user.username}...`);
      
      const canSellAt = new Date(user.createdAt);
      canSellAt.setHours(canSellAt.getHours() + 24);
      
      // If user joined more than 24h ago, they can sell now
      const finalCanSellAt = canSellAt < new Date() ? canSellAt : canSellAt;

      await prisma.username.create({
        data: {
          handle: primaryHandle,
          ownerId: user.id,
          canSellAt: finalCanSellAt,
        }
      });
      createdCount++;
    }
  }

  logger.success(`✅ Done! Created ${createdCount} missing handles.`);
}

run()
  .catch(e => {
    logger.error('Script failed: ' + e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

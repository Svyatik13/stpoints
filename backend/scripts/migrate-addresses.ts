import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function walletAddress(userId: string): string {
  const hash = crypto.createHash('sha256').update(`stpoints-wallet:${userId}`).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}

async function migrate() {
  console.log('🚀 Starting address migration...');
  
  const users = await prisma.user.findMany({
    where: { address: null },
    select: { id: true, username: true }
  });

  console.log(`Found ${users.length} users to migrate.`);

  for (const user of users) {
    const address = walletAddress(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { address }
    });
    console.log(`✅ Migrated: ${user.username} -> ${address}`);
  }

  console.log('✨ Migration complete!');
}

migrate()
  .catch(e => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

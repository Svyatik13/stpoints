import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stpoints.fun' },
    update: {},
    create: {
      username: 'ZCU_Admin',
      email: 'admin@stpoints.fun',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      balance: 1000,
    },
  });

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123!', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@stpoints.fun' },
    update: {},
    create: {
      username: 'demo_user',
      email: 'demo@stpoints.fun',
      passwordHash: demoPassword,
      role: Role.USER,
      balance: 0,
    },
  });

  console.log('✅ Admin user created:', admin.username);
  console.log('✅ Demo user created:', demo.username);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

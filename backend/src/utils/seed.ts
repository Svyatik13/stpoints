import prisma from '../config/database';
import { logger } from './logger';

export async function seedDefaults() {
  try {
    // Seed default teachers if none exist
    const teacherCount = await prisma.teacher.count();
    if (teacherCount === 0) {
      logger.info('Seeding default ST-ROOM teachers...');
      const defaultTeachers = [
        'K Vlna', 'P. Lukešová', 'E. Šplíchalová', 'J. Ježík', 
        'P. Sobotka', 'N. Skálová', 'J. Anderle', 'L. Zavadilová', 
        'V. Kolář', 'S. Smitka', 'K. Bartáková', 'M. Skřivanová', 'V. Burešová'
      ];
      await prisma.teacher.createMany({
        data: defaultTeachers.map(name => ({ name }))
      });
      logger.success('✅ Teachers seeded successfully.');
    }

    // Seed default cases if none exist
    const caseCount = await prisma.case.count();
    if (caseCount === 0) {
      logger.info('Seeding default cases...');
      const defaultCases = [
        {
          name: '🎁 Denní Case', description: 'Zdarma jednou za den — malé odměny a šance na Mythic Pass!',
          price: 0, isDaily: true, sortOrder: 0,
          items: [
            { type: 'ST_REWARD', label: '0.05 ST', amount: 0.05, weight: 35 },
            { type: 'ST_REWARD', label: '0.10 ST', amount: 0.10, weight: 30 },
            { type: 'ST_REWARD', label: '0.12 ST', amount: 0.12, weight: 15 },
            { type: 'ST_REWARD', label: '0.15 ST', amount: 0.15, weight: 12 },
            { type: 'ST_REWARD', label: '0.20 ST', amount: 0.20, weight: 6 },
            { type: 'MYTHIC_PASS', label: '🌈 Mythic Pass', amount: null, weight: 2 },
          ]
        },
        {
          name: '📦 Starter Case', description: 'Základní case za 10 ST. 30 % šance na profit.',
          price: 10, isDaily: false, sortOrder: 1,
          items: [
            { type: 'ST_REWARD', label: '5 ST', amount: 5, weight: 25 },
            { type: 'ST_REWARD', label: '7 ST', amount: 7, weight: 25 },
            { type: 'ST_REWARD', label: '10 ST', amount: 10, weight: 20 },
            { type: 'ST_REWARD', label: '12 ST', amount: 12, weight: 15 },
            { type: 'ST_REWARD', label: '15 ST', amount: 15, weight: 12 },
            { type: 'MYTHIC_PASS', label: '🌈 Mythic Pass', amount: null, weight: 3 },
          ]
        },
        {
          name: '💎 Premium Case', description: 'Premium case za 25 ST. Větší odměny a lepší šance.',
          price: 25, isDaily: false, sortOrder: 2,
          items: [
            { type: 'ST_REWARD', label: '18 ST', amount: 18, weight: 25 },
            { type: 'ST_REWARD', label: '22 ST', amount: 22, weight: 25 },
            { type: 'ST_REWARD', label: '28 ST', amount: 28, weight: 18 },
            { type: 'ST_REWARD', label: '35 ST', amount: 35, weight: 15 },
            { type: 'ST_REWARD', label: '50 ST', amount: 50, weight: 7 },
            { type: 'MYTHIC_PASS', label: '🌈 Mythic Pass', amount: null, weight: 5 },
            { type: 'ST_REWARD', label: '100 ST', amount: 100, weight: 5 },
          ]
        },
        {
          name: '👑 Elite Case', description: 'Elitní case za 50 ST. Nejvyšší šance na Mythic Pass!',
          price: 50, isDaily: false, sortOrder: 3,
          items: [
            { type: 'ST_REWARD', label: '42 ST', amount: 42, weight: 22 },
            { type: 'ST_REWARD', label: '47 ST', amount: 47, weight: 20 },
            { type: 'ST_REWARD', label: '55 ST', amount: 55, weight: 15 },
            { type: 'ST_REWARD', label: '65 ST', amount: 65, weight: 12 },
            { type: 'ST_REWARD', label: '80 ST', amount: 80, weight: 10 },
            { type: 'ST_REWARD', label: '100 ST', amount: 100, weight: 7 },
            { type: 'ST_REWARD', label: '150 ST', amount: 150, weight: 5 },
            { type: 'MYTHIC_PASS', label: '🌈 Mythic Pass', amount: null, weight: 9 },
          ]
        },
      ];
      for (const c of defaultCases) {
        const { items, ...caseFields } = c;
        const created = await prisma.case.create({
          data: { ...caseFields, price: caseFields.price.toString() },
        });
        for (const item of items) {
          await prisma.caseItem.create({
            data: { caseId: created.id, type: item.type as any, label: item.label, amount: item.amount?.toString(), weight: item.weight },
          });
        }
      }
      logger.success('✅ Cases seeded successfully.');
    }
  } catch (err) {
    logger.error('Failed to seed: ' + (err as Error).message);
  }
}

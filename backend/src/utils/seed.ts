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
  } catch (err) {
    logger.error('Failed to seed: ' + (err as Error).message);
  }
}

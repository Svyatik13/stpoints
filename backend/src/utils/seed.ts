import prisma from '../config/database';
import { logger } from './logger';

export async function seedDefaults() {
  try {
    // Other seeds can go here
  } catch (err) {
    logger.error('Failed to seed: ' + (err as Error).message);
  }
}

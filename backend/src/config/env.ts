import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  MINING_DIFFICULTY: z.string().default('5'),
  MINING_REWARD_PER_10K: z.string().default('0.001'),
  MINING_CHALLENGE_EXPIRY_MINUTES: z.string().default('10'),
  MINING_MAX_HASH_RATE: z.string().default('500000'),
  GIVEAWAY_CRON: z.string().default('0 */6 * * *'),
  GIVEAWAY_AMOUNT: z.string().default('0.5'),
  GIVEAWAY_MIN_ACTIVE_HOURS: z.string().default('24'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: parseInt(parsed.data.PORT, 10),
  nodeEnv: parsed.data.NODE_ENV,
  databaseUrl: parsed.data.DATABASE_URL,
  jwt: {
    secret: parsed.data.JWT_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiry: parsed.data.JWT_ACCESS_EXPIRY,
    refreshExpiry: parsed.data.JWT_REFRESH_EXPIRY,
  },
  frontendUrl: parsed.data.FRONTEND_URL,
  mining: {
    difficulty: parseInt(parsed.data.MINING_DIFFICULTY, 10),
    rewardPer10k: parseFloat(parsed.data.MINING_REWARD_PER_10K),
    challengeExpiryMinutes: parseInt(parsed.data.MINING_CHALLENGE_EXPIRY_MINUTES, 10),
    maxHashRate: parseInt(parsed.data.MINING_MAX_HASH_RATE, 10),
  },
  giveaway: {
    cron: parsed.data.GIVEAWAY_CRON,
    amount: parseFloat(parsed.data.GIVEAWAY_AMOUNT),
    minActiveHours: parseInt(parsed.data.GIVEAWAY_MIN_ACTIVE_HOURS, 10),
  },
} as const;

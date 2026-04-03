import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { csrfProtection } from './middleware/csrf';
import { logger } from './utils/logger';
import { startGiveawayCron } from './services/giveaway.service';
import { seedDefaults } from './utils/seed';

// Routes
import authRoutes from './routes/auth.routes';
import miningRoutes from './routes/mining.routes';
import walletRoutes from './routes/wallet.routes';
import giveawayRoutes from './routes/giveaway.routes';
import stroomRoutes from './routes/stroom.routes';
import casesRoutes from './routes/cases.routes';
import adminRoutes from './routes/admin.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import profileRoutes from './routes/profile.routes';
import usernameRoutes from './routes/username.routes';
import marketRoutes from './routes/market.routes';
import usersRoutes from './routes/users.routes';
import vaultRoutes from './routes/vault.routes';
import { processPendingPayouts, processExpiredAuctions } from './controllers/market.controller';
import activityRoutes from './routes/activity.routes';
import { seedAchievements } from './services/achievement.service';
import { processVaultPayouts } from './controllers/vault.controller';

const app = express();
app.set('trust proxy', 1);

// ── Security ──
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parsing ──
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── Rate Limiting ──
app.use(generalLimiter);

// ── CSRF Protection ──
app.use(csrfProtection);

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'ZČU Central Node',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/mining', miningRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/giveaway', giveawayRoutes);
app.use('/api/st-room', stroomRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/usernames', usernameRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/activity', activityRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint nenalezen.' });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
app.listen(env.port, async () => {
  logger.success(`
  ╔══════════════════════════════════════════╗
  ║    ⚡ ZČU CENTRAL NODE — ST-Points ⚡    ║
  ║                                          ║
  ║    Server:  http://localhost:${env.port}        ║
  ║    Env:     ${env.nodeEnv.padEnd(28)}║
  ║    Mining:  Difficulty ${String(env.mining.difficulty).padEnd(19)}║
  ║    Reward:  ${String(env.mining.rewardPer10k)} ST / 10k hashes      ║
  ╚══════════════════════════════════════════╝
  `);

  // Start giveaway cron
  startGiveawayCron();

  // Seed default data if empty
  await seedDefaults().catch(e => logger.error('Seed defaults failed:', e));
  
  // Seed achievements
  await seedAchievements().catch(e => logger.error('Seed achievements failed:', e));

  // Background jobs: run after a short delay for DB stability
  setTimeout(async () => {
    try {
      // Market payout job: process 2h delayed ST transfers every 5 min
      setInterval(processPendingPayouts, 5 * 60 * 1000);
      await processPendingPayouts();
      
      // Vault payouts job: check for unlocked stakes every minute
      setInterval(processVaultPayouts, 60 * 1000);
      await processVaultPayouts();
      
      // Auction settlement job: check for expired auctions every minute
      setInterval(processExpiredAuctions, 60 * 1000);
      await processExpiredAuctions();
      
      logger.success('✅ Background jobs initialized.');
    } catch (e) {
      logger.error('Failed to initialize background jobs:', e);
    }
  }, 1000);
});

export default app;

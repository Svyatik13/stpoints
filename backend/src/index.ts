import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { startGiveawayCron } from './services/giveaway.service';

// Routes
import authRoutes from './routes/auth.routes';
import miningRoutes from './routes/mining.routes';
import walletRoutes from './routes/wallet.routes';
import giveawayRoutes from './routes/giveaway.routes';
import stroomRoutes from './routes/stroom.routes';
import adminRoutes from './routes/admin.routes';

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
app.use('/api/admin', adminRoutes);

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

  // Seed default teachers if none exist
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const count = await prisma.teacher.count();
    if (count === 0) {
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
    logger.error('Failed to seed teachers: ' + (err as Error).message);
  }
});

export default app;

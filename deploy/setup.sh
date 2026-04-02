#!/bin/bash
# ST-Points ISPManager Setup Script
set -e

echo "$(date) — Starting ST-Points setup..." >> ~/setup.log

# 1. Extract archive
cd ~
tar xzf stpoints-deploy.tar.gz 2>> ~/setup.log

# 2. Copy frontend to web root
cp -rf ~/www/* /www/stpoints.fun/ 2>> ~/setup.log
cp -f ~/www/.htaccess /www/stpoints.fun/.htaccess 2>> ~/setup.log
echo "$(date) — Frontend deployed" >> ~/setup.log

# 3. Setup backend
cd ~/backend

# Create .env
cat > .env << 'ENVEOF'
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://stpoints_dev_2024:stpoints_dev_2024@localhost:5432/stpoints
JWT_SECRET=stpoints-prod-jwt-secret-zcu-central-node-2024-x7k9m
JWT_REFRESH_SECRET=stpoints-prod-refresh-secret-zcu-node-2024-p3q8n
FRONTEND_URL=https://stpoints.fun
MINING_DIFFICULTY=5
MINING_REWARD_PER_10K=0.001
MINING_CHALLENGE_EXPIRY_MINUTES=10
MINING_MAX_HASH_RATE=500000
GIVEAWAY_CRON=0 */6 * * *
GIVEAWAY_AMOUNT=0.5
GIVEAWAY_MIN_ACTIVE_HOURS=24
ENVEOF
echo "$(date) — .env created" >> ~/setup.log

# 4. Install dependencies
cd ~/backend
npm install --production=false 2>> ~/setup.log
echo "$(date) — npm install done" >> ~/setup.log

# 5. Setup database
npx prisma generate 2>> ~/setup.log
npx prisma db push 2>> ~/setup.log
echo "$(date) — Database ready" >> ~/setup.log

# 6. Seed database (ignore if already seeded)
npx tsx prisma/seed.ts 2>> ~/setup.log || echo "$(date) — Seed skipped (already exists)" >> ~/setup.log

# 7. Kill any existing backend process
pkill -f "tsx src/index.ts" 2>/dev/null || true
sleep 1

# 8. Start backend
cd ~/backend
nohup npx tsx src/index.ts >> ~/backend.log 2>&1 &
echo $! > ~/backend.pid
echo "$(date) — Backend started (PID: $(cat ~/backend.pid))" >> ~/setup.log
echo "$(date) — SETUP COMPLETE ✅" >> ~/setup.log

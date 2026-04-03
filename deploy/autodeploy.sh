#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
BACKEND_DIR="$HOME/backend"
LOG="$HOME/deploy.log"
MARKER="$HOME/.deployed_head"

# Pull latest
cd "$REPO_DIR"
git pull origin main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# 1. Lock & Disk Cleanup
if [ -f "$HOME/.deploy_in_progress" ]; then
  if test "$(find "$HOME/.deploy_in_progress" -mmin +15)"; then
    rm -f "$HOME/.deploy_in_progress"
  else
    exit 0
  fi
fi
touch "$HOME/.deploy_in_progress"
trap 'rm -f "$HOME/.deploy_in_progress"' EXIT

# Panic Disk Cleanup (Ensure we have space to start)
rm -rf "$REPO_DIR/frontend/node_modules" "$REPO_DIR/frontend/.next"
npm cache clean --force >> "$LOG" 2>&1

# Pull latest
cd "$REPO_DIR"
git pull origin main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# 2. Deploy frontend (Build on server)
cd "$REPO_DIR/frontend"
npm install --no-audit --no-fund >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1

if [ -d "out" ]; then
  rm -rf "$WEB_ROOT"/*
  cp -rf out/* "$WEB_ROOT/"
  cp -f "$REPO_DIR/deploy/www/.htaccess" "$WEB_ROOT/.htaccess" 2>/dev/null
  echo "$(date) — Frontend built and deployed ✅" >> "$LOG"
else
  echo "$(date) — Frontend build FAILED ❌" >> "$LOG"
fi

# IMPORTANT: Free up space by destroying build artifacts
rm -rf node_modules .next

# 3. Deploy backend
cd "$REPO_DIR"
cp -rf "$REPO_DIR/backend/src" "$BACKEND_DIR/"
cp -rf "$REPO_DIR/backend/prisma" "$BACKEND_DIR/"
cp -f "$REPO_DIR/backend/package.json" "$BACKEND_DIR/"
cp -f "$REPO_DIR/backend/package-lock.json" "$BACKEND_DIR/"
cp -f "$REPO_DIR/backend/tsconfig.json" "$BACKEND_DIR/"

cd "$BACKEND_DIR"
npm install --production=false --no-audit --no-fund >> "$LOG" 2>&1
npx prisma generate >> "$LOG" 2>&1
npx prisma db push --accept-data-loss >> "$LOG" 2>&1

# Restart backend
bash "$HOME/start_backend.sh"

# Mark as deployed
echo "$NEW_HEAD" > "$MARKER"
echo "$(date) — FINAL Deploy complete ✅" >> "$LOG"

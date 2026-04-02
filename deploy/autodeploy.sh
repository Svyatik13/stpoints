#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
BACKEND_DIR="$HOME/backend"
LOG="$HOME/deploy.log"

# Clone repo if not exists
if [ ! -d "$REPO_DIR" ]; then
  git clone https://github.com/Svyatik13/stpoints.git "$REPO_DIR" >> "$LOG" 2>&1
  echo "$(date) — Repo cloned" >> "$LOG"
fi

# Pull latest
cd "$REPO_DIR"
OLD_HEAD=$(git rev-parse HEAD)
git pull origin main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# Skip if no changes
if [ "$OLD_HEAD" = "$NEW_HEAD" ]; then
  exit 0
fi

echo "$(date) — New commit detected: $NEW_HEAD" >> "$LOG"

# Deploy frontend
if [ -d "$REPO_DIR/deploy/www" ]; then
  rm -rf "$WEB_ROOT"/*.html "$WEB_ROOT"/*.ico "$WEB_ROOT"/*.svg "$WEB_ROOT"/*.txt
  rm -rf "$WEB_ROOT/_next" "$WEB_ROOT/auth" "$WEB_ROOT/mining" "$WEB_ROOT/wallet" "$WEB_ROOT/terminal" "$WEB_ROOT/worker" "$WEB_ROOT/404" "$WEB_ROOT/_not-found"
  cp -rf "$REPO_DIR/deploy/www/"* "$WEB_ROOT/"
  cp -f "$REPO_DIR/deploy/www/.htaccess" "$WEB_ROOT/.htaccess" 2>/dev/null
  find "$WEB_ROOT" -name '._*' -delete
  echo "$(date) — Frontend deployed" >> "$LOG"
fi

# Deploy backend
if [ -d "$REPO_DIR/backend" ]; then
  # Copy backend source
  cp -rf "$REPO_DIR/backend/src" "$BACKEND_DIR/"
  cp -rf "$REPO_DIR/backend/prisma" "$BACKEND_DIR/"
  cp -f "$REPO_DIR/backend/package.json" "$BACKEND_DIR/"
  cp -f "$REPO_DIR/backend/package-lock.json" "$BACKEND_DIR/"
  cp -f "$REPO_DIR/backend/tsconfig.json" "$BACKEND_DIR/"

  # Install deps if package.json changed
  cd "$BACKEND_DIR"
  npm install --production=false >> "$LOG" 2>&1
  npx prisma generate >> "$LOG" 2>&1

  # Restart backend
  pkill -f "tsx src/index.ts" 2>/dev/null
  sleep 1
  cd "$BACKEND_DIR"
  nohup npx tsx src/index.ts >> "$HOME/backend.log" 2>&1 &
  echo $! > "$HOME/backend.pid"
  echo "$(date) — Backend restarted (PID: $!)" >> "$LOG"
fi

echo "$(date) — Deploy complete ✅" >> "$LOG"

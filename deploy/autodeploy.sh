#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
LOG="$HOME/deploy.log"
MARKER="$HOME/.deployed_head"
PID_FILE="$HOME/backend.pid"

# Helper: kill anything on port 4000 using ps (always available)
kill_backend() {
  echo "$(date) — Killing all backend processes..." >> "$LOG"
  # Kill by PID file first
  if [ -f "$PID_FILE" ]; then
    kill -9 "$(cat "$PID_FILE")" > /dev/null 2>&1
    rm -f "$PID_FILE"
  fi
  # Aggressive pkill for any node/tsx processes owned by the user
  pkill -9 -u "$USER" -f "tsx" > /dev/null 2>&1
  pkill -9 -u "$USER" -f "node" > /dev/null 2>&1
  sleep 5
}

# 1. Lock check (Self-Heal if stuck > 10 mins)
if [ -f "$HOME/.deploy_in_progress" ]; then
  if test "$(find "$HOME/.deploy_in_progress" -mmin +10)"; then
    rm -f "$HOME/.deploy_in_progress"
    echo "$(date) — Stale lock cleared." >> "$LOG"
  else
    exit 0
  fi
fi
touch "$HOME/.deploy_in_progress"
trap 'rm -f "$HOME/.deploy_in_progress"' EXIT

# 2. FORCE SYNC
cd "$REPO_DIR" || exit 1
git fetch --all >> "$LOG" 2>&1
git reset --hard origin/main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# 3. Version & Health Check
BACKEND_RUNNING=0
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" > /dev/null 2>&1; then
    BACKEND_RUNNING=1
  fi
fi

if [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$NEW_HEAD" ]; then
  if [ "$BACKEND_RUNNING" -eq 1 ]; then
    exit 0
  else
    echo "$(date) — Backend dead, restarting..." >> "$LOG"
    kill_backend
    # Inline start (no external script dependency)
    cp "$HOME/.env" "$REPO_DIR/backend/.env" 2>/dev/null
    cd "$REPO_DIR/backend" || exit 1
    export NODE_ENV=production
    nohup ./node_modules/.bin/tsx src/index.ts >> "$HOME/backend.log" 2>&1 &
    echo $! > "$PID_FILE"
    echo "$(date) — Backend restarted on PID $(cat "$PID_FILE")" >> "$LOG"
    exit 0
  fi
fi

echo "$(date) — New commit $NEW_HEAD — FULL deploy..." >> "$LOG"

# 4. Nuclear Disk cleanup
echo "$(date) — Executing Nuclear Cleanup (saving disk space)..." >> "$LOG"
rm -rf "$REPO_DIR/frontend/node_modules" "$REPO_DIR/frontend/.next"
rm -rf "$REPO_DIR/backend/node_modules"
rm -f "$HOME/.npm/_logs/*" 2>/dev/null
npm cache clean --force >> "$LOG" 2>&1

# 5. Frontend build
cd "$REPO_DIR/frontend" || exit 1
rm -rf node_modules .next
npm install --no-audit --no-fund --legacy-peer-deps >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1

if [ -d "out" ]; then
  rm -rf "$WEB_ROOT"/*
  cp -rf out/* "$WEB_ROOT/"
  cp -f "$REPO_DIR/deploy/www/.htaccess" "$WEB_ROOT/.htaccess" 2>/dev/null
  echo "$(date) — Frontend ✅" >> "$LOG"
else
  echo "$(date) — Frontend FAILED ❌" >> "$LOG"
fi
rm -rf node_modules .next

# 6. Backend build
cd "$REPO_DIR/backend" || exit 1
cp "$HOME/.env" .env 2>/dev/null
npm install --no-audit --no-fund >> "$LOG" 2>&1
npx prisma generate >> "$LOG" 2>&1
npx prisma db push --accept-data-loss >> "$LOG" 2>&1

# 7. Kill old, start new
kill_backend

export NODE_ENV=production
cd "$REPO_DIR/backend" || exit 1
nohup ./node_modules/.bin/tsx src/index.ts >> "$HOME/backend.log" 2>&1 &
echo $! > "$PID_FILE"
echo "$(date) — Backend started on PID $(cat "$PID_FILE")" >> "$LOG"

# 8. Done
echo "$NEW_HEAD" > "$MARKER"
echo "$(date) — Deploy complete ✅" >> "$LOG"

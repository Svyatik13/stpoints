#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
LOG="$HOME/deploy.log"
MARKER="$HOME/.deployed_head"
PID_FILE="$HOME/backend.pid"

# 1. Lock check (Self-Heal if stuck > 15 mins)
if [ -f "$HOME/.deploy_in_progress" ]; then
  if test "$(find "$HOME/.deploy_in_progress" -mmin +15)"; then
    rm -f "$HOME/.deploy_in_progress"
    echo "$(date) — Stale lock found and cleared." >> "$LOG"
  else
    exit 0
  fi
fi
touch "$HOME/.deploy_in_progress"
trap 'rm -f "$HOME/.deploy_in_progress"' EXIT

# 2. FORCE SYNC (Resolve Git Jams)
echo "$(date) — Synchronizing with GitHub..." >> "$LOG"
cd "$REPO_DIR"
git fetch --all >> "$LOG" 2>&1
git reset --hard origin/main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# 3. Smart Health & Version Check
BACKEND_RUNNING=0
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" > /dev/null 2>&1; then
    BACKEND_RUNNING=1
  fi
fi

if [ -f "$MARKER" ] && [ "$(cat $MARKER)" = "$NEW_HEAD" ]; then
  if [ "$BACKEND_RUNNING" -eq 1 ]; then
    exit 0
  else
    echo "$(date) — Backend dead, starting..." >> "$LOG"
    bash "$HOME/start_backend.sh" >> "$LOG" 2>&1
    exit 0
  fi
fi

echo "$(date) — New version detected: $NEW_HEAD. Starting FULL deploy..." >> "$LOG"

# 4. Disk Maintenance
npm cache clean --force >> "$LOG" 2>&1

# 5. Deploy Frontend (FLASH-BUILD)
cd "$REPO_DIR/frontend"
rm -rf node_modules .next
npm install --no-audit --no-fund --omit=optional >> "$LOG" 2>&1
npm run build >> "$LOG" 2>&1

if [ -d "out" ]; then
  rm -rf "$WEB_ROOT"/*
  cp -rf out/* "$WEB_ROOT/"
  cp -f "$REPO_DIR/deploy/www/.htaccess" "$WEB_ROOT/.htaccess" 2>/dev/null
  echo "$(date) — Frontend built and deployed ✅" >> "$LOG"
else
  echo "$(date) — Frontend build FAILED ❌" >> "$LOG"
fi

# Cleanup
rm -rf node_modules .next

# 6. Inject/Update Startup Script
cat <<EOF > "$HOME/start_backend.sh"
#!/bin/bash
PID_FILE="\$HOME/backend.pid"
LOG_FILE="\$HOME/deploy.log"

echo "\$(date) — TOTAL PURGE: Releasing Port 4000..." >> "\$LOG_FILE"
# 1. Total User Purge: Kill every node process owned by this user
pkill -u "\$USER" -9 node > /dev/null 2>&1
pkill -u "\$USER" -9 tsx > /dev/null 2>&1

# 2. Cleanup PID file
if [ -f "\$PID_FILE" ]; then rm -f "\$PID_FILE"; fi

echo "\$(date) — Waiting for port release..." >> "\$LOG_FILE"
sleep 10

# 3. Link .env
cp "\$HOME/.env" "\$REPO_DIR/backend/.env"
sync

# 4. ENFORCE PRODUCTION MODE
export NODE_ENV=production

# 5. Start with local tsx
cd "\$REPO_DIR/backend"
nohup ./node_modules/.bin/tsx src/index.ts >> "\$HOME/backend.log" 2>&1 &
NEW_PID=\$!
echo "\$NEW_PID" > "\$PID_FILE"
echo "\$(date) — ST-Points Backend PURGED & RESTARTED in PRODUCTION on PID \$NEW_PID" >> "\$LOG_FILE"
EOF
chmod +x "$HOME/start_backend.sh"

# 7. Deploy Backend
cd "$REPO_DIR/backend"
if [ -f "$HOME/.env" ]; then cp "$HOME/.env" .env; fi

npm install --no-audit --no-fund >> "$LOG" 2>&1
npx prisma generate >> "$LOG" 2>&1
npx prisma db push --accept-data-loss >> "$LOG" 2>&1

# Final Sync & Kickstart
sync
bash "$HOME/start_backend.sh" >> "$LOG" 2>&1

# Finalize
echo "$NEW_HEAD" > "$MARKER"
echo "$(date) — FINAL Deploy complete ✅" >> "$LOG"

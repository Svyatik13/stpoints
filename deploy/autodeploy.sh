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
cd "$REPO_DIR" || exit 1
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
cd "$REPO_DIR/frontend" || exit 1
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
PID_FILE="$PID_FILE"
LOG_FILE="$LOG"
REPO_DIR="$REPO_DIR"

echo "\$(date) — PORT LIBERATOR: Clearing Port 4000..." >> "\$LOG_FILE"

# 1. Target by Port Address (The most reliable fix)
lsof -ti:4000 | xargs kill -9 > /dev/null 2>&1
/usr/sbin/fuser -k 4000/tcp > /dev/null 2>&1

# 2. Target by User Process Purge
pkill -u "\$USER" -9 node > /dev/null 2>&1
pkill -u "\$USER" -9 tsx > /dev/null 2>&1

# 3. Cleanup PID file
if [ -f "\$PID_FILE" ]; then rm -f "\$PID_FILE"; fi

echo "\$(date) — Verification Loop: Waiting for port 4000 to be empty..." >> "\$LOG_FILE"
MAX_TRIES=10
TRIES=0
while netstat -tln | grep -q :4000; do
  if [ \$TRIES -ge \$MAX_TRIES ]; then
    echo "CRITICAL: Port 4000 still in use after 30s. Manual intervention may be needed." >> "\$LOG_FILE"
    exit 1
  fi
  sleep 3
  lsof -ti:4000 | xargs kill -9 > /dev/null 2>&1
  TRIES=\$((TRIES+1))
done

# Link .env
cp "\$HOME/.env" "\$REPO_DIR/backend/.env" 2>/dev/null
sync

# ENFORCE PRODUCTION
export NODE_ENV=production

# Start with local tsx
cd "\$REPO_DIR/backend" || exit
nohup ./node_modules/.bin/tsx src/index.ts >> "\$HOME/backend.log" 2>&1 &
NEW_PID=\$!
echo "\$NEW_PID" > "\$PID_FILE"
echo "\$(date) — ST-Points Backend LIBERATED & RESTARTED on PID \$NEW_PID" >> "\$LOG_FILE"
EOF
chmod +x "$HOME/start_backend.sh"

# 7. Deploy Backend
cd "$REPO_DIR/backend" || exit 1
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

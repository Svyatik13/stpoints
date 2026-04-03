#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
LOG="$HOME/deploy.log"
MARKER="$HOME/.deployed_head"
PID_FILE="$HOME/backend.pid"

# 1. Lock check
if [ -f "$HOME/.deploy_in_progress" ]; then
  if test "$(find "$HOME/.deploy_in_progress" -mmin +20)"; then
    rm -f "$HOME/.deploy_in_progress"
  else
    exit 0
  fi
fi
touch "$HOME/.deploy_in_progress"
trap 'rm -f "$HOME/.deploy_in_progress"' EXIT

# Pull latest
cd "$REPO_DIR"
git pull origin main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# 2. Smart Health & Version Check
BACKEND_RUNNING=0
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" > /dev/null 2>&1; then
    BACKEND_RUNNING=1
  fi
fi

if [ -f "$MARKER" ] && [ "$(cat $MARKER)" = "$NEW_HEAD" ]; then
  if [ "$BACKEND_RUNNING" -eq 1 ]; then
    # All good — no changes and backend is alive
    exit 0
  else
    # Backend is dead, restart it
    echo "$(date) — Backend PID $PID dead, restarting..." >> "$LOG"
    bash "$HOME/start_backend.sh" >> "$LOG" 2>&1
    exit 0
  fi
fi

echo "$(date) — New version detected: $NEW_HEAD. Starting FULL deploy..." >> "$LOG"

# 3. Disk Maintenance
npm cache clean --force >> "$LOG" 2>&1

# 4. Deploy Frontend (FLASH-BUILD)
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

# Cleanup frontend clutter
rm -rf node_modules .next

# 5. Inject/Update Startup Script
cat <<EOF > "$HOME/start_backend.sh"
#!/bin/bash
PID_FILE="\$HOME/backend.pid"
if [ -f "\$PID_FILE" ]; then
  PID=\$(cat "\$PID_FILE")
  kill "\$PID" > /dev/null 2>&1
  sleep 2
fi

# Ensure .env is linked and FLUSHED to disk
if [ -f "\$HOME/.env" ]; then
  cp "\$HOME/.env" "\$REPO_DIR/backend/.env"
  sync
fi

cd "\$REPO_DIR/backend"
# Start with local tsx and capture PID
nohup ./node_modules/.bin/tsx src/index.ts >> "\$HOME/backend.log" 2>&1 &
NEW_PID=\$!
echo "\$NEW_PID" > "\$PID_FILE"
echo "\$(date) — ST-Points Backend Started with PID \$NEW_PID" >> "\$LOG"
EOF
chmod +x "$HOME/start_backend.sh"

# 6. Deploy Backend
cd "$REPO_DIR/backend"
# Ensure the .env is present
if [ -f "$HOME/.env" ]; then cp "$HOME/.env" .env; fi

npm install --no-audit --no-fund >> "$LOG" 2>&1
npx prisma generate >> "$LOG" 2>&1
npx prisma db push --accept-data-loss >> "$LOG" 2>&1

# Restart
bash "$HOME/start_backend.sh" >> "$LOG" 2>&1

# Finalize
echo "$NEW_HEAD" > "$MARKER"
echo "$(date) — FINAL Deploy complete ✅" >> "$LOG"

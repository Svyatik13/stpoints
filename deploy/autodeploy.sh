#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
LOG="$HOME/deploy.log"
MARKER="$HOME/.deployed_head"
BACKEND_BIN="$REPO_DIR/backend/node_modules/.bin/tsx"

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

# 2. Smart Version Check
if [ -f "$MARKER" ] && [ "$(cat $MARKER)" = "$NEW_HEAD" ]; then
  # No code changes. Just make sure backend is alive.
  if ! pgrep -f "tsx src/index.ts" > /dev/null 2>&1; then
    echo "$(date) — Backend was down, restarting..." >> "$LOG"
    bash "$HOME/start_backend.sh" >> "$LOG" 2>&1
  fi
  exit 0
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
pkill -f 'tsx src/index.ts'
sleep 2

# Ensure .env is linked into the backend folder before starting
if [ -f "$HOME/.env" ]; then
  cp "$HOME/.env" "$REPO_DIR/backend/.env"
  echo "Environment variables linked into backend." >> "$LOG"
fi

cd "$REPO_DIR/backend"
# Use the local tsx from node_modules for speed and space
nohup ./node_modules/.bin/tsx src/index.ts >> "$HOME/backend.log" 2>&1 &
echo "ST-Points Backend Started."
EOF
chmod +x "$HOME/start_backend.sh"

# 6. Deploy Backend
cd "$REPO_DIR/backend"
# Ensure the .env is present even during the install/generate phase
if [ -f "$HOME/.env" ]; then cp "$HOME/.env" .env; fi

npm install --no-audit --no-fund >> "$LOG" 2>&1
npx prisma generate >> "$LOG" 2>&1
npx prisma db push --accept-data-loss >> "$LOG" 2>&1

# Restart
bash "$HOME/start_backend.sh" >> "$LOG" 2>&1

# Finalize
echo "$NEW_HEAD" > "$MARKER"
echo "$(date) — FINAL Deploy complete ✅" >> "$LOG"

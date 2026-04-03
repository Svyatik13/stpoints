#!/bin/bash
# Server-side auto-deploy — runs via CRON every 2 minutes
REPO_DIR="$HOME/stpoints-repo"
WEB_ROOT="$HOME/www/stpoints.fun"
LOG="$HOME/deploy.log"
MARKER="$HOME/.deployed_head"

# 1. Lock & Root Disk Cleanup
if [ -f "$HOME/.deploy_in_progress" ]; then
  if test "$(find "$HOME/.deploy_in_progress" -mmin +20)"; then
    rm -f "$HOME/.deploy_in_progress"
  else
    exit 0
  fi
fi
touch "$HOME/.deploy_in_progress"
trap 'rm -f "$HOME/.deploy_in_progress"' EXIT

# Panic Disk Cleanup (Ensure we have space to start)
rm -rf "$REPO_DIR/frontend/node_modules" "$REPO_DIR/frontend/.next"
rm -rf "$HOME/backend" # Permanent removal of the duplicate directory
npm cache clean --force >> "$LOG" 2>&1

# Pull latest once
cd "$REPO_DIR"
git pull origin main >> "$LOG" 2>&1
NEW_HEAD=$(git rev-parse HEAD)

# 2. Deploy frontend (FLASH-BUILD)
cd "$REPO_DIR/frontend"
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

# IMMEDIATE CLEANUP: Destroy dependencies to free space for backend
rm -rf node_modules .next

# 3. Update Startup Script (Inject repo-pointing script)
cat <<EOF > "$HOME/start_backend.sh"
#!/bin/bash
pkill -f 'tsx src/index.ts'
sleep 2
cd "$REPO_DIR/backend"
nohup npx tsx src/index.ts >> "$HOME/backend.log" 2>&1 &
echo "Backend started from repository folder."
EOF
chmod +x "$HOME/start_backend.sh"

# 4. Deploy Backend (In Repo)
cd "$REPO_DIR/backend"
npm install --no-audit --no-fund >> "$LOG" 2>&1
npx prisma generate >> "$LOG" 2>&1
npx prisma db push --accept-data-loss >> "$LOG" 2>&1

# Restart backend using the injected helper
bash "$HOME/start_backend.sh" >> "$LOG" 2>&1

# Mark as deployed
echo "$NEW_HEAD" > "$MARKER"
echo "$(date) — FINAL Single-Instance Deploy complete ✅" >> "$LOG"

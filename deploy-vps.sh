#!/bin/bash
# ══════════════════════════════════════════════════════════
# stpoints.fun — VPS Deployment Script (OCI / DigitalOcean)
# ══════════════════════════════════════════════════════════
# Usage: ./deploy-vps.sh <ip_address> <key_path> <optional_note>

set -e

IP=$1
KEY=$2
NOTE=$3
USER="ubuntu" # OCI Default

if [ -z "$IP" ] || [ -z "$KEY" ]; then
    echo "❌ Usage: ./deploy-vps.sh <server_ip> <ssh_key_path> [commit_message]"
    exit 1
fi

COMMIT_MSG=${NOTE:-"Auto-deploy $(date +'%Y-%m-%d %H:%M:%S')"}

echo "🚀 Starting VPS Deployment..."

# 1. Push to GitHub
echo "📦 Pushing changes to GitHub..."
git add .
git commit -m "$COMMIT_MSG" || echo "No changes to commit"
git push origin main

# 2. Update VPS
echo "🔌 Connecting to VPS ($IP) as $USER..."
ssh -o StrictHostKeyChecking=no -i "$KEY" $USER@$IP << 'EOF'
  set -e
  echo "📡 Pulling latest changes..."
  cd ~/stpoints
  git pull origin main

  echo "📦 Updating Backend..."
  cd backend
  npm install
  npx prisma generate
  npx prisma db push

  echo "📦 Updating Frontend..."
  cd ../frontend
  npm install
  # Note: Frontend build is already pushed in 'deploy/' folder if using a build-heavy workflow,
  # but here we build on VPS to ensure consistency.
  npm run build

  echo "🚀 Restarting Services..."
  cd ..
  pm2 restart ecosystem.config.js
  echo "✅ VPS Update Complete!"
EOF

echo "🎉 ST-Points is now live on $IP!"

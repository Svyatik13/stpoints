#!/bin/bash
# ST-Points Deploy Script — builds frontend + pushes to GitHub
# Usage: ./deploy.sh "commit message"
set -e

cd "$(dirname "$0")"
MSG="${1:-Auto deploy $(date '+%H:%M:%S')}"

echo "⚡ Building frontend..."
cd frontend
NEXT_PUBLIC_API_URL=https://stpoints.fun/api npx next build
cd ..

echo "📦 Updating deploy files..."
# Preserve api.php proxy
cp deploy/www/api.php /tmp/api.php.bak 2>/dev/null || true
rm -rf deploy/www
mkdir -p deploy/www
cp -r frontend/out/* deploy/www/
cp deploy/.htaccess deploy/www/.htaccess
cp /tmp/api.php.bak deploy/www/api.php 2>/dev/null || true

echo "🔄 Pushing to GitHub..."
git add -A
git commit -m "$MSG"
git push origin main

echo "✅ Pushed! Server will auto-deploy within 2 minutes."

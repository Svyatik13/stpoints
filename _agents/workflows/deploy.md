---
description: how to deploy the application to your VPS
---
// turbo-all
# ST-Points Deployment Workflow

Use this workflow to safely deploy code changes from the local repository to the production Oracle Cloud VPS (141.147.53.229).

## Phase 1: Local Preparation
1. Ensure all changes are tested locally.
2. Commit and push the changes:
   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   git push origin main
   ```

## Phase 2: VPS Synchronization
1. SSH into the VPS:
   ```bash
   ssh -i /Users/savy/Downloads/key.key ubuntu@141.147.53.229
   ```
2. Navigate to the project root and pull the latest code:
   ```bash
   cd stpoints
   git fetch --all
   git reset --hard origin/main
   ```

## Phase 3: Build & Database Sync
1. **Database** (Only if `backend/prisma/schema.prisma` changed):
   ```bash
   cd backend
   npx prisma db push --accept-data-loss
   ```
2. **Build Backend**:
   ```bash
   cd backend
   npm install
   npm run build
   ```
3. **Build Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```

## Phase 4: Production Restart
1. Restart all services via PM2:
   ```bash
   pm2 restart all
   ```
2. Verify status:
   ```bash
   pm2 status
   ```

## Critical Notes for AI Assistants
- **Resource Limits**: The VPS is a low-RAM instance (1GB). Always ensure the **2GB swap file** is active (`free -m`) before starting a build to prevent OOM freezes.
- **Static Export**: Ensure `output: 'export'` is NOT present in `frontend/next.config.mjs` unless Nginx configuration is updated to serve static files instead of proxying to port 3000.
- **Port Conflict**: Backend should always listen on port `4000`, Frontend on `3000`.

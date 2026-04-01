# 🏴 stpoints.fun

**ST-Points** — An elite digital asset system. Points are centralized but extremely scarce, issued by the simulated **ZČU Central Node**.

## 🏗 Architecture

```
stpoints/
├── frontend/     → Next.js 14 (App Router) + Tailwind CSS v4
├── backend/      → Express.js + Prisma ORM + PostgreSQL
└── docker-compose.yml → PostgreSQL + pgAdmin
```

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** 20+ (`brew install node`)
- **Docker** (for PostgreSQL) or a remote PostgreSQL instance

### 2. Start PostgreSQL
```bash
docker compose up -d
```

### 3. Set Up Backend
```bash
# Copy environment file
cp .env.example .env

# Install dependencies
cd backend && npm install

# Generate Prisma client & push schema to DB
npx prisma generate
npx prisma db push

# Seed the database (admin + demo users)
npm run db:seed

# Start the API server
npm run dev
```

### 4. Set Up Frontend
```bash
cd frontend && npm install
npm run dev
```

### 5. Open
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **pgAdmin**: http://localhost:5050

## 🔐 Demo Credentials
| User | Email | Password |
|------|-------|----------|
| Admin | admin@stpoints.fun | admin123! |
| Demo | demo@stpoints.fun | demo123! |

## ⛏️ Mining System
- Server issues time-limited SHA-256 challenges
- Client-side Web Worker solves challenges without freezing UI
- Server **re-verifies** every submitted solution
- Reward: `0.001 ST` per 10,000 hashes computed
- Anti-cheat: timing plausibility checks, replay prevention

## 🎁 Giveaway Engine
- Server-side cron job runs every 6 hours
- Randomly selects from users active in last 24 hours
- Uses `crypto.randomInt()` for fair selection
- All draws logged in the database

## 🔒 ST-RM Terminal
- Locked behind a 500 ST minimum balance
- FaceID simulation using camera stream
- Re-verified on every request

## 📦 Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, Tailwind 4, TypeScript |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Auth | JWT (httpOnly cookies) |
| Mining | Web Workers, SHA-256 |
| Scheduler | node-cron |

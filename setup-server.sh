#!/bin/bash
# ═══════════════════════════════════════════════
# stpoints.fun — Server Setup Script (Debian 12)
# ═══════════════════════════════════════════════
set -e

echo "⚡ ST-Points Server Setup"
echo "========================="

# 1. Update system
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 22 LTS
echo "📦 Installing Node.js 22..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "✅ Node.js $(node --version)"

# 3. Install PostgreSQL 16
echo "📦 Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql postgresql-contrib
fi
sudo systemctl enable postgresql
sudo systemctl start postgresql
echo "✅ PostgreSQL installed"

# 4. Create database and user
echo "📦 Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='stpoints'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER stpoints WITH PASSWORD 'stpoints_dev_2024';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='stpoints'" | grep -q 1 || \
    sudo -u postgres createdb -O stpoints stpoints
echo "✅ Database ready"

# 5. Install PM2 (process manager)
echo "📦 Installing PM2..."
sudo npm install -g pm2
echo "✅ PM2 installed"

# 6. Navigate to project
cd ~/stpoints

# 7. Create .env if it doesn't exist
if [[ ! -f .env ]]; then
    cp .env.example .env
    # Generate random JWT secrets
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)
    sed -i "s/dev-jwt-secret-change-me-in-production-abc123/$JWT_SECRET/" .env
    sed -i "s/dev-refresh-secret-change-me-in-production-xyz789/$JWT_REFRESH/" .env
    echo "✅ .env created with random secrets"
else
    echo "✅ .env already exists"
fi

# 8. Install backend dependencies
echo "📦 Installing backend..."
cd ~/stpoints/backend
npm install
ln -sf ../.env .env 2>/dev/null || true
npx prisma generate
npx prisma db push
npm run db:seed || echo "Seed may already exist, skipping..."
echo "✅ Backend ready"

# 9. Install frontend dependencies & build
echo "📦 Installing & building frontend..."
cd ~/stpoints/frontend
npm install
npm run build
echo "✅ Frontend built"

# 10. Install Nginx & Certbot
echo "📦 Installing Nginx and Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo "✅ Nginx & Certbot installed"

# 11. Firewall Setup
echo "🛡️ Configuring Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable
echo "✅ Firewall active"

# 12. Set up PM2 ecosystem
cd ~/stpoints
cat > ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [
    {
      name: 'stpoints-backend',
      cwd: './backend',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
    },
    {
      name: 'stpoints-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
    },
  ],
};
PMEOF

echo "✅ PM2 ecosystem configured"

# 13. Nginx Configuration
echo "📦 Configuring Nginx..."
DOMAIN="stpoints.fun"
IP=$(curl -s ifconfig.me)
sudo tee /etc/nginx/sites-available/stpoints << EOF
server {
    listen 80 default_server;
    server_name $DOMAIN www.$DOMAIN $IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/stpoints /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
echo "✅ Nginx configured"

# 14. Start services
echo "🚀 Starting services with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════"
echo "  ⚡ ST-Points is Provisioned!"
echo ""
echo "  Next Steps:"
echo "  1. Run: sudo certbot --nginx -d stpoints.fun -d www.stpoints.fun"
echo "  2. Point your Domain A records to this IP."
echo "═══════════════════════════════════════════"

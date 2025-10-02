#!/bin/bash
# DYSTOPIA Production Server Setup Script
# Run this ON THE SERVER after connecting via SSH

set -e

echo "=== DYSTOPIA Production Setup ==="
echo "Server: dystopia.one (50.116.46.238)"
echo "Starting at $(date)"
echo ""

# Step 1: Update system
echo "[1/10] Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Step 2: Install Node.js 20
echo "[2/10] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Step 3: Install pnpm
echo "[3/10] Installing pnpm..."
npm install -g pnpm

# Step 4: Install PostgreSQL
echo "[4/10] Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Step 5: Install other dependencies
echo "[5/10] Installing nginx, certbot, and other tools..."
apt-get install -y git nginx certbot python3-certbot-nginx ufw zip unzip

# Step 6: Install PM2
echo "[6/10] Installing PM2 process manager..."
npm install -g pm2

# Step 7: Configure firewall
echo "[7/10] Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw allow 8001/tcp
echo "y" | ufw enable

# Step 8: Set up PostgreSQL
echo "[8/10] Setting up PostgreSQL database..."
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql << 'EOFPSQL'
-- Drop database if exists
DROP DATABASE IF EXISTS dystopia;
DROP USER IF EXISTS dystopia;

-- Create database and user
CREATE DATABASE dystopia;
CREATE USER dystopia WITH PASSWORD 'Stl2019Stl!';
GRANT ALL PRIVILEGES ON DATABASE dystopia TO dystopia;
ALTER DATABASE dystopia OWNER TO dystopia;
EOFPSQL

# Step 9: Create app directory
echo "[9/10] Creating application directory..."
mkdir -p /opt/dystopia
cd /opt/dystopia

# Step 10: Display status
echo "[10/10] Checking installations..."
node --version
pnpm --version
pm2 --version
psql --version | head -n 1
nginx -v

echo ""
echo "=== Base setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Upload your game code to /opt/dystopia"
echo "2. Run the deployment script"
echo ""

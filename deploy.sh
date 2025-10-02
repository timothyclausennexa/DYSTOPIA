#!/bin/bash
set -e

echo "=== DYSTOPIA Deployment Script ==="
echo "Starting deployment at $(date)"

# Update system
echo "[1/8] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 20
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
echo "[3/8] Installing pnpm..."
npm install -g pnpm

# Install PostgreSQL
echo "[4/8] Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Install other dependencies
echo "[5/8] Installing system dependencies..."
apt-get install -y git nginx certbot python3-certbot-nginx

# Create app directory
echo "[6/8] Creating application directory..."
mkdir -p /opt/dystopia
cd /opt/dystopia

# Install PM2 for process management
echo "[7/8] Installing PM2..."
npm install -g pm2

# Set up firewall
echo "[8/8] Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw allow 8001/tcp
ufw --force enable

echo "=== Base system setup complete ==="
echo "Ready for code deployment"

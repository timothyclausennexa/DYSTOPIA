#!/bin/bash
# DYSTOPIA UI Fixes - Quick Deploy Script
# Run this on your production server after SSH'ing in

set -e

echo "=== DYSTOPIA UI Fixes Deployment ==="
echo "Starting at $(date)"

# Navigate to app directory
cd /opt/dystopia || { echo "Error: /opt/dystopia not found"; exit 1; }

echo "[1/6] Pulling latest code from GitHub..."
git fetch origin
git pull origin master

echo "[2/6] Installing dependencies..."
pnpm install

echo "[3/6] Building client with UI fixes..."
cd client
pnpm build
cd ..

echo "[4/6] Building server..."
cd server
pnpm build
cd ..

echo "[5/6] Restarting PM2 services..."
pm2 restart all

echo "[6/6] Checking status..."
pm2 status

echo ""
echo "=== Deployment Complete ==="
echo "Completed at $(date)"
echo ""
echo "✅ UI fixes deployed successfully!"
echo ""
echo "Verify at: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Check logs with: pm2 logs"

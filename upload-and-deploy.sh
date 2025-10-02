#!/bin/bash
set -e

SERVER_IP="50.116.46.238"
SERVER_USER="root"

echo "=== Uploading DYSTOPIA to production server ==="

# Create archive of project (excluding node_modules, .git, etc.)
echo "[1/4] Creating deployment archive..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='*.log' \
    --exclude='.next' \
    --exclude='coverage' \
    -czf dystopia-deploy.tar.gz \
    client/ server/ shared/ config.ts configType.ts package.json pnpm-workspace.yaml pnpm-lock.yaml .env.development dystopia-config.hjson

# Upload to server
echo "[2/4] Uploading to server..."
scp dystopia-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# Upload deployment script
echo "[3/4] Uploading deployment script..."
scp deploy.sh ${SERVER_USER}@${SERVER_IP}:/tmp/

# Execute deployment on server
echo "[4/4] Running deployment on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    # Run base setup
    chmod +x /tmp/deploy.sh
    /tmp/deploy.sh

    # Extract code
    cd /opt/dystopia
    tar -xzf /tmp/dystopia-deploy.tar.gz

    # Install dependencies
    pnpm install

    # Build client
    cd client
    pnpm build
    cd ..

    # Set up PM2 ecosystem
    pm2 delete all || true
    pm2 start server/dist/api/server.js --name dystopia-api
    pm2 start server/dist/game/server.js --name dystopia-game
    pm2 save
    pm2 startup

    echo "=== Deployment complete ==="
ENDSSH

# Cleanup
rm dystopia-deploy.tar.gz

echo "=== Done! Server is running at $SERVER_IP ==="

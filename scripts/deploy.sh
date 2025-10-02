#!/bin/bash
echo '🔥 DEPLOYING DYSTOPIA: ETERNAL BATTLEGROUND 🔥'
echo ''

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 not installed! Run: npm install -g pm2${NC}"
    exit 1
fi

# Pull latest code
echo -e "${YELLOW}📦 Pulling latest code...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📚 Installing dependencies...${NC}"
pnpm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Dependency installation failed!${NC}"
    exit 1
fi

# Build client
echo -e "${YELLOW}🎨 Building client...${NC}"
cd client
pnpm build
cd ..

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Client build failed!${NC}"
    exit 1
fi

# Build server
echo -e "${YELLOW}⚙️  Building server...${NC}"
cd server
pnpm build
cd ..

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Server build failed!${NC}"
    exit 1
fi

# Run database migrations
echo -e "${YELLOW}💾 Running database migrations...${NC}"
cd server
tsx src/api/db/push-via-api.ts
cd ..

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Migration warning (may already exist)${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Reload PM2
echo -e "${YELLOW}🔄 Reloading PM2 processes...${NC}"
pm2 reload ecosystem.config.js --env production

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  PM2 reload failed, trying start...${NC}"
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 configuration
pm2 save

# Show status
echo ''
echo -e "${GREEN}📊 PM2 Status:${NC}"
pm2 status

echo ''
echo -e "${GREEN}✅ DYSTOPIA: ETERNAL BATTLEGROUND IS LIVE!${NC}"
echo -e "${GREEN}⚔️  The eternal war continues...${NC}"
echo ''

# Run post-deployment verification
echo -e "${YELLOW}Running post-deployment verification...${NC}"
sleep 5  # Give server time to fully start
./scripts/post-deploy-verify.sh

echo ''
echo -e "View logs: ${YELLOW}pm2 logs${NC}"
echo -e "Monitor: ${YELLOW}pm2 monit${NC}"
echo -e "Stop all: ${YELLOW}pm2 stop all${NC}"
echo ''

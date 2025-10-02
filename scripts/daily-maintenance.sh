#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Daily Maintenance Script
# Run daily at 4 AM via cron: 0 4 * * * /path/to/daily-maintenance.sh

echo "🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Daily Maintenance 🔥"
echo "Starting at: $(date)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"
MAINTENANCE_DURATION=300 # 5 minutes

# Send notification
send_notification() {
    local message=$1

    if [ ! -z "$DISCORD_WEBHOOK" ]; then
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"content\":\"🔧 **DYSTOPIA MAINTENANCE** 🔧\n\n${message}\"}" \
            > /dev/null 2>&1
    fi

    echo -e "${YELLOW}${message}${NC}"
}

# Announce maintenance
send_notification "⚠️ Server maintenance starting in 5 minutes! Players will be disconnected."

# Wait 5 minutes
sleep 300

# Stop server
echo -e "${YELLOW}[1/7] Stopping server...${NC}"
pm2 stop dystopia-game-server

# Backup database
echo -e "${YELLOW}[2/7] Creating database backup...${NC}"
if [ -f "./scripts/backup.sh" ]; then
    ./scripts/backup.sh
else
    echo -e "${RED}Backup script not found!${NC}"
fi

# Clean up old logs
echo -e "${YELLOW}[3/7] Cleaning up old logs...${NC}"
find ./logs -name '*.log' -mtime +7 -delete
echo "Deleted logs older than 7 days"

# Clean up old builds
echo -e "${YELLOW}[4/7] Cleaning up old builds...${NC}"
rm -rf ./server/dist.old 2>/dev/null
rm -rf ./client/dist.old 2>/dev/null

# Update dependencies (optional)
echo -e "${YELLOW}[5/7] Checking for updates...${NC}"
# pnpm update --latest # Uncomment to auto-update packages

# Restart server
echo -e "${YELLOW}[6/7] Restarting server...${NC}"
pm2 restart dystopia-game-server

# Wait for server to be ready
sleep 10

# Verify health
echo -e "${YELLOW}[7/7] Verifying server health...${NC}"
response=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health)

if [ "$response" == "200" ]; then
    echo -e "${GREEN}✅ Server is healthy!${NC}"
    send_notification "✅ Maintenance complete! Server is back online."
else
    echo -e "${RED}❌ Server health check failed!${NC}"
    send_notification "⚠️ CRITICAL: Server health check failed after maintenance!"
fi

# Show server status
pm2 status

echo "Maintenance completed at: $(date)"
echo ""
echo -e "${GREEN}⚔️  DYSTOPIA: ETERNAL BATTLEGROUND is back online! ⚔️${NC}"

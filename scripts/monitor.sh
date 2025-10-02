#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Auto-Restart Monitor
# This script monitors server health and automatically restarts if needed

echo "🔥 Starting DYSTOPIA server monitor..."

# Configuration
HEALTH_ENDPOINT="http://localhost:3000/health"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"
MAX_MEMORY_MB=2000
CHECK_INTERVAL=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to send Discord alert
send_alert() {
    local message=$1
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    if [ ! -z "$DISCORD_WEBHOOK" ]; then
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"content\":\"🔥 **DYSTOPIA ALERT** 🔥\n\n${message}\n\nTime: ${timestamp}\nServer: $(hostname)\"}" \
            > /dev/null 2>&1
    fi

    echo -e "${RED}[ALERT] ${message}${NC}"
}

# Function to check server health
check_health() {
    response=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null)
    echo "$response"
}

# Function to check memory usage
check_memory() {
    if command -v pm2 &> /dev/null; then
        # Get memory usage from PM2 (in bytes)
        memory=$(pm2 jlist 2>/dev/null | jq -r '.[0].monit.memory // 0')
        # Convert to MB
        memory_mb=$((memory / 1024 / 1024))
        echo "$memory_mb"
    else
        echo "0"
    fi
}

# Function to restart server
restart_server() {
    local reason=$1

    echo -e "${YELLOW}[RESTART] Restarting server due to: ${reason}${NC}"
    send_alert "Server restarting: ${reason}"

    if command -v pm2 &> /dev/null; then
        pm2 restart dystopia-game-server
        sleep 10

        # Verify restart was successful
        if [ "$(check_health)" == "200" ]; then
            echo -e "${GREEN}[RESTART] Server restarted successfully${NC}"
            send_alert "Server restarted successfully after: ${reason}"
        else
            echo -e "${RED}[RESTART] Server restart failed!${NC}"
            send_alert "⚠️ CRITICAL: Server restart FAILED after: ${reason}"
        fi
    else
        echo -e "${RED}[ERROR] PM2 not found!${NC}"
        send_alert "⚠️ CRITICAL: Cannot restart - PM2 not found!"
    fi
}

# Main monitoring loop
consecutive_failures=0
max_consecutive_failures=3

while true; do
    # Check if server is responding
    http_code=$(check_health)

    if [ "$http_code" != "200" ]; then
        consecutive_failures=$((consecutive_failures + 1))
        echo -e "${RED}[HEALTH] Server not responding (HTTP ${http_code}) - Failure ${consecutive_failures}/${max_consecutive_failures}${NC}"

        if [ $consecutive_failures -ge $max_consecutive_failures ]; then
            restart_server "Server not responding (HTTP ${http_code})"
            consecutive_failures=0
        fi
    else
        if [ $consecutive_failures -gt 0 ]; then
            echo -e "${GREEN}[HEALTH] Server recovered${NC}"
        fi
        consecutive_failures=0
        echo -e "${GREEN}[HEALTH] Server healthy ($(date '+%Y-%m-%d %H:%M:%S'))${NC}"
    fi

    # Check memory usage
    memory_mb=$(check_memory)
    if [ "$memory_mb" -gt 0 ]; then
        echo "[MEMORY] Current usage: ${memory_mb}MB / ${MAX_MEMORY_MB}MB"

        if [ $memory_mb -gt $MAX_MEMORY_MB ]; then
            restart_server "Memory limit exceeded (${memory_mb}MB > ${MAX_MEMORY_MB}MB)"
        fi
    fi

    # Wait before next check
    sleep $CHECK_INTERVAL
done

#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Post-Deployment Verification
# Run after deploying to verify everything is working

echo "🔥 DYSTOPIA: POST-DEPLOYMENT VERIFICATION 🔥"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Get deployment URL from argument or use localhost
DEPLOY_URL=${1:-"http://localhost:3000"}

echo "Testing deployment at: $DEPLOY_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null)

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response, expected $expected_code)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local name=$1
    local url=$2
    local json_field=$3

    echo -n "Testing $name... "

    response=$(curl -s --max-time 10 "$url" 2>/dev/null)

    if [ -z "$response" ]; then
        echo -e "${RED}❌ FAIL${NC} (No response)"
        FAILED=$((FAILED + 1))
        return 1
    fi

    if echo "$response" | grep -q "$json_field"; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Field '$json_field' not found)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "📋 1. BASIC CONNECTIVITY"
echo "────────────────────────────────────────────────────────────"

test_endpoint "Server responding" "$DEPLOY_URL"
test_json_endpoint "Health endpoint" "$DEPLOY_URL/health" "status"

echo ""
echo "📋 2. PM2 PROCESSES"
echo "────────────────────────────────────────────────────────────"

if command -v pm2 &> /dev/null; then
    # Check main game server
    if pm2 list | grep -q "dystopia-game-server.*online"; then
        echo -e "Main game server... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "Main game server... ${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi

    # Check zone servers
    zone_count=0
    for i in 1 2 3 4; do
        if pm2 list | grep -q "dystopia-zone-$i.*online"; then
            zone_count=$((zone_count + 1))
        fi
    done

    if [ $zone_count -eq 4 ]; then
        echo -e "Zone servers (4/4)... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    elif [ $zone_count -gt 0 ]; then
        echo -e "Zone servers ($zone_count/4)... ${YELLOW}⚠️  PARTIAL${NC}"
        FAILED=$((FAILED + 1))
    else
        echo -e "Zone servers (0/4)... ${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi

    # Check for any errored processes
    if pm2 list | grep -q "errored"; then
        echo -e "No errored processes... ${RED}❌ FAIL${NC}"
        echo "   Some PM2 processes have errors"
        FAILED=$((FAILED + 1))
    else
        echo -e "No errored processes... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    fi
else
    echo -e "PM2 status... ${YELLOW}⚠️  SKIP${NC} (PM2 not installed)"
fi

echo ""
echo "📋 3. DATABASE CONNECTIVITY"
echo "────────────────────────────────────────────────────────────"

# Load environment
if [ -f ".env.production" ]; then
    source .env.production

    if [ ! -z "$SUPABASE_URL" ]; then
        test_endpoint "Supabase API" "$SUPABASE_URL/rest/v1/"
    fi

    # Test Redis
    if [ ! -z "$REDIS_URL" ]; then
        echo -n "Redis connection... "
        if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PASS${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAIL${NC}"
            FAILED=$((FAILED + 1))
        fi
    fi
fi

echo ""
echo "📋 4. GAME SYSTEMS"
echo "────────────────────────────────────────────────────────────"

# Test health details
echo -n "Health monitoring... "
health_response=$(curl -s --max-time 10 "$DEPLOY_URL/health" 2>/dev/null)

if echo "$health_response" | grep -q "uptime"; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))

    # Extract stats
    if command -v jq &> /dev/null; then
        uptime=$(echo "$health_response" | jq -r '.uptime // 0')
        players=$(echo "$health_response" | jq -r '.players // 0')
        buildings=$(echo "$health_response" | jq -r '.buildings // 0')

        echo "   Uptime: ${uptime}s"
        echo "   Players online: $players"
        echo "   Active buildings: $buildings"
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "📋 5. MONITORING & LOGS"
echo "────────────────────────────────────────────────────────────"

# Check log files
if [ -f "logs/combined.log" ]; then
    echo -e "Combined logs exist... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))

    # Check for recent errors
    recent_errors=$(tail -n 100 logs/err.log 2>/dev/null | grep -i "error" | wc -l)
    if [ $recent_errors -gt 10 ]; then
        echo -e "Error log check... ${YELLOW}⚠️  WARNING${NC}"
        echo "   Found $recent_errors errors in last 100 lines"
    else
        echo -e "Error log check... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    fi
else
    echo -e "Log files exist... ${YELLOW}⚠️  SKIP${NC}"
fi

# Check if monitoring services are accessible
if command -v curl &> /dev/null; then
    test_endpoint "Prometheus (optional)" "http://localhost:9090" 200 2>/dev/null || true
    test_endpoint "Grafana (optional)" "http://localhost:3030" 302 2>/dev/null || true
fi

echo ""
echo "📋 6. BACKUP SYSTEM"
echo "────────────────────────────────────────────────────────────"

# Check if backups directory exists
if [ -d "backups" ]; then
    echo -e "Backup directory exists... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))

    # Check for recent backups
    backup_count=$(ls -1 backups/*.tar.gz 2>/dev/null | wc -l)
    if [ $backup_count -gt 0 ]; then
        echo -e "Backups found ($backup_count)... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))

        # Show most recent backup
        latest_backup=$(ls -t backups/*.tar.gz 2>/dev/null | head -1)
        if [ ! -z "$latest_backup" ]; then
            backup_age=$(find "$latest_backup" -mtime -1 2>/dev/null)
            if [ ! -z "$backup_age" ]; then
                echo "   Latest backup: $(basename $latest_backup) (< 24h old)"
            else
                echo -e "   ${YELLOW}⚠️  Latest backup is older than 24 hours${NC}"
            fi
        fi
    else
        echo -e "Recent backups... ${YELLOW}⚠️  NONE${NC}"
        echo "   Run: ./scripts/backup.sh"
    fi
else
    echo -e "Backup directory... ${RED}❌ FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "📋 7. AUTOMATED TASKS"
echo "────────────────────────────────────────────────────────────"

# Check cron jobs
if crontab -l 2>/dev/null | grep -q "DYSTOPIA"; then
    echo -e "Cron jobs configured... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))

    cron_count=$(crontab -l 2>/dev/null | grep "DYSTOPIA" -A 20 | grep -v "^#" | grep -v "^$" | wc -l)
    echo "   Found $cron_count automated tasks"
else
    echo -e "Cron jobs configured... ${YELLOW}⚠️  NONE${NC}"
    echo "   Run: ./scripts/setup-cron.sh"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔥 VERIFICATION RESULTS 🔥"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}⚠️  SOME CHECKS FAILED${NC}"
    echo ""
    echo "Review the failures above and fix them"
    echo ""
    echo "Common fixes:"
    echo "  - Restart PM2: pm2 restart all"
    echo "  - Check logs: pm2 logs"
    echo "  - Verify environment: cat .env.production"
    echo "  - Test database: cd server && tsx src/api/db/verify-tables.ts"
    echo ""
    exit 1
else
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo ""
    echo "DYSTOPIA: ETERNAL BATTLEGROUND is live and operational!"
    echo ""
    echo "📊 Monitor at:"
    echo "   PM2: pm2 monit"
    echo "   Logs: pm2 logs dystopia-game-server"
    echo "   Health: curl $DEPLOY_URL/health"
    echo ""
    echo "⚔️  THE ETERNAL WAR HAS BEGUN! ⚔️"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"

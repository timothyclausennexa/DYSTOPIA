#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Pre-Flight Deployment Checklist
# Run this before deploying to production

echo "🔥 DYSTOPIA: ETERNAL BATTLEGROUND - PRE-FLIGHT CHECKLIST 🔥"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check status
check_status() {
    local name=$1
    local command=$2
    local required=${3:-true}

    echo -n "Checking $name... "

    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ FAIL${NC}"
            FAILED=$((FAILED + 1))
            return 1
        else
            echo -e "${YELLOW}⚠️  SKIP${NC}"
            WARNINGS=$((WARNINGS + 1))
            return 2
        fi
    fi
}

echo "📋 1. BRANDING & CODE QUALITY"
echo "────────────────────────────────────────────────────────────"

# Check for 'survev' references
if grep -r "survev" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude="*.log" . > /dev/null 2>&1; then
    echo -e "Branding complete (no 'survev')... ${RED}❌ FAIL${NC}"
    echo "   Found 'survev' references in code!"
    FAILED=$((FAILED + 1))
else
    echo -e "Branding complete (no 'survev')... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))
fi

# Check package.json has correct name
if grep -q "@dystopia" package.json 2>/dev/null; then
    echo -e "Package namespace correct... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "Package namespace correct... ${RED}❌ FAIL${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "📋 2. ENVIRONMENT & CONFIGURATION"
echo "────────────────────────────────────────────────────────────"

# Check environment files
check_status "Production .env file" "test -f .env.production"

# Check Supabase credentials
if [ -f ".env.production" ]; then
    source .env.production

    if [ ! -z "$SUPABASE_URL" ]; then
        echo -e "Supabase URL configured... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "Supabase URL configured... ${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi

    if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
        echo -e "Supabase service key configured... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "Supabase service key configured... ${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi

    if [ ! -z "$REDIS_URL" ]; then
        echo -e "Redis URL configured... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "Redis URL configured... ${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi
fi

echo ""
echo "📋 3. DEPENDENCIES & BUILD"
echo "────────────────────────────────────────────────────────────"

check_status "Node.js installed" "command -v node"
check_status "pnpm installed" "command -v pnpm"
check_status "PM2 installed" "command -v pm2" false
check_status "Node modules installed" "test -d node_modules"
check_status "Server build exists" "test -d server/dist" false
check_status "Client build exists" "test -d client/dist" false

echo ""
echo "📋 4. DATABASE & STORAGE"
echo "────────────────────────────────────────────────────────────"

# Test Supabase connection
if [ ! -z "$SUPABASE_URL" ]; then
    echo -n "Supabase connection... "
    if curl -s -f -H "apikey: $SUPABASE_SERVICE_KEY" "$SUPABASE_URL/rest/v1/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi
fi

# Test Redis connection
if [ ! -z "$REDIS_URL" ]; then
    check_status "Redis connection" "redis-cli -u '$REDIS_URL' ping" false
fi

echo ""
echo "📋 5. PRODUCTION FILES"
echo "────────────────────────────────────────────────────────────"

check_status "ecosystem.config.js exists" "test -f ecosystem.config.js"
check_status "docker-compose.yml exists" "test -f docker-compose.yml"
check_status "Dockerfile exists" "test -f Dockerfile"
check_status "nginx.conf exists" "test -f nginx.conf"
check_status "Deployment script exists" "test -f scripts/deploy.sh"
check_status "Monitoring script exists" "test -f scripts/monitor.sh"
check_status "Backup script exists" "test -f scripts/backup.sh"

echo ""
echo "📋 6. GAME SYSTEMS"
echo "────────────────────────────────────────────────────────────"

check_status "Building system exists" "test -f server/src/game/systems/BuildingSystem.ts"
check_status "Health monitor exists" "test -f server/src/monitoring/health.ts"
check_status "Supabase client exists" "test -f server/src/db/supabase.ts"
check_status "Test suite exists" "test -f server/src/tests/fullTest.ts"

echo ""
echo "📋 7. DOCUMENTATION"
echo "────────────────────────────────────────────────────────────"

check_status "README exists" "test -f README.md" false
check_status "Building system docs" "test -f BUILDING_SYSTEM.md"
check_status "Database setup docs" "test -f DATABASE_SETUP.md"
check_status "Production deployment docs" "test -f PRODUCTION_DEPLOYMENT.md"
check_status "Testing docs" "test -f TESTING.md"

echo ""
echo "📋 8. SECURITY & MONITORING"
echo "────────────────────────────────────────────────────────────"

# Check for exposed secrets
if grep -r "password\s*=\s*['\"]" --include="*.ts" --include="*.js" server/src/ 2>/dev/null | grep -v "password:" | grep -v "// " > /dev/null; then
    echo -e "No hardcoded passwords... ${YELLOW}⚠️  WARNING${NC}"
    echo "   Found potential hardcoded passwords!"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "No hardcoded passwords... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))
fi

# Check Discord webhook (optional)
if [ ! -z "$DISCORD_WEBHOOK" ]; then
    echo -e "Discord alerts configured... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "Discord alerts configured... ${YELLOW}⚠️  SKIP${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

check_status "Logs directory exists" "test -d logs"
check_status "Backups directory ready" "mkdir -p backups"

echo ""
echo "📋 9. SSL & DOMAIN"
echo "────────────────────────────────────────────────────────────"

check_status "SSL directory exists" "test -d ssl" false

if [ -f "ssl/fullchain.pem" ] && [ -f "ssl/privkey.pem" ]; then
    echo -e "SSL certificates installed... ${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "SSL certificates installed... ${YELLOW}⚠️  SKIP${NC}"
    echo "   SSL certificates not found - configure before production use"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "📋 10. OPTIONAL: RUN TESTS"
echo "────────────────────────────────────────────────────────────"

if [ "$RUN_TESTS" = "true" ]; then
    echo "Running test suite..."
    ./scripts/test.sh
    if [ $? -eq 0 ]; then
        echo -e "Test suite passed... ${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "Test suite passed... ${RED}❌ FAIL${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "Test suite... ${BLUE}ℹ️  SKIPPED${NC} (set RUN_TESTS=true to run)"
fi

# Final results
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔥 PRE-FLIGHT CHECKLIST RESULTS 🔥"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}🔴 DEPLOYMENT BLOCKED - Fix failed checks above${NC}"
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS DETECTED - Review before deploying${NC}"
    echo ""
    echo "Proceed with deployment? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
else
    echo -e "${GREEN}🎉 ALL CHECKS PASSED - READY FOR DEPLOYMENT!${NC}"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🚀 Launch DYSTOPIA: ETERNAL BATTLEGROUND with:"
echo "   ./scripts/deploy.sh"
echo ""
echo "⚔️  THE ETERNAL BATTLEGROUND AWAITS! ⚔️"
echo ""

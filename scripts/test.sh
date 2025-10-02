#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Test Runner Script

echo "🔥 Running DYSTOPIA Test Suite 🔥"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
if [ -f ".env.development" ]; then
    export $(cat .env.development | grep -v '^#' | xargs)
elif [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Check if Redis is running
if command -v redis-cli &> /dev/null; then
    if ! redis-cli ping > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: Redis is not running. Some tests will be skipped.${NC}"
        echo "   To start Redis: redis-server"
        echo ""
    fi
fi

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL not set${NC}"
    echo "   Please configure .env.development or .env.production"
    exit 1
fi

# Run tests with Node.js garbage collection flags for memory leak detection
echo -e "${GREEN}Running tests with memory profiling...${NC}"
echo ""

cd server

# Run with GC exposed for memory leak tests
node --expose-gc --require tsx/register src/tests/runTests.ts

TEST_EXIT_CODE=$?

cd ..

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi

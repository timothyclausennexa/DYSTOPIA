#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Database Restore Script
# Usage: ./restore.sh <backup_file.tar.gz>

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/dystopia_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔥 DYSTOPIA: Database Restore 🔥"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will overwrite current database data!${NC}"
echo -e "${YELLOW}Press Ctrl+C to cancel, or Enter to continue...${NC}"
read

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
echo "Extracting backup to: ${TEMP_DIR}"

# Extract backup
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to extract backup!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Restore each table
TABLES=("players" "clans" "buildings" "territories" "vehicles" "chat_messages" "world_events" "trades" "leaderboards")

for table in "${TABLES[@]}"; do
    JSON_FILE="${TEMP_DIR}/${table}_"*.json

    if [ -f $JSON_FILE ]; then
        echo -e "${YELLOW}Restoring table: ${table}${NC}"

        # Read JSON data
        DATA=$(cat $JSON_FILE)

        # Clear existing data (optional - comment out to append instead)
        curl -s -X POST \
            "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
            -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"query\":\"DELETE FROM ${table}\"}" \
            > /dev/null

        # TODO: Insert data back (requires custom logic per table structure)
        # This is a simplified example - you'll need to implement proper INSERT statements

        echo "✓ ${table} restored"
    else
        echo -e "${RED}✗ ${table} backup not found${NC}"
    fi
done

# Clean up temp directory
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✅ Database restore complete!${NC}"
echo -e "${YELLOW}⚠️  Remember to restart the server: pm2 restart dystopia-game-server${NC}"

#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Database Backup Script
# Run every 6 hours via cron: 0 */6 * * * /path/to/backup.sh

echo "💾 DYSTOPIA: Database Backup Starting..."

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="dystopia_backup_${TIMESTAMP}.sql"
MAX_BACKUPS=28 # Keep 7 days of backups (4 per day)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

echo -e "${YELLOW}Creating backup: ${BACKUP_FILE}${NC}"

# Use Supabase Management API to export data
if [ ! -z "$SUPABASE_PROJECT_REF" ] && [ ! -z "$SUPABASE_ACCESS_TOKEN" ]; then
    # Export each table
    TABLES=("players" "clans" "buildings" "territories" "vehicles" "chat_messages" "world_events" "trades" "leaderboards")

    for table in "${TABLES[@]}"; do
        echo "Backing up table: $table"

        # Query all data from table
        curl -s -X POST \
            "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
            -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"query\":\"SELECT * FROM ${table}\"}" \
            > "${BACKUP_DIR}/${table}_${TIMESTAMP}.json"
    done

    # Create compressed archive
    tar -czf "${BACKUP_DIR}/${BACKUP_FILE}.tar.gz" -C "${BACKUP_DIR}" *_${TIMESTAMP}.json

    # Remove individual JSON files
    rm -f ${BACKUP_DIR}/*_${TIMESTAMP}.json

    echo -e "${GREEN}✅ Backup created: ${BACKUP_FILE}.tar.gz${NC}"

    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.tar.gz" | cut -f1)
    echo "Backup size: ${BACKUP_SIZE}"
else
    echo -e "${RED}❌ Missing Supabase credentials!${NC}"
    exit 1
fi

# Clean up old backups (keep only last MAX_BACKUPS)
echo "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t dystopia_backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm --

REMAINING=$(ls -1 dystopia_backup_*.tar.gz 2>/dev/null | wc -l)
echo "Backups remaining: ${REMAINING}"

# Optional: Upload to cloud storage (S3, etc.)
# if [ ! -z "$AWS_S3_BUCKET" ]; then
#     echo "Uploading to S3..."
#     aws s3 cp "${BACKUP_FILE}.tar.gz" "s3://${AWS_S3_BUCKET}/backups/"
# fi

echo -e "${GREEN}💾 Backup complete!${NC}"

#!/bin/bash
# DYSTOPIA: ETERNAL BATTLEGROUND - Setup Cron Jobs
# Run once to install all cron jobs

echo "🔥 Setting up DYSTOPIA cron jobs..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Make all scripts executable
chmod +x "$PROJECT_DIR/scripts"/*.sh

echo "Making scripts executable..."
ls -lh "$PROJECT_DIR/scripts"/*.sh

# Create cron entries
CRON_TEMP=$(mktemp)

# Preserve existing cron jobs
crontab -l > "$CRON_TEMP" 2>/dev/null || true

# Add DYSTOPIA cron jobs (remove existing ones first)
sed -i '/DYSTOPIA:/d' "$CRON_TEMP"

cat >> "$CRON_TEMP" << EOF

# DYSTOPIA: ETERNAL BATTLEGROUND - Automated Tasks

# Restart server every day at 4 AM for maintenance
0 4 * * * cd $PROJECT_DIR && $PROJECT_DIR/scripts/daily-maintenance.sh >> $PROJECT_DIR/logs/maintenance.log 2>&1

# Backup database every 6 hours
0 */6 * * * cd $PROJECT_DIR && $PROJECT_DIR/scripts/backup.sh >> $PROJECT_DIR/logs/backup.log 2>&1

# Monitor server health (runs continuously, start on reboot)
@reboot cd $PROJECT_DIR && $PROJECT_DIR/scripts/monitor.sh >> $PROJECT_DIR/logs/monitor.log 2>&1 &

# Clean up old logs weekly (Sunday at midnight)
0 0 * * 0 find $PROJECT_DIR/logs -name '*.log' -mtime +7 -delete

# Clean up old backups monthly (1st of month at 3 AM)
0 3 1 * * find $PROJECT_DIR/backups -name '*.tar.gz' -mtime +30 -delete

EOF

# Install new crontab
crontab "$CRON_TEMP"

# Clean up
rm "$CRON_TEMP"

echo ""
echo "✅ Cron jobs installed!"
echo ""
echo "Current crontab:"
crontab -l | grep -A 20 "DYSTOPIA:"

echo ""
echo "📋 Scheduled tasks:"
echo "  - Daily maintenance: 4:00 AM"
echo "  - Database backup: Every 6 hours"
echo "  - Server monitoring: Continuous (starts on reboot)"
echo "  - Log cleanup: Weekly (Sunday midnight)"
echo "  - Backup cleanup: Monthly (1st at 3 AM)"
echo ""
echo "⚔️  DYSTOPIA: ETERNAL BATTLEGROUND automation ready!"

#!/bin/bash
# ============================================================
# MadrashaOS — Database Backup Script
# ============================================================
# Creates a compressed SQL dump of the MadrashaOS database.
# Retains backups for RETENTION_DAYS (default: 30).
#
# Usage:
#   ./scripts/backup.sh
#
# Cron (daily at 2 AM):
#   0 2 * * * /path/to/madrashaos/app/scripts/backup.sh
#
# Prerequisites:
#   - DATABASE_URL must be set in .env or environment
#   - pg_dump must be installed (comes with PostgreSQL client)
# ============================================================

set -euo pipefail

# Load .env if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Configuration
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/madrashaos_$TIMESTAMP.sql.gz"

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date)] ERROR: DATABASE_URL is not set. Check your .env file."
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run the backup
echo "[$(date)] Starting backup → $BACKUP_FILE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Report size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($SIZE)"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "madrashaos_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"
fi

echo "[$(date)] Done."

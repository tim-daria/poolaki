#!/bin/sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGTIME=$(date '+%Y-%m-%d %H:%M:%S')
BACKUP_FILE="/backups/backup_${TIMESTAMP}.sql"

echo "[$LOGTIME] Starting backup..."

if pg_dump -h db -U ${POSTGRES_USER} ${POSTGRES_DB} > "$BACKUP_FILE" 2>/tmp/pg_dump_err; then
    # Check if the file is empty
    FILESIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)

    if [ "$FILESIZE" -gt 100 ]; then
        echo "[$LOGTIME] Backup SUCCESSFUL: $BACKUP_FILE ($FILESIZE bytes)"
        touch /backups/.last_success
    else
        echo "[$LOGTIME] Backup FAILED: output file too small ($FILESIZE bytes), possible empty dump"
        cat /tmp/pg_dump_err
        exit 1
    fi
else
    echo "[$LOGTIME] Backup FAILED: pg_dump exited with error"
    cat /tmp/pg_dump_err
    exit 1
fi

# Cleanup for backups older then 7 days
DELETED=$(find /backups -name "backup_*.sql" -mtime +7 -print -delete)
if [ -n "$DELETED" ]; then
    echo "[$LOGTIME] Deleted old backups:"
    echo "$DELETED"
fi

rm -f /tmp/pg_dump_err
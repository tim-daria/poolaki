# PostgreSQL Disaster Recovery Procedures

## 1. Overview and Scope

This document describes the steps to recover a PostgreSQL database from backup in a Docker Compose environment. It covers full logical backup restores and includes troubleshooting guidance for common failure modes.

**Scope:** Recovery of a PostgreSQL database running as a Docker Compose service (`postgres`) using backups produced by the `db_backup` sidecar container running `backup.sh`. Backups are stored in `./backend/backups` on the host.

---

## 2. Prerequisites

Before starting a restore, confirm:

- Docker and Docker Compose are available on the host.
- The `POSTGRES_USER` and `POSTGRES_DB` environment variables are known (refer to your `.env` or `docker-compose.yml`).
- The `postgres` service can be stopped/restarted without permanently disrupting dependent services.
- Sufficient disk space exists for both the backup file and the restored database.

---

## 3. Backup Verification

Always verify the backup before attempting a restore.

### 3.1 Check the healthcheck sentinel file

```bash
# Check if a backup succeeded within the last ~25 hours
find ./backend/backups/.last_success -mmin -1500 -ls

# Show its current modification time in human-readable format
stat ./backend/backups/.last_success
```

If `find` returns no output, no successful backup exists within the window. Check for older `.last_success` timestamps or investigate the backup container logs.

### 3.2 List all available backups

```bash
ls -lh ./backend/backups/backup_*.sql
```

---

## 4. Full Recovery Procedure

### Step 1: Notify and prepare

1. Notify dependent service owners that the database will be briefly unavailable.
2. Confirm which backup you are restoring (use the most recent valid one from Section 3).
3. Decide on a maintenance window.


### Step 2: Back up the current database state (safety net)

> **Note:** If the current database is already corrupted or inaccessible, skip this step and proceed directly to Step 4.

```bash
# Create a snapshot of the existing data directory before overwriting
docker compose exec db_backup \
  pg_dump > "./backend/backups/pre-disaster-recovery_$(date +%Y%m%d_%H%M%S).sql" 2>/tmp/pg_dump_err
```

### Step 3: Remove or reset the existing data directory

```bash
# Option A: Remove the postgres container and its volume via docker compose
docker compose down -v db

# Option B: Manually find and remove the data volume
# docker volume ls | grep postgres
# docker volume rm <volume_name>
```

> **Warning:** The `-v` flag destroys persistent volumes. Ensure you have the safety backup from Step 2 before proceeding.

### Step 4: Start a fresh postgres container

```bash
docker compose up -d db
# Wait for postgres to initialize
```

### Step 5: Restore the backup

**For a plain SQL dump** (produced by default `pg_dump`):

```bash
docker compose exec -T db psql -d "$POSTGRES_DB" \
  < ./backend/backups/<backup-file-name>
```

> The `-T` flag disables pseudo-TTY allocation, which is required when piping stdin.


### Step 6: Verify the restore

```bash
# Check that the database is accessible and non-empty
docker compose exec db psql -d "$POSTGRES_DB" -c "\dt"

# Verify row counts on known tables (replace 'users' with a real table name)
docker compose exec db psql -d "$POSTGRES_DB" \
-c "SELECT id,
        last_login,
        username,
        email,
        date_joined
    FROM public.core_user
    LIMIT 100;"
```

### Step 7: Check container status

```bash
# Check that the database container is healthy
docker inspect --format='{{json .State.Health}}' postgres_db | jq '{Status, FailingStreak}'

# You can also check the health status for all containers with docker ps
```

---

## 5. Common Troubleshooting

### Empty backup file

**Cause:** `pg_dump` wrote an empty file, typically because the connection to the database failed or the dump was interrupted.

**Fix:**
```bash
# Check file size
ls -lh ./backend/backups/backup_*.sql

# Verify the file contains actual SQL statements
grep -c "COPY\|INSERT\|CREATE TABLE" ./backend/backups/backup_20260718_193000.sql

# If empty, fall back to the next most recent backup
ls -lt ./backend/backups/backup_*.sql | head -5
```

### Disk space full

**Cause:** Not enough disk space to load the dump or run the postgres container.

**Fix:**
```bash
# Check available disk space
df -h .

# Clean up old backup files (backup.sh keeps 7 days, you can trim further)
find ./backend/backups/backup_*.sql -mtime +3 -delete

# Move a large backup to temporary storage temporarily
mv ./backend/backups/backup_LARGE.sql /tmp/
```

---

## 6. Rollback and Safety Notes

- **Always create a pre-disaster safety backup** (Step 2) before overwriting existing data. Never restore directly without a rollback path.
- **Test restores periodically** — at minimum quarterly — in a non-production environment. A backup that has never been tested is untrusted.
- Keep at least **one backup outside the primary volume** (off-site or separate storage) to protect against host-level disk failure.
- Document the `POSTGRES_USER` and `POSTGRES_DB` values in your runbook — these are required for every restore and may not be trivially recoverable if the original `.env` is lost.
- If the database schema has changed since the last backup, a restore may cause data loss for those changes. Consider using database migration tools (e.g., Flyway, Liquibase) alongside backups.

---

## 7. Quick Reference Cheat Sheet

```bash
# ---- VERIFY BACKUPS ----
find ./backend/backups/.last_success -mmin -1500 -ls
ls -lh ./backend/backups/backup_*.sql
head -5 ./backend/backups/backup_YYYYMMDD_HHMMSS.sql
docker compose logs db_backup --tail 30

# ---- SAFETY BACKUP (optional but recommended) ----
docker compose exec db_backup \
  pg_dump > "./backend/backups/pre-disaster-recovery_$(date +%Y%m%d_%H%M%S).sql" \
  2>/tmp/pg_dump_err

# ---- DELETE OLD CONTAINER & VOLUME ----
docker compose down -v db

# ---- START FRESH POSTGRES ----
docker compose up db -d

# ---- RESTORE (plain SQL) ----
docker compose exec -T db psql -d "$POSTGRES_DB" \
  < ./backend/backups/<backup-file-name>

# ---- VERIFY ----
docker compose exec db psql -d "$POSTGRES_DB" -c "\dt"
docker compose exec db psql -d "$POSTGRES_DB" \
-c "SELECT id,
        last_login,
        username,
        email,
        date_joined
    FROM public.core_user
    LIMIT 100;"

# ---- CHECK CONTAINER STATUS ----
docker inspect --format='{{json .State.Health}}' postgres_db | jq '{Status, FailingStreak}'
```

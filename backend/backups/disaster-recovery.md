# PostgreSQL Disaster Recovery Procedures

## 1. Overview and Scope

This document describes the steps to recover a PostgreSQL database from backup in a Docker Compose environment. It covers full logical backup restores and includes troubleshooting guidance for common failure modes.

**Scope:** Recovery of a PostgreSQL database running as a Docker Compose service (`postgres`) using backups produced by the `db_backup` sidecar container running `backup.sh`. Backups are stored in `./backend/backups` on the host.

---

## 2. Prerequisites

Before starting a restore, confirm:

- Docker and Docker Compose are available on the host.
- You have shell/SSH access to the host where `./backend/backups` lives.
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

### 3.3 Inspect individual backup files

```bash
# Check file size (should be non-zero)
ls -lh ./backend/backups/backup_20260718_193000.sql

# Verify it's a valid SQL file (first few lines)
head -5 ./backend/backups/backup_20260718_193000.sql

# Count lines — an empty dump is a red flag
wc -l ./backend/backups/backup_20260718_193000.sql
```

### 3.4 Check backup container logs

```bash
docker compose logs db_backup --tail 50
```

Look for errors, failed `pg_dump` calls, or disk space issues.

---

## 4. Full Recovery Procedure

### Step 1: Notify and prepare

1. Notify dependent service owners that the database will be briefly unavailable.
2. Confirm which backup you are restoring (use the most recent valid one from Section 3).
3. Decide on a maintenance window.

### Step 2: Stop the postgres service and dependent containers

```bash
# Stop dependent application containers first (replace 'app' with your actual service name)
docker compose stop app

# Stop the postgres service
docker compose stop postgres
```

### Step 3: Back up the current database state (safety net)

```bash
# Create a snapshot of the existing data directory before overwriting
docker compose exec db \
  pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > "./backend/backups/pre-disaster-recovery_$(date +%Y%m%d_%H%M%S).sql"

echo "Safety backup created."
```

> **Note:** If the current database is already corrupted or inaccessible, skip this step and proceed directly to Step 4.

### Step 4: Remove or reset the existing data directory

```bash
# Option A: Remove the postgres container and its anonymous volumes via docker compose
docker compose rm -v -f postgres

# Option B: Manually find and remove the data volume
# docker volume ls | grep postgres
# docker volume rm <volume_name>
```

> **Warning:** The `-v` flag destroys persistent volumes. Ensure you have the safety backup from Step 3 before proceeding.

### Step 5: Start a fresh postgres container

```bash
docker compose up -d postgres
# Wait for postgres to initialize
sleep 5
```

### Step 6: Restore the backup

**For a plain SQL dump** (produced by default `pg_dump`):

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < ./backend/backups/backup_20260718_193000.sql
```

> The `-T` flag disables pseudo-TTY allocation, which is required when piping stdin.

**For a custom-format dump** (produced by `pg_dump -Fc`):

```bash
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c --if-exists ./backend/backups/backup_20260718_193000.dump
```

### Step 7: Verify the restore

```bash
# Check that the database is accessible and non-empty
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt"

# Verify row counts on known tables (replace 'users' with a real table name)
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM users;"
```

### Step 8: Restart dependent services

```bash
docker compose up -d app

# Confirm the application connects successfully
docker compose logs app --tail 20
```

---

## 5. Point-in-Time Recovery (PITR) — Limitations and Future Improvement

The current backup setup uses **`pg_dump`**, which produces a **logical full database dump**. This means:

- You can restore to the state of a single successful backup.
- You **cannot** restore to an arbitrary point in time between backups.
- You **cannot** replay WAL (Write-Ahead Log) segments to recover up to the last transaction.

**Future improvement — WAL archiving for PITR:**

To enable point-in-time recovery, consider:

1. Switching from `pg_dump` to continuous WAL archiving via `pg_basebackup`.
2. Configuring `archive_mode = on` and `archive_command` in `postgresql.conf`.
3. Storing WAL segments in a separate backup location (e.g., S3, a separate volume).
4. Using `pg_backrest` or `barman` for managed PITR automation.

Until WAL archiving is implemented, the best recovery point available is the timestamp of the last successful backup visible in `.last_success`.

---

## 6. Common Troubleshooting

### "could not translate host name 'postgres'"

**Cause:** The `psql` or `pg_restore` command cannot resolve the hostname `postgres`.

**Fix:**
```bash
# Verify the postgres service is running
docker compose ps postgres

# Test name resolution from inside any running container
docker compose exec db_backup ping -c 1 postgres

# Check the actual service name in docker-compose.yml and use it
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;"
```

Always use the container service name (e.g., `postgres`), not `localhost` or `127.0.0.1`, from inside a Docker network.

### Permission issues on /backups

**Cause:** The backup volume is owned by a different UID/GID than the postgres container user.

**Fix:**
```bash
# Check current ownership
ls -ln ./backend/backups/

# Fix ownership to match the postgres container user (postgres UID is typically 999)
sudo chown -R 999:999 ./backend/backups/

# Alternatively, run the restore with the correct user
docker compose exec -u postgres postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < ./backend/backups/backup_FILE.sql
```

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

### Container can't start after data directory reset

**Cause:** Volume mapping issues, missing init scripts, or incorrect environment variables.

**Fix:**
```bash
# Check postgres container logs
docker compose logs postgres

# Verify the postgres data volume is correctly mounted
docker inspect $(docker compose ps -q postgres) | grep -A 10 "Mounts"

# Re-run an init script if your setup uses one
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -f /docker-entrypoint-initdb.d/init-db.sql
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

## 7. Rollback and Safety Notes

- **Always create a pre-disaster safety backup** (Step 3) before overwriting existing data. Never restore directly without a rollback path.
- **Test restores periodically** — at minimum quarterly — in a non-production environment. A backup that has never been tested is untrusted.
- Keep at least **one backup outside the primary volume** (off-site or separate storage) to protect against host-level disk failure.
- Document the `POSTGRES_USER` and `POSTGRES_DB` values in your runbook — these are required for every restore and may not be trivially recoverable if the original `.env` is lost.
- If the database schema has changed since the last backup, a restore may cause data loss for those changes. Consider using database migration tools (e.g., Flyway, Liquibase) alongside backups.

---

## 8. Quick Reference Cheat Sheet

```bash
# ---- VERIFY BACKUPS ----
find ./backend/backups/.last_success -mmin -1500 -ls
ls -lh ./backend/backups/backup_*.sql
head -5 ./backend/backups/backup_YYYYMMDD_HHMMSS.sql
docker compose logs db_backup --tail 30

# ---- PREPARE FOR RESTORE ----
docker compose stop app
docker compose stop postgres
docker compose rm -v -f postgres

# ---- SAFETY BACKUP (optional but recommended) ----
docker compose run --rm -v $(pwd)/backend/backups:/backups postgres \
  pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > ./backend/backups/pre-disaster-recovery_$(date +%Y%m%d_%H%M%S).sql

# ---- START FRESH POSTGRES ----
docker compose up -d postgres
sleep 5

# ---- RESTORE (plain SQL) ----
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < ./backend/backups/backup_YYYYMMDD_HHMMSS.sql

# ---- RESTORE (custom format .dump) ----
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c --if-exists ./backend/backups/backup_YYYYMMDD_HHMMSS.dump

# ---- VERIFY ----
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt"
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM users;"

# ---- RESTART SERVICES ----
docker compose up -d app
docker compose logs app --tail 20
```

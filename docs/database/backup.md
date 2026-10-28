# Database backup realisation

Poolaki implements PostgreSQL backups as a dedicated Docker Compose service.
The backup service is enabled only by the `prod` profile and writes plain SQL
dumps to the host filesystem so that database data is not tied to the
PostgreSQL data volume.

## Architecture

The `db_backup` service is defined in
[`docker-compose.yml`](../../docker-compose.yml). It uses the official
`postgres:18` image, which supplies the `pg_dump` and `psql` client tools, and
connects to the `db` service through the private `backup_net` network.

The service receives its connection settings from Compose environment
variables:

- `PGHOST=db`
- `PGDATABASE=${POSTGRES_DB}`
- `PGUSER=${POSTGRES_USER}`
- `PGPASSWORD=${POSTGRES_PASSWORD}`

Credentials must remain in the local `.env` or the deployment secret store.
They must not be copied into this document, backup filenames, shell history, or
logs.

## Enabling backups

Backups are not started by the default development stack. Start the production
profile after configuring `.env`:

```bash
make prod
```

The service waits for PostgreSQL to pass its health check before it starts.
The `db_backup` container can be inspected with:

```bash
docker compose ps db db_backup
docker compose logs --tail=100 db_backup
```

## Backup process

The implementation is
[`backend/backups/backup.sh`](../../backend/backups/backup.sh).

1. The script creates a timestamped file named
   `backend/backups/backup_YYYYMMDD_HHMMSS.sql`.
2. `pg_dump` writes a plain-text SQL dump using the `PG*` environment variables.
3. The script treats the dump as successful only when `pg_dump` exits
   successfully and the resulting file is larger than 100 bytes.
4. A successful run updates `backend/backups/.last_success`.
5. The container runs the script once at startup and repeats it every 86,400
   seconds (24 hours).
6. SQL dumps older than three days are deleted by the cleanup command.

The host directory is mounted at `/backups` in the backup container. The
database's PostgreSQL volume is separate, so removing or recreating the
`db_backup` container does not remove existing dump files.

## Health and verification

The backup health check requires `.last_success` to have been updated within
the previous 2,600 minutes (approximately 43 hours). This detects a stopped
or repeatedly failing backup loop, but it does not prove that the dump can be
restored.

Verify the latest run and inspect the generated files:

```bash
docker compose ps db_backup
docker compose logs --tail=50 db_backup
ls -lh backend/backups/backup_*.sql
stat backend/backups/.last_success
```

For recovery assurance, periodically restore a copy of a dump into an isolated
PostgreSQL database and run the application checks against that database.
Restore testing is required because a successful `pg_dump` process alone does
not validate the complete recovery procedure.

## Restoring a dump

Restoration overwrites data in the target database. Take a current backup,
stop application writers, and confirm the selected dump before proceeding.
Never restore an untrusted SQL file into a production database.

The dump can be streamed from the host into the PostgreSQL container without
mounting the backup directory into the database service:

```bash
make stop-prod
docker compose start db
docker compose exec -T db psql --set=ON_ERROR_STOP=on --file=- \
  < backend/backups/backup_YYYYMMDD_HHMMSS.sql
make start-prod
```

This restores into the database selected by the `PGDATABASE` environment
configuration. If the target database contains newer or conflicting objects,
restore into a clean database instead of attempting to merge an old dump into
the live schema. After restoration:

1. Confirm that `docker compose ps` reports healthy `db` and application
   services.
2. Run the backend test or health checks.
3. Verify representative users, organizations, transactions, goals, and
   notifications.
4. Check `db_backup` logs and wait for the next successful backup.

The commands above preserve the PostgreSQL volume. Do not use
`make rmVolumes` during recovery: that target removes the database volume and
is a destructive reset, not a restore operation.

## Limitations and operational requirements

- The schedule is interval-based rather than calendar-based: restarting the
  container starts a new backup immediately and resets the 24-hour interval.
- Retention is local and short (three days). It is not an off-site or
  immutable backup.
- The backup directory must be protected with filesystem permissions suitable
  for database exports, and it should be copied to separate, access-controlled
  storage for disaster recovery.
- A database backup does not include Docker volumes for Vault, Grafana, Caddy,
  or other services.
- CI disables `db_backup` through
  [`docker-compose.ci.yml`](../../docker-compose.ci.yml); test environments do
  not produce production backups.

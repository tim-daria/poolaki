#!/bin/sh
set -e

GRAFANA_SECRETS_FILE="/vault/agent/secrets/grafana-creds.env"
TRIGGER_FILE="/vault/agent/secrets/.reload-trigger"

MAX_WAIT=60
waited=0


log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

until [ -f "$GRAFANA_SECRETS_FILE" ] \
    && grep -q "^GF_SECURITY_ADMIN_PASSWORD=" "$GRAFANA_SECRETS_FILE" \
    && grep -q "^GF_SMTP_PASSWORD=" "$GRAFANA_SECRETS_FILE"; do
    if [ "$waited" -ge "$MAX_WAIT" ]; then
        echo "ERROR: Timed out waiting for Vault secrets after ${MAX_WAIT}s" >&2
        exit 1
    fi
    log "Waiting for initial Vault secrets... (${waited}s)"
    sleep 1
    waited=$((waited + 1))
done

set -a
. "$GRAFANA_SECRETS_FILE"
set +a

sync_grafana_admin() {
    if [ ! -f "$GRAFANA_SECRETS_FILE" ]; then
        log "ERROR: secrets file not found: $GRAFANA_SECRETS_FILE"
        return 1
    fi

    set -a
    . "$GRAFANA_SECRETS_FILE"
    set +a

    if [ -z "${GF_SECURITY_ADMIN_PASSWORD:-}" ]; then
        log "ERROR: GF_SECURITY_ADMIN_PASSWORD missing/empty in secrets file"
        return 1
    fi

    if [ -z "${GF_SMTP_PASSWORD:-}" ]; then
        log "ERROR: GF_SMTP_PASSWORD missing/empty in secrets file"
        return 1
    fi

    if grafana cli admin reset-admin-password "$GF_SECURITY_ADMIN_PASSWORD"; then
        log "Grafana admin password reset successfully."
    else
        log "ERROR: failed to reset Grafana admin password"
        return 1
    fi
}


# Watch for Vault Agent's reload trigger and restart app on change
watch_trigger() {
	LAST_MTIME=0
	if [ -f "$TRIGGER_FILE" ]; then
	  LAST_MTIME=$(stat -c %Y "$TRIGGER_FILE" 2>/dev/null || stat -f %m "$TRIGGER_FILE")
	fi

	while true; do
	  if [ -f "$TRIGGER_FILE" ]; then
	    CUR_MTIME=$(stat -c %Y "$TRIGGER_FILE" 2>/dev/null || stat -f %m "$TRIGGER_FILE")
	    if [ "$CUR_MTIME" != "$LAST_MTIME" ]; then
	      LAST_MTIME=$CUR_MTIME
	      sync_grafana_admin
	    fi
	  fi
	  sleep 5
	done
}

# Run the watcher in the background
watch_trigger &

# executes original grafana entrypoint.sh
exec /run.sh "$@"

#!/bin/sh
set -e

CLOUDFLARE_SECRETS_FILE="/vault/agent/secrets/cloudflare-creds.env"

MAX_WAIT=60
waited=0

log() {
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

until [ -f "$CLOUDFLARE_SECRETS_FILE" ] \
	&& grep -q "^TUNNEL_TOKEN=" "$CLOUDFLARE_SECRETS_FILE"; do
	if [ "$waited" -ge "$MAX_WAIT" ]; then
		echo "ERROR: Timed out waiting for Vault secrets after ${MAX_WAIT}s" >&2
		exit 1
	fi
	log "Waiting for initial Vault secrets... (${waited}s)"
	sleep 1
	waited=$((waited + 1))
done

set -a
. "$CLOUDFLARE_SECRETS_FILE"
set +a

exec cloudflared --no-autoupdate --loglevel info --metrics 0.0.0.0:60123 tunnel run "$@"
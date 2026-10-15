#!/bin/sh
set -e

AI_SECRETS_FILE="/vault/agent/secrets/ai-creds.env"

MAX_WAIT=60
waited=0

log() {
	echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

until [ -f "$AI_SECRETS_FILE" ] \
	&& grep -q "^LLM_API_KEY=" "$AI_SECRETS_FILE"; do
	if [ "$waited" -ge "$MAX_WAIT" ]; then
		echo "ERROR: Timed out waiting for Vault secrets after ${MAX_WAIT}s" >&2
		exit 1
	fi
	log "Waiting for initial Vault secrets... (${waited}s)"
	sleep 1
	waited=$((waited + 1))
done

set -a
. "$AI_SECRETS_FILE"
set +a

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "$@"
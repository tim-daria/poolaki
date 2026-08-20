#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

if [ -f "./secure/vault-init.json" ]; then
	echo "Vault is already running and connected..."
	exit 0
fi

# cleanup before new run
docker compose down vault -v
DOCKER_SHELL="docker exec -it vault"
docker compose up vault -d

sleep 2

rm -rf data/*
rm -rf secure/vault-init.json

# Init vault
VAULT_INIT_FILE="./secure/vault-init.json"
if [ -f "./secure/vault-init.json" ]; then
	echo "Vault is already initialised - skipping init"
else
	touch "./secure/vault-init.json"
	$DOCKER_SHELL vault operator init -format=json > "./secure/vault-init.json"
fi
# $DOCKER_SHELL vault status

# unsealing vault to make it usable
mapfile -t unseal_keys < <(jq -r '.unseal_keys_b64[0:3][]' "$VAULT_INIT_FILE")

for key in "${unseal_keys[@]}"; do
	$DOCKER_SHELL vault operator unseal "$key"
done

# saving vault ip address for other services
VAULT_IP_ADDR=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' vault)
export VAULT_ADDR=http://"$VAULT_IP_ADDR":8200

# saving root_token
export VAULT_TOKEN=$(jq -r '.root_token' "$VAULT_INIT_FILE")

# login to vault
$DOCKER_SHELL vault login "$VAULT_TOKEN"

# enable database secret engine
if ! $DOCKER_SHELL vault secrets list -format=json | jq -e '."database/"' > /dev/null; then
    $DOCKER_SHELL vault secrets enable database
else
    echo "Database secrets engine already enabled"
fi

# connect to database
$DOCKER_SHELL vault write database/config/postgres_db \
	plugin_name=postgresql-database-plugin  \
	allowed_roles="poolaki_db_role" \
	connection_url="postgresql://{{username}}:{{password}}@postgres_db:5432/postgres?sslmode=disable" \
	username="42student" \
	password="SuperSecurePassword_42"

# create role for database access
$DOCKER_SHELL vault write database/roles/poolaki_db_role \
	db_name=postgres_db \
	default_ttl="4h" \
	max_ttl="24h" \
	creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
		GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"

# rotate root credentials
# hardcoded credentials from the connection are not longer valid from here
$DOCKER_SHELL vault write -f database/rotate-root/postgres_db

# remove the role from the database
$DOCKER_SHELL vault lease revoke -prefix database/creds/poolaki_db_role

# store new credentials
$DOCKER_SHELL vault read database/creds/poolaki_db_role

# TODO
# Vault can connect to the database
# when script was started before, the db credentials changed, so it can not be run a second time
# new database creds need to be stored before the database connection is created!!!
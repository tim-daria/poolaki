#!/usr/bin/env bash
set -uo pipefail

# marks every variable in the file as shell variables
set -a
source ./.env
set +a

DOCKER_SHELL="docker exec vault"
VAULT_INIT_FILE="./secure/vault-init.json"

############################
##### SETTING UP VAULT #####
############################

# check if vault container is running
for i in {1..10}; do
    $DOCKER_SHELL vault status > /dev/null 2>&1 && break
    sleep 1
done

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

# create init file if there is none
if [ -s "$VAULT_INIT_FILE" ]; then
	echo "Vault is already initialised..."
else
	mkdir -p "./secure/django"
	$DOCKER_SHELL vault operator init -format=json > "$VAULT_INIT_FILE"
fi

# unseal vault if it is sealed
vault_status_json=$($DOCKER_SHELL vault status -format=json 2>/dev/null)

if echo "$vault_status_json" | jq -e '.sealed == true' > /dev/null; then
	mapfile -t unseal_keys < <(jq -r '.unseal_keys_b64[0:3][]' "$VAULT_INIT_FILE")
	for key in "${unseal_keys[@]}"; do
		$DOCKER_SHELL vault operator unseal "$key"
	done
fi

# saving vault ip address for other services
# VAULT_IP_ADDR=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' vault)
# export VAULT_ADDR=http://"$VAULT_IP_ADDR":8200

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

# Only configure the connection and rotate once
if ! $DOCKER_SHELL vault read database/config/postgres_db > /dev/null 2>&1; then
	echo "Setting up database secrets engine for the first time..."

	# create access role for database
	$DOCKER_SHELL vault write database/roles/db_role \
		db_name=postgres_db \
		default_ttl="4h" \
		max_ttl="24h" \
		creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
			GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"

	# connect to database
	$DOCKER_SHELL vault write database/config/postgres_db \
		plugin_name=postgresql-database-plugin \
		allowed_roles="db_role" \
		connection_url="postgresql://{{username}}:{{password}}@postgres_db:5432/postgres?sslmode=disable" \
		username="$POSTGRES_USER" \
		password="$POSTGRES_PASSWORD"

	# rotate root credentials
	# credentials from the .env file are not longer valid from here
	$DOCKER_SHELL vault write -f database/rotate-root/postgres_db

	# remove the role from the database
	$DOCKER_SHELL vault lease revoke -prefix database/creds/db_role
else
	echo "Database secrets engine already configured. Skipping setup."
fi

# show new credentials
$DOCKER_SHELL vault read database/creds/db_role

# enable kv secrets engine for static app secrets
if ! $DOCKER_SHELL vault secrets list -format=json | jq -e '."secret/"' > /dev/null; then
	$DOCKER_SHELL vault secrets enable -path=secret kv-v2
else
	echo "KV secrets engine already enabled..."
fi

###########################
##### STORING SECRETS #####
###########################

# store django secrets in kv
$DOCKER_SHELL vault kv put secret/django \
	superuser_username="$DJANGO_SUPERUSER_USERNAME" \
	superuser_email="$DJANGO_SUPERUSER_EMAIL" \
	superuser_password="$DJANGO_SUPERUSER_PASSWORD" \
	intra42_client_id="$INTRA42_CLIENT_ID" \
	intra42_client_secret="$INTRA42_CLIENT_SECRET"

#######################################
###### Setup AppRole for services #####
#######################################

# copy policy file into container and apply it
docker cp ./config/policies/django-db-policy.hcl vault:/tmp/django-db-policy.hcl
$DOCKER_SHELL vault policy write django-db-policy /tmp/django-db-policy.hcl

# enable approle auth method
if ! $DOCKER_SHELL vault auth list -format=json | jq -e '."approle/"' > /dev/null; then
	$DOCKER_SHELL vault auth enable approle
else
	echo "AppRole auth already enabled"
fi

# create approle for app-level services (shared between django and nodejs for now)
# secret_id_ttl=0 --> never expires
# secret_id_num_uses=0 --> unlimited use (set to 1 for single-use)
$DOCKER_SHELL vault write auth/approle/role/app-role \
	token_policies="django-db-policy" \
	token_ttl=1h \
	token_max_ttl=4h \
	secret_id_ttl=0 \
	secret_id_num_uses=0

# fetch role_id (static, safe-ish identifier)
$DOCKER_SHELL vault read -format=json auth/approle/role/app-role/role-id \
	| jq -r '.data.role_id' > ./secure/django/role_id

# generate secret_id (this is the actual secret)
$DOCKER_SHELL vault write -f -format=json auth/approle/role/app-role/secret-id \
	| jq -r '.data.secret_id' > ./secure/django/secret_id

chmod 600 ./secure/django/role_id ./secure/django/secret_id



# TODO
# Change script to entrypoint script, all docker exec... needs to be removed.















# TODO
# Vault can connect to the database
# when script was started before, the db credentials changed, so it can not be run a second time
# new database creds need to be stored before the database connection is created!!!
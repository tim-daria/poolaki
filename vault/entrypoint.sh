#!/bin/bash
set -uo pipefail

# marks every variable in the file as shell variables
# set -a
# source ./.env
# set +a

# Start vault server in the background
vault server -config="${VAULT_CONFIG}/hcl/vault.hcl" &
VAULT_PID=$!

# wait for vault to be reachable before continuing
until vault status > /dev/null 2>&1 || [ $? -eq 2 ]; do
    echo "Waiting for vault to start..."
    sleep 1
done

# DOCKER_SHELL="docker exec vault"
VAULT_INIT_FILE="/vault/secure/vault-init.json"

############################
##### SETTING UP VAULT #####
############################

# create init file if there is none
if [ -s "$VAULT_INIT_FILE" ]; then
	echo "Vault is already initialised..."
else
	mkdir -p "/vault/secure/django"
	vault operator init -format=json > "$VAULT_INIT_FILE"
fi

# unseal vault if it is sealed
vault_status_json=$(vault status -format=json 2>/dev/null)

if echo "$vault_status_json" | jq -e '.sealed == true' > /dev/null; then
	mapfile -t unseal_keys < <(jq -r '.unseal_keys_b64[0:3][]' "$VAULT_INIT_FILE")
	for key in "${unseal_keys[@]}"; do
		vault operator unseal "$key"
	done
fi

# saving vault ip address for other services
# VAULT_IP_ADDR=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' vault)
# export VAULT_ADDR=http://"$VAULT_IP_ADDR":8200

# saving root_token
export VAULT_TOKEN=$(jq -r '.root_token' "$VAULT_INIT_FILE")

# login to vault
vault login "$VAULT_TOKEN"

# enable database secret engine
if ! vault secrets list -format=json | jq -e '."database/"' > /dev/null; then
    vault secrets enable database
else
    echo "Database secrets engine already enabled"
fi

# Only configure the connection and rotate once
if ! vault read database/config/$POSTGRES_DB > /dev/null 2>&1; then
	echo "Setting up database secrets engine for the first time..."

	# create access role for database
	vault write database/roles/db_role \
		db_name=$POSTGRES_DB \
		default_ttl="1m" \
		max_ttl="5m" \
		creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
			GRANT ALL PRIVILEGES ON SCHEMA public TO \"{{name}}\"; \
			GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
        	GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";"

	# connect to database
	vault write database/config/$POSTGRES_DB \
		plugin_name=postgresql-database-plugin \
		allowed_roles="db_role" \
		connection_url="postgresql://{{username}}:{{password}}@$DB_HOST:5432/$POSTGRES_DB?sslmode=disable" \
		username=$POSTGRES_USER \
		password=$POSTGRES_PASSWORD

	# rotate root credentials
	# credentials from the .env file are not longer valid from here
	vault write -f database/rotate-root/$POSTGRES_DB

	# remove the role from the database
	# vault lease revoke -prefix database/creds/db_role
else
	echo "Database secrets engine already configured. Skipping setup."
fi

# show new credentials
vault read database/creds/db_role

# enable kv secrets engine for static app secrets
if ! vault secrets list -format=json | jq -e '."secret/"' > /dev/null; then
	vault secrets enable -path=secret kv-v2
else
	echo "KV secrets engine already enabled..."
fi

###########################
##### STORING SECRETS #####
###########################

# store django and 42 secrets in kv
vault kv put secret/django \
	superuser_username="$DJANGO_SUPERUSER_USERNAME" \
	superuser_email="$DJANGO_SUPERUSER_EMAIL" \
	superuser_password="$DJANGO_SUPERUSER_PASSWORD" \
	intra42_client_id="$INTRA42_CLIENT_ID" \
	intra42_client_secret="$INTRA42_CLIENT_SECRET"

#######################################
###### Setup AppRole for services #####
#######################################

# copy policy file into container and apply it
# docker cp ./config/policies/django-db-policy.hcl vault:/tmp/django-db-policy.hcl
vault policy write django-db-policy /vault/config/policies/django-db-policy.hcl

# enable approle auth method
if ! vault auth list -format=json | jq -e '."approle/"' > /dev/null; then
	vault auth enable approle
else
	echo "AppRole auth already enabled"
fi

# create approle for app-level services (shared between django and nodejs for now)
# secret_id_ttl=0 --> never expires
# secret_id_num_uses=0 --> unlimited use (set to 1 for single-use)
vault write auth/approle/role/app-role \
	token_policies="django-db-policy" \
	token_ttl=1h \
	token_max_ttl=4h \
	secret_id_ttl=0 \
	secret_id_num_uses=0

# fetch role_id (static, safe-ish identifier)
# vault read -format=json auth/approle/role/app-role/role-id \
# 	| jq -r '.data.role_id' > /vault/secure/django/role_id

# # generate secret_id (this is the actual secret)
# vault write -f -format=json auth/approle/role/app-role/secret-id \
# 	| jq -r '.data.secret_id' > /vault/secure/django/secret_id

# chmod 600 /vault/secure/django/role_id /vault/secure/django/secret_id

if [ ! -s /vault/secure/django/role_id ] || [ ! -s /vault/secure/django/secret_id ]; then
    vault read -format=json auth/approle/role/app-role/role-id | jq -r '.data.role_id' > /vault/secure/django/vault_role_id
    vault write -f -format=json auth/approle/role/app-role/secret-id | jq -r '.data.secret_id' > /vault/secure/django/vault_secret_id
    chmod 644 /vault/secure/django/vault_role_id /vault/secure/django/vault_secret_id
fi

# Bring the vault server process to the foreground so container stays alive
# and signals (SIGTERM etc.) are handled properly
wait $VAULT_PID

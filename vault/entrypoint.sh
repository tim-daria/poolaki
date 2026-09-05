#!/bin/bash
set -uo pipefail

# Start vault server in the background
vault server -config="${VAULT_CONFIG}/hcl/vault.hcl" & VAULT_PID=$!

# wait for vault to be reachable before continuing
until vault status > /dev/null 2>&1 || [ $? -eq 2 ]; do
    echo "Waiting for vault to start..."
    sleep 1
done

############################
##### SETTING UP VAULT #####
############################

VAULT_INIT_FILE="/vault/secure/vault-init.json"

INITIALIZED=$(vault status -format=json | jq -r '.initialized')

if [ "$INITIALIZED" = "false" ]; then
	echo "Vault not initialized, initializing now..."
	
	echo "Creating vault init file..."
	vault operator init -key-shares=5 -key-threshold=3 -format=json > "$VAULT_INIT_FILE"

	mapfile -t unseal_keys < <(jq -r '.unseal_keys_b64[0:3][]' "$VAULT_INIT_FILE")
	for key in "${unseal_keys[@]}"; do
		vault operator unseal "$key"
	done

	# saving root_token
	VAULT_TOKEN=$(jq -r '.root_token' "$VAULT_INIT_FILE")

	# login to vault
	vault login "$VAULT_TOKEN"

	# enable database secret engine
	vault secrets enable database

	# create access role for database
	vault write database/roles/db_role \
		db_name="$POSTGRES_DB" \
		default_ttl="4h" \
		max_ttl="12h" \
		creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
			GRANT ALL PRIVILEGES ON SCHEMA public TO \"{{name}}\"; \
			GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
			GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
		revocation_statements="REASSIGN OWNED BY \"{{name}}\" TO "$POSTGRES_USER"; \
        DROP OWNED BY \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";"

	# connect to database
	vault write database/config/$POSTGRES_DB \
		plugin_name=postgresql-database-plugin \
		allowed_roles="db_role" \
		connection_url="postgresql://{{username}}:{{password}}@$DB_HOST:5432/$POSTGRES_DB?sslmode=disable" \
		username=$POSTGRES_USER \
		password=$POSTGRES_PASSWORD

	# rotate root credentials
	# password from the .env file is not longer valid from here
	vault write -f database/rotate-root/$POSTGRES_DB

	# show new db credentials
	vault read database/creds/db_role

	# enable kv secrets engine for static app secrets
	vault secrets enable -path=secret kv-v2

	###########################
	##### STORING SECRETS #####
	###########################

	# store django admin creds and 42 auth creds in kv
	vault kv put secret/django/admin \
		django_superuser_username="$DJANGO_SUPERUSER_USERNAME" \
		django_superuser_email="$DJANGO_SUPERUSER_EMAIL" \
		django_superuser_password="$DJANGO_SUPERUSER_PASSWORD" \
		
	vault kv put secret/django/social_auth \
		intra42_client_id="$INTRA42_CLIENT_ID" \
		intra42_client_secret="$INTRA42_CLIENT_SECRET"

	#######################################
	###### Setup AppRole auth method #####
	#######################################

	# load policies for service
	vault policy write django-policy /vault/config/policies/django-policy.hcl
	# vault policy write django-admin-policy vault/config/policies/django-admin-policy.hcl

	# enable approle auth method
	vault auth enable approle

	# create role to access the database
	# secret_id_ttl=0 --> never expires
	# secret_id_num_uses=0 --> unlimited use (set to 1 for single-use)
	vault write auth/approle/role/django-role \
		token_policies="django-policy" \
		token_ttl=1h \
		token_max_ttl=4h \
		secret_id_ttl=0 \
		secret_id_num_uses=0
	
	# get roleID & secretID for django-role
	vault read -format=json auth/approle/role/django-role/role-id \
		| jq -r '.data.role_id' > /vault/secure/id/django_role_id

	vault write -f -format=json auth/approle/role/django-role/secret-id \
		| jq -r '.data.secret_id' > /vault/secure/id/django_secret_id

	chmod 644 /vault/secure/id/django_role_id /vault/secure/id/django_secret_id

else
	# unseal vault if initialized
	echo "Vault already initialized, checking seal status..."
	SEALED=$(vault status -format=json | jq -r '.sealed')

	if [ "$SEALED" = "true" ]; then
		echo "Vault is sealed, unsealing..."
		key1=$(jq -r ".unseal_keys_b64[0]" "$VAULT_INIT_FILE")
		key2=$(jq -r ".unseal_keys_b64[1]" "$VAULT_INIT_FILE")
		key3=$(jq -r ".unseal_keys_b64[2]" "$VAULT_INIT_FILE")
		vault operator unseal "$key1"
		vault operator unseal "$key2"
		vault operator unseal "$key3"
	else
		echo "Vault already unsealed."
	fi
fi

# Bring the vault server process to the foreground that container stays alive
# and signals (SIGTERM etc.) are handled properly
wait $VAULT_PID

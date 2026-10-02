#!/usr/bin/env bash

DOCKER_SHELL="docker exec vault"

echo "=== Vault status ==="
echo $(docker exec vault vault status -format=json) | jq

# login to vault to read credentials
VAULT_ROOT=$($DOCKER_SHELL jq -r '.root_token' /vault/secure/vault-init.json)
# VAULT_ROOT=$($DOCKER_SHELL cat /vault/secure/id/agent-token)
$DOCKER_SHELL vault login $VAULT_ROOT > /dev/null

# read kv credentials
$DOCKER_SHELL vault kv list -format=json secret/django | jq -r '.[]' | while read path; do
  echo
  echo "=== $path ==="
  $DOCKER_SHELL vault kv get -format=json secret/django/"$path" | jq '.data.data'

done

echo
echo "=== grafana ==="
 $DOCKER_SHELL vault kv get -format=json secret/grafana/"$path" | jq '.data.data'

echo
echo "=== cloudflare ==="
$DOCKER_SHELL vault kv get -format=json secret/cloudflare/"$path" | jq '.data.data'

# read database credentials
echo
echo "=== Database credentials ==="
$DOCKER_SHELL vault read  database/creds/db_role

# read vault root token for vault UI
echo
echo "=== Vault root credentials ==="
echo $VAULT_ROOT

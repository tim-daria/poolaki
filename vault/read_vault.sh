#!/usr/bin/env bash

DOCKER_SHELL="docker exec vault"

echo "=== Vault status ==="
echo $(docker exec vault vault status -format=json) | jq

# read kv credentials
echo
$DOCKER_SHELL vault kv list -format=json secret/django/ | jq -r '.[]' | while read path; do
  echo "=== $path ==="
  echo
  $DOCKER_SHELL vault kv get secret/django/"$path"
done

# read database credentials
echo
echo "=== Database credentials ==="
$DOCKER_SHELL vault read database/creds/db_role

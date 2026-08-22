#!/usr/bin/env bash

DOCKER_SHELL="docker exec vault"

# read kv credentials
$DOCKER_SHELL vault kv list -format=json secret/ | jq -r '.[]' | while read path; do
  echo "=== $path ==="
  $DOCKER_SHELL vault kv get secret/"$path"
done

# read database credentials
echo
echo "=== Database credentials ==="
$DOCKER_SHELL vault read database/creds/db_role

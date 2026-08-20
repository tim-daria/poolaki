#!/bin/bash
docker exec vault vault kv list -format=json secret/ | jq -r '.[]' | while read path; do
  echo "=== $path ==="
  docker exec vault vault kv get secret/"$path"
done
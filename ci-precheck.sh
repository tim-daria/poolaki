#!/usr/bin/env bash
set -uo pipefail

printf "\n🐳 Stopping database container...\n"
docker stop postgres_db

cd ./backend/django

printf "\n Creating new .venv...\n\n"
uv venv --clear
uv sync

printf "\n🐳 Creating test database...\n"
docker run --rm -d \
  --name ci-postgres \
  -e POSTGRES_DB=test_db \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  -p 5432:5432 \
  postgres:18

export POSTGRES_DB=test_db
export POSTGRES_USER=test_user
export POSTGRES_PASSWORD=test_password
export DB_HOST=localhost
export DB_PORT=5432

sleep 2

printf "\n🔎 Running checks...\n"
uv run pre-commit run --all-files

printf "\n📂 Changed files:\n"
git status | grep "modified:"

printf "\n🐳 Stopping test database...\n"
docker stop ci-postgres

printf "\n🐳 Starting database container...\n"
docker start postgres_db

printf "\n✅ All checks done!\n"
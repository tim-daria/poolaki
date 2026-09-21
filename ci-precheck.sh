#!/usr/bin/env bash
set -uo pipefail

printf "\n🐳 Stopping database container...(ignore this if it wasn't running)\n"
docker stop postgres_db

cd ./backend/django

printf "\nCreating new .venv...\n\n"
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
export DATABASE_USER=test_user
export DATABASE_PASSWORD=test_password
export DB_HOST=localhost
export DB_PORT=5432

sleep 2

printf "\n🔍 Running formatting check...\n"
uv run ruff format --check .

printf "\n🔍 Running linter...\n"
uv run ruff check .

printf "\n🔍 Running type checker...\n"
uv run mypy .

printf "\n🔍 Running manage.py check...\n"
uv run python manage.py check

printf "\n🔍 Running migrations...\n"
uv run python manage.py migrate

printf "\n🔍 Running pytest...\n"
uv run pytest .

printf "\n📂 Changed files:\n"
git status | grep "modified:"

printf "\n🤖 Running AI Service checks...\n"
cd ../../ai-service

uv venv --clear
uv sync

printf "\n🔍 AI Service: Running formatting check...\n"
uv run ruff format --check .

printf "\n🔍 AI Service: Running linter...\n"
uv run ruff check .

printf "\n🔍 AI Service: Running type checker...\n"
uv run mypy .

printf "\n🔍 AI Service: Running pytest...\n"
uv run pytest .

cd ..

printf "\n⚛️  Running Frontend checks...\n"
cd frontend

# Mirrors the `uv venv --clear && uv sync` above: a clean install from the
# lockfile, so the checks below run against what CI would resolve.
npm ci

printf "\n🔍 Frontend: Running formatting check...\n"
npm run format:check

printf "\n🔍 Frontend: Running linter...\n"
npm run lint

printf "\n🔍 Frontend: Running type checker...\n"
npx tsc -b

cd ..

printf "\n🐳 Stopping test database...\n"
docker stop ci-postgres

# The test database's settings were exported for pytest above, and an exported
# variable beats .env when compose interpolates ${DB_HOST} and friends — the
# stack would come up pointing at localhost:5432/test_db. Drop them so the
# services are built from .env as usual.
unset POSTGRES_DB DATABASE_USER DATABASE_PASSWORD DB_HOST DB_PORT

# The e2e suite drives the real app, so the dev stack has to be up: it owns
# port 5432, which is why the test database is stopped first.
printf "\n🐳 Starting the dev stack...\n"
docker compose up -d

printf "\n⏳ Waiting for the app...\n"
for _ in $(seq 1 90); do
  if curl -sf http://poolaki.localhost:8080/health/ >/dev/null; then break; fi
  sleep 2
done
curl -sf http://poolaki.localhost:8080/health/ >/dev/null

printf "\n🎭 Running Playwright e2e tests...\n"
cd frontend

# No-op once the browser is cached; CI installs it the same way.
npx playwright install chromium

npm run test:e2e

cd ..

printf "\n✅ All checks done!\n"
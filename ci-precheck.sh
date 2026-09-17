#!/usr/bin/env bash
set -ueo pipefail

# Runs on every exit, including a failing check aborting the script under
# `set -e`. Without it, the dev stack is left with the project database down
# and the throwaway one still holding host port 5432.
#
# Both commands exit 1 when the container does not exist (an abort before the
# `docker run` below, or a precheck run with the compose stack down), so each
# is guarded: an unguarded failure would kill the rest of the trap and mask
# the exit status of the check that actually failed.
cleanup() {
  printf "\n🐳 Stopping test database...\n"
  docker stop ci-postgres >/dev/null 2>&1 || true

  printf "\n🐳 Starting database container...(ignore this if it wasn't running)\n"
  docker start postgres_db >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf "\n🐳 Stopping database container...(ignore this if it wasn't running)\n"
docker stop postgres_db

cd ./backend/django

printf "\nCreating new .venv...\n\n"
uv venv --clear
uv sync

printf "\n🐳 Creating test database...\n"
# The trap above does not fire on SIGKILL or a reboot, so a leftover container
# can still be holding the name and host port 5432.
docker stop ci-postgres >/dev/null 2>&1 || true
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

printf "\n🔍 Frontend: Running unit tests...\n"
npm run test

printf "\n🔍 Frontend: Running type checker...\n"
npx tsc -b

cd ..

printf "\n✅ All checks done!\n"
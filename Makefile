
COMPOSE_FILE=./docker-compose.yml
COMPOSE_FILE_DEV=./docker-compose-dev.yml

.PHONY: up re prod re-prod down stop start start-prod stop-prod build status status_all logs clean fclean rmVolumes \
		Tcaddy Tdjango Tdb Tnode Tvault Tvault_agent Tdb_backup Tai \
		readVault wafLog auditLog aiAudit

all: up

### Production commands ###

up:
	@docker compose -f "$(COMPOSE_FILE)" up -d

re:
	@docker compose -f "$(COMPOSE_FILE)" up -d --build

full:
	@docker compose -f "$(COMPOSE_FILE)" --profile full up -d

re-full:
	@docker compose -f "$(COMPOSE_FILE)" --profile full up -d --build

down:
	@docker compose -f "$(COMPOSE_FILE)" --profile full down

build:
	@docker compose -f "$(COMPOSE_FILE)" build

# stop the dev-stack
stop: 
	@docker compose -f "$(COMPOSE_FILE)" stop

# start the dev-stack
start:
	@docker compose -f "$(COMPOSE_FILE)" start

# stop the prod-stack
stop-full: 
	@docker compose -f "$(COMPOSE_FILE)" --profile full stop

# start the prod-stack
start-full:
	@docker compose -f "$(COMPOSE_FILE)" --profile full start

#### Development commands ###

dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" up -d

re-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" up -d --build

full-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" --profile full up -d

re-full-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" --profile full up -d --build

down-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" --profile full down

# stop the dev-stack
stop-dev: 
	@docker compose -f "$(COMPOSE_FILE_DEV)" stop

# start the dev-stack
start-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" start

# stop the prod-stack
stop-full-dev: 
	@docker compose -f "$(COMPOSE_FILE_DEV)" --profile full stop

# start the prod-stack
start-full-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" --profile full start

build-dev:
	@docker compose -f "$(COMPOSE_FILE_DEV)" build

### Utility commands

status: 
	@echo "=== 🐋 Container Status (running) 🐋 ==="
	@docker ps

status_all:
	@echo "=== 🐋 Container (running & not running) 🐋 ==="
	@docker ps -a
	@echo "\n=== 📄 Images 📄 ==="
	@docker image ls
	@echo "\n=== 💾 Volumes 💾 ==="
	@docker volume ls
	@echo "\n=== 🌐 Networks 🌐 ==="
	@docker network ls

logs:
	@docker compose -f "$(COMPOSE_FILE)" logs

Tcaddy:
	@docker exec -it caddy sh

Tdjango:
	@docker exec -it django sh

Tnode:
	@docker exec -it nodejs sh

Tdb:
	@docker exec -it postgres_db psql -d app_database

Tvault:
	@docker exec -it vault sh

Tvault_agent:
	@docker exec -it vault_agent sh

Tdb_backup:
	@docker exec -it db_backup sh

Tai:
	@docker exec -it ai-service sh

clean:
	@echo "=== 🗑️  Remove all container, build cache objects and networks 🗑️  ==="
	@docker compose --profile full down;
	@docker system prune -f

fclean:
	@echo "=== 🗑️  Remove all container, build cache objects, untagged images and networks 🗑️  ==="
	@docker compose --profile full down;
	@docker system prune -af

rmVolumes:
	@echo "=== 🗑️  Remove all volumes 🗑️  ==="
	@docker compose --profile full down -v;

readVault:
	@./vault/read_vault.sh

wafLog:
	@docker exec caddy cat  /coraza/logs/audit.log | tail -1 | jq

auditLog:
	@docker exec caddy cat  /coraza/logs/audit.log | jq > ./audit.log

aiAudit:
	@docker compose -f "$(COMPOSE_FILE)" logs --no-color --no-log-prefix ai-service | python3 scripts/ai_audit.py > ./ai-audit.md
	@echo "=== 📊 AI audit written to ai-audit.md 📊 ==="
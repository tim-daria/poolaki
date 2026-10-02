
COMPOSE_FILE=./docker-compose.yml

.PHONY: up re prod re-prod down stop start build status status_all logs clean fclean rmVolumes \
		Tcaddy Tdjango Tdb Tnode Tvault Tvault_agent Tdb_backup Tai \
		readVault wafLog auditLog

all: up

up:
	@docker compose -f "$(COMPOSE_FILE)" up -d

re:
	@docker compose -f "$(COMPOSE_FILE)" up -d --build

prod:
	@docker compose -f "$(COMPOSE_FILE)" --profile prod up -d

re-prod:
	@docker compose -f "$(COMPOSE_FILE)" --profile prod up -d --build

down:
	@docker compose -f "$(COMPOSE_FILE)" --profile prod down

stop: 
	@docker compose -f "$(COMPOSE_FILE)" --profile prod stop

start: 
	@docker compose -f "$(COMPOSE_FILE)" --profile prod start

build:
	@docker compose -f "$(COMPOSE_FILE)" build

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
	@docker compose --profile prod down;
	@docker system prune -f

fclean:
	@echo "=== 🗑️  Remove all container, build cache objects, untagged images and networks 🗑️  ==="
	@docker compose --profile prod down;
	@docker system prune -af

rmVolumes:
	@echo "=== 🗑️  Remove all volumes 🗑️  ==="
	@docker compose --profile prod down -v;

readVault:
	@./vault/read_vault.sh

wafLog:
	@docker exec caddy cat  /coraza/logs/audit.log | tail -1 | jq

auditLog:
	@docker exec caddy cat  /coraza/logs/audit.log | jq > ./audit.log

COMPOSE_FILE=./docker-compose.yml

.PHONY: up down stop start build status status_all logs clean fclean \
		rbCaddy rbDjango rbPostgres rbNode rbGrafana \
		rbPrometheus rbVault rbAgent rbCloudflare rbDbBackup rbAi \
		tCaddy tDjango tPostgres tNode tGrafana \
		tPrometheus tVault tAgent tCloudflare tDbBackup tAi

all: up

up:
	@docker compose -f "$(COMPOSE_FILE)" up -d

down:
	@docker compose -f "$(COMPOSE_FILE)" down

down-v:
	@docker compose -f "$(COMPOSE_FILE)" down -v

stop: 
	@docker compose -f "$(COMPOSE_FILE)" stop

start: 
	@docker compose -f "$(COMPOSE_FILE)" start

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

tCaddy:
	@docker exec -it caddy sh

tDjango:
	@docker exec -it django sh

tNode:
	@docker exec -it nodejs sh

tPostgres:
	@docker exec -it postgres_db psql -d app_database

rbCaddy:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build caddy
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbDjango:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build backend
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbNode:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build frontend
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbPostgres:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build db
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbPrometheus:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build prometheus
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbGrafana:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build grafana
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbVault:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build vault
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbAgent:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build vault_agent
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbDbBackup:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build db_backup
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbAi:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build ai-service
	@docker compose -f "$(COMPOSE_FILE)" up -d

rbCloudflare:
	$(MAKE) down;
	@docker compose -f "$(COMPOSE_FILE)" build cloudflared
	@docker compose -f "$(COMPOSE_FILE)" up -d

clean:
	@echo "=== 🗑️ Remove all container, networks and volumes 🗑️ ==="
	$(MAKE) down;
	@docker system prune -f

fclean:
	@echo "=== 🗑️ Remove all images, container, networks and volumes 🗑️ ==="
	$(MAKE) down;
	@docker system prune -af

rmVolumes:
	@echo "=== 🗑️ Remove all volumes 🗑️ ==="
	$(MAKE) down -v;
	@docker volume prune -f
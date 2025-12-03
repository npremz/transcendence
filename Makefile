DC ?= docker compose

.PHONY: up build down logs restart ps health clean re test-blockchain

up:
	./infra/docker/base/build.sh
	$(DC) up --build -d

build:
	./infra/docker/base/build.sh
	$(DC) build

down:
	$(DC) down

logs-front:
	$(DC) logs -f front

logs-nginx:
	docker exec -it nginx tail -f /var/log/nginx/access.log

logs-gameback:
	$(DC) logs -f gameback

logs-userback:
	$(DC) logs -f userback

logs-quickplay:
	$(DC) logs -f quickplayback

logs-tournament:
	$(DC) logs -f tournamentback

logs-db:
	$(DC) logs -f database

logs-blockchain:
	$(DC) logs -f blockchainback

restart: down up

ps:
	$(DC) ps

health:
	@curl -sk https://localhost:8443/nginx-health || true

clean:
	$(DC) down -v --rmi local --remove-orphans

re: clean up

test-blockchain:
	@./scripts/test-blockchain.sh

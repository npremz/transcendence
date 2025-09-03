DC ?= docker compose

.PHONY: up build down logs restart ps health clean re

up:
	$(DC) up --build -d

build:
	$(DC) build

down:
	$(DC) down

logs-front:
	$(DC) logs -f front

logs-nginx:
	$(DC) logs -f nginx

restart: down up

ps:
	$(DC) ps

health:
	@curl -sk https://localhost:8443/health || true

clean:
	$(DC) down -v --rmi local --remove-orphans

re: clean up

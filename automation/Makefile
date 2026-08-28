.PHONY: up down logs lint test script first-video help

help:
	@echo "Trot Automation operator commands:"
	@echo "  make up           - start n8n + worker"
	@echo "  make down         - stop all services"
	@echo "  make logs         - tail n8n logs"
	@echo "  make lint         - ruff check scripts/"
	@echo "  make script SOURCE=https://...  - generate one script from a source URL"
	@echo "  make first-video  - end-to-end manual single-video run (Phase 1)"

up:
	docker compose up -d
	@echo "n8n running at http://localhost:5678"

down:
	docker compose down

logs:
	docker compose logs -f n8n

lint:
	docker compose exec worker ruff check /scripts

script:
	docker compose exec worker python /scripts/llm/script_generator.py --source "$(SOURCE)"

first-video:
	@echo "See docs/runbook-first-video.md for the full Phase 1 manual procedure."

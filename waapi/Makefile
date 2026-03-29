.PHONY: dev up down logs migrate seed

# Gelistirme ortamini baslat
dev:
	docker compose up --build

# Arka planda baslat
up:
	docker compose up -d --build

# Durdur
down:
	docker compose down

# Loglari goster
logs:
	docker compose logs -f

# Backend loglari
logs-backend:
	docker compose logs -f backend

# Migration olustur
migrate:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

# Migration calistir
upgrade:
	docker compose exec backend alembic upgrade head

# Veritabanini sifirla
reset-db:
	docker compose down -v
	docker compose up -d postgres redis
	sleep 3
	docker compose up -d backend
	docker compose exec backend alembic upgrade head

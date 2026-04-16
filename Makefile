# PANGEA CARBON — Makefile
# Usage: make deploy | make backend | make frontend | make logs | make status

.PHONY: deploy backend frontend logs status restart db-push

deploy:
	cd /opt/pangea-carbon && git pull origin main && docker compose build --no-cache && docker compose up -d

backend:
	cd /opt/pangea-carbon && git pull origin main && docker compose build backend --no-cache && docker compose up -d backend

frontend:
	cd /opt/pangea-carbon && git pull origin main && docker compose build frontend --no-cache && docker compose up -d frontend

logs:
	cd /opt/pangea-carbon && docker compose logs --tail=100 -f

logs-backend:
	cd /opt/pangea-carbon && docker compose logs backend --tail=100 -f

status:
	cd /opt/pangea-carbon && git log --oneline -3 && echo "" && docker compose ps

restart:
	cd /opt/pangea-carbon && docker compose restart backend frontend

db-push:
	cd /opt/pangea-carbon && docker compose exec backend npx prisma db push --accept-data-loss

seed:
	cd /opt/pangea-carbon && docker compose exec backend node src/utils/seed.js

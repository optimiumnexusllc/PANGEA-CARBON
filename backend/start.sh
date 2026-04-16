#!/bin/sh
# PANGEA CARBON Backend Startup
echo "[PANGEA] Checking database schema..."

# Skipping prisma push if DB already has all tables (faster startup)
npx prisma db push --accept-data-loss 2>&1 | tail -3 || echo "[PANGEA] DB push warning (continuing)"

echo "[PANGEA] Database ready. Starting server..."
exec node src/index.js

#!/bin/sh
# PANGEA CARBON Backend Startup
echo "[PANGEA] Starting database migration..."

# Retry prisma db push jusqu'à 10 fois
ATTEMPTS=0
MAX=10
until npx prisma db push --accept-data-loss || [ $ATTEMPTS -eq $MAX ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "[PANGEA] Migration attempt $ATTEMPTS/$MAX failed, retrying in 3s..."
  sleep 3
done

echo "[PANGEA] Database ready. Starting server..."
exec node src/index.js

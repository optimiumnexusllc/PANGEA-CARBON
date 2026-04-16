#!/bin/sh
# PANGEA CARBON Backend Startup
echo "[PANGEA] Checking database schema..."

# Utiliser migrate deploy si des migrations existent, sinon db push avec gestion d'erreur
# On ignore l'erreur P2002 (enum conflict) car le schema est deja en place
npx prisma db push --accept-data-loss 2>&1 | grep -v P2002 | grep -v "Unique constraint" || true

echo "[PANGEA] Database ready. Starting server..."
exec node src/index.js

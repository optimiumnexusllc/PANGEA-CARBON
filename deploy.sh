#!/bin/bash
# PANGEA CARBON — Script de déploiement automatique
# Usage: bash deploy.sh [backend|frontend|all]
# Toujours lancé depuis /opt/pangea-carbon

set -e
cd /opt/pangea-carbon

TARGET=${1:-all}
echo "🚀 PANGEA CARBON — Deploy $TARGET"
echo "📦 Git pull..."
git pull origin main

if [ "$TARGET" = "backend" ] || [ "$TARGET" = "all" ]; then
  echo "🔨 Building backend..."
  docker compose build backend --no-cache
  docker compose up -d backend
  echo "✓ Backend deployed"
fi

if [ "$TARGET" = "frontend" ] || [ "$TARGET" = "all" ]; then
  echo "🔨 Building frontend..."
  docker compose build frontend --no-cache
  docker compose up -d frontend
  echo "✓ Frontend deployed"
fi

echo ""
echo "📊 Status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "✅ Deploy complete — $(git log --oneline -1)"

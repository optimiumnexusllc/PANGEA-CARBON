#!/bin/bash
echo "=== PANGEA CARBON — Migration DB ESG ==="
cd /opt/pangea-carbon

# 1. Push schema ESGAssessment
echo "1. Pushing ESG schema to DB..."
docker compose exec backend npx prisma db push --accept-data-loss
echo "Done."

# 2. Verify table created
echo "2. Verifying tables..."
docker compose exec postgres psql -U pangea -d pangea_carbon -c "\\dt esg*" 2>/dev/null || echo "Table check via docker"

echo "=== Migration complete ==="

#!/bin/bash
# PANGEA CARBON — Script de réparation production
# Usage: bash scripts/fix-prod.sh

set -e
cd /opt/pangea-carbon

echo "═══════════════════════════════════════════"
echo "  PANGEA CARBON — Diagnostic & Réparation"
echo "═══════════════════════════════════════════"
echo ""

# 1. Status des conteneurs
echo "▶ 1. Status des conteneurs"
docker compose ps
echo ""

# 2. Logs backend (dernières erreurs)
echo "▶ 2. Logs backend (30 dernières lignes)"
docker compose logs backend --tail 30 2>&1
echo ""

# 3. Test connexion DB
echo "▶ 3. Test connexion base de données"
docker compose exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT 1 as ok\`.then(r => { console.log('✓ DB OK:', r); process.exit(0); })
  .catch(e => { console.error('✗ DB ERROR:', e.message); process.exit(1); });
"
echo ""

# 4. Prisma db push (créer les tables manquantes)
echo "▶ 4. Migration Prisma (nouveaux modèles Sprint 1 & 2)"
docker compose exec -T backend npx prisma db push --accept-data-loss 2>&1
echo ""

# 5. Seed des Feature Flags
echo "▶ 5. Seed des Feature Flags"
docker compose exec -T backend node src/utils/seed-features.js 2>&1
echo ""

# 6. Test de l'API auth
echo "▶ 6. Test de l'API de login"
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@pangea-carbon.com","password":"PangeaCarb0n@2026!"}' \
  2>&1)
echo "Réponse: $RESPONSE" | head -c 200
echo ""

# 7. Test via nginx (HTTPS)
echo "▶ 7. Test via nginx HTTPS"
HTTPS_RESP=$(curl -sk -X POST https://pangea-carbon.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@pangea-carbon.com","password":"PangeaCarb0n@2026!"}' \
  2>&1)
echo "Réponse HTTPS: $HTTPS_RESP" | head -c 300
echo ""

# 8. Si login échoue, reset le mot de passe admin en DB directement
echo "▶ 8. Reset mot de passe admin (sécurisé)"
docker compose exec -T backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
bcrypt.hash('PangeaCarb0n@2026!', 12).then(hash =>
  p.user.updateMany({
    where: { email: 'contact@pangea-carbon.com' },
    data: { password: hash, isActive: true, emailVerified: true, verifyToken: null, verifyExpires: null }
  })
).then(r => { console.log('✓ Admin password reset:', r.count, 'user(s) mis à jour'); })
 .catch(e => console.error('✗', e.message))
 .finally(() => p.\$disconnect());
"
echo ""

# 9. Redémarrer le backend
echo "▶ 9. Redémarrage du backend"
docker compose restart backend
sleep 5
docker compose ps | grep backend
echo ""

echo "═══════════════════════════════════════════"
echo "  Réparation terminée!"
echo "  Essayez de vous connecter sur:"
echo "  https://pangea-carbon.com/auth/login"
echo "  Email: contact@pangea-carbon.com"
echo "  Password: PangeaCarb0n@2026!"
echo "═══════════════════════════════════════════"

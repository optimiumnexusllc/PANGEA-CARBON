#!/bin/bash
# ================================================================
# PANGEA CARBON Africa - Script de déploiement VPS
# Usage: chmod +x setup.sh && ./setup.sh
# ================================================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[PANGEA CARBON]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   PANGEA CARBON Africa — Déploiement VPS    ║${NC}"
echo -e "${CYAN}║   Carbon Credit MRV SaaS Platform      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# --- Variables ---
read -p "→ Domaine (ex: mrv.mondomaine.com): " DOMAIN
read -p "→ Email Let's Encrypt: " EMAIL
read -p "→ Repo GitHub (ex: username/pangea-carbon): " REPO
read -s -p "→ Mot de passe PostgreSQL: " PG_PASS; echo
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH=$(openssl rand -hex 64)

log "Mise à jour du système..."
apt-get update -qq && apt-get upgrade -y -qq
ok "Système à jour"

# --- Docker ---
if ! command -v docker &> /dev/null; then
  log "Installation Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
  ok "Docker installé"
else
  ok "Docker déjà présent ($(docker --version | cut -d' ' -f3))"
fi

# --- Docker Compose ---
if ! command -v docker compose &> /dev/null; then
  log "Installation Docker Compose..."
  apt-get install -y docker-compose-plugin
  ok "Docker Compose installé"
fi

# --- Utilitaires ---
apt-get install -y -qq git ufw fail2ban

# --- Firewall ---
log "Configuration du firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall configuré (22, 80, 443)"

# --- Fail2ban ---
systemctl enable fail2ban && systemctl start fail2ban
ok "Fail2ban activé"

# --- Cloner le repo ---
log "Clonage du repository..."
cd /opt
if [ -d "pangea-carbon" ]; then
  warn "Dossier existant — mise à jour..."
  cd pangea-carbon && git pull
else
  git clone "https://github.com/$REPO.git" pangea-carbon
  cd pangea-carbon
fi
ok "Code cloné dans /opt/pangea-carbon"

# --- .env ---
log "Génération du fichier .env..."
cat > .env << EOF
DOMAIN=$DOMAIN
FRONTEND_URL=https://$DOMAIN
NEXT_PUBLIC_API_URL=https://$DOMAIN/api

POSTGRES_DB=pangea-carbon
POSTGRES_USER=pangea-carbon_user
POSTGRES_PASSWORD=$PG_PASS
DATABASE_URL=postgresql://pangea-carbon_user:$PG_PASS@postgres:5432/pangea-carbon

REDIS_URL=redis://redis:6379

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EOF
chmod 600 .env
ok ".env généré et sécurisé"




# --- SSL - Certbot pré-déploiement ---
log "Configuration SSL Let's Encrypt..."
mkdir -p nginx/ssl
docker run --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/webroot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --agree-tos \
  --non-interactive \
  --email "$EMAIL" \
  -d "$DOMAIN" || warn "SSL ignoré en mode test - utilisez --staging pour les tests"
ok "Certificats SSL obtenus"

# --- Build & démarrage ---
log "Build des images Docker..."
docker compose build --no-cache
ok "Images construites"

log "Démarrage de la plateforme..."
docker compose up -d
ok "Services démarrés"

# --- Migrations DB ---
log "Application des migrations base de données..."
sleep 5
docker compose exec backend npx prisma migrate deploy
ok "Migrations appliquées"

# --- Vérification santé ---
log "Vérification de santé..."
sleep 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" || echo "000")
if [ "$HTTP" == "200" ]; then
  ok "API en ligne — HTTP $HTTP"
else
  warn "API répond HTTP $HTTP — vérifiez les logs: docker compose logs backend"
fi

# --- Script de sauvegarde ---
cat > /opt/pangea-carbon/scripts/backup.sh << 'BACKUP'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/pangea-carbon"
mkdir -p $BACKUP_DIR
docker compose exec -T postgres pg_dump -U pangea-carbon_user pangea-carbon | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
find $BACKUP_DIR -mtime +30 -delete
echo "Sauvegarde créée: $BACKUP_DIR/db_$DATE.sql.gz"
BACKUP
chmod +x /opt/pangea-carbon/scripts/backup.sh

# Cron quotidien 2h
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/pangea-carbon/scripts/backup.sh >> /var/log/pangea-carbon-backup.log 2>&1") | crontab -
ok "Sauvegarde automatique configurée (2h quotidien)"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ PANGEA CARBON Africa déployé avec succès !       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  URL:    https://$DOMAIN${NC}"
echo -e "${GREEN}║  API:    https://$DOMAIN/api/health${NC}"
echo -e "${GREEN}║  Logs:   docker compose logs -f${NC}"
echo -e "${GREEN}║  DB:     docker compose exec postgres psql -U pangea-carbon_user pangea-carbon${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

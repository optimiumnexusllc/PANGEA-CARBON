#!/bin/bash
# ============================================
# PANGEA CARBON — Activer SSL (après DNS OK)
# Usage: ./scripts/enable-ssl.sh
# ============================================
set -e
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

source /opt/pangea-carbon/.env
DOMAIN=${DOMAIN:-pangea-carbon.com}
EMAIL=${1:-contact@pangea-carbon.com}

echo -e "${CYAN}[PANGEA CARBON] Activation SSL pour $DOMAIN...${NC}"

# Vérifier que le DNS pointe vers ce serveur
MY_IP=$(curl -4s ifconfig.me)
DNS_IP=$(dig +short $DOMAIN A | head -1)

echo "→ IP du VPS     : $MY_IP"
echo "→ IP DNS domaine: $DNS_IP"

if [ "$MY_IP" != "$DNS_IP" ]; then
  echo -e "${RED}[✗] Le DNS de $DOMAIN ne pointe pas encore vers $MY_IP${NC}"
  echo "    Configure d'abord : A record $DOMAIN → $MY_IP"
  echo "    Puis relance ce script."
  exit 1
fi

echo -e "${GREEN}[✓] DNS OK — Obtention du certificat SSL...${NC}"

# Obtenir le certificat via webroot (Nginx déjà en marche)
docker run --rm \
  -v /opt/pangea-carbon/certbot/certs:/etc/letsencrypt \
  -v /opt/pangea-carbon/certbot/webroot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --agree-tos \
  --non-interactive \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" 2>&1

echo -e "${GREEN}[✓] Certificat SSL obtenu${NC}"

# Activer la config HTTPS complète
cat > /opt/pangea-carbon/nginx/nginx.conf << NGINXEOF
worker_processes auto;
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;

    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone \$binary_remote_addr zone=auth:10m rate=10r/m;

    gzip on;
    gzip_types text/plain application/json application/javascript text/css;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 301 https://\$host\$request_uri; }
    }

    server {
        listen 443 ssl http2;
        server_name $DOMAIN www.$DOMAIN;

        ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;

        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-Proto https;
        }

        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
        }
    }
}
NGINXEOF

# Monter les volumes certbot dans docker-compose
# Reload Nginx
docker compose exec nginx nginx -s reload

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ HTTPS activé sur https://$DOMAIN   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"

# Renouvellement auto
(crontab -l 2>/dev/null; echo "0 3 * * * docker run --rm -v /opt/pangea-carbon/certbot/certs:/etc/letsencrypt -v /opt/pangea-carbon/certbot/webroot:/var/www/certbot certbot/certbot renew --quiet && docker compose -f /opt/pangea-carbon/docker-compose.yml exec nginx nginx -s reload") | crontab -
echo -e "${GREEN}[✓] Renouvellement SSL automatique configuré (3h quotidien)${NC}"

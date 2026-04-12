# 🌍 PANGEA CARBON
### The Carbon Credit Intelligence Platform for Africa
### Carbon Credit MRV SaaS Platform · Verra ACM0002

Plateforme de Mesure, Reporting & Vérification (MRV) des crédits carbone pour projets d'énergie renouvelable en Afrique.

---

## 🚀 Déploiement en 5 minutes

### Prérequis
- VPS Ubuntu 20/22 avec 4+ vCPUs, 16+ GB RAM
- Domaine pointé vers votre IP VPS
- Accès root SSH

### 1. Cloner le repo sur votre VPS
```bash
ssh root@votre-ip
git clone https://github.com/VOTRE_USERNAME/pangea-carbon.git /opt/pangea-carbon
cd /opt/pangea-carbon
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Le script installe tout automatiquement et vous pose 4 questions.

### 2. GitHub Actions (CI/CD automatique)

Ajoutez ces secrets dans `Settings > Secrets > Actions` de votre repo GitHub :

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | IP de votre VPS |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Contenu de votre clé privée SSH |
| `DOMAIN` | Votre domaine |

Chaque push sur `main` déploie automatiquement.

---

## 🏗️ Architecture

```
Client Browser
      ↓
Nginx (SSL/TLS Let's Encrypt)
      ↓         ↓
Next.js 14   Express API
(Port 3000)  (Port 4000)
                  ↓
         PostgreSQL + Redis
                  ↓
         MRV Engine (ACM0002)
```

---

## 🧮 Moteur MRV (Verra ACM0002)

Calcul selon `ACM0002 v19.0` — méthodologie Verra officielle :

```
ER_y = EG_RE,y × EF_grid,CM,y
```

- `EG_RE,y` = Production nette d'électricité (MWh/an)
- `EF_grid,CM,y` = Facteur d'émission combined margin (tCO2/MWh)

**Facteurs pays supportés :**
Côte d'Ivoire (0.547), Kenya (0.251), Nigeria (0.430), Ghana (0.342), Sénégal (0.643), Tanzanie, Cameroun, Éthiopie, Afrique du Sud, Maroc, Égypte, Mozambique, Rwanda, Ouganda, Zambie, Togo, Bénin, Mali.

---

## 🔌 API Reference

### Auth
```http
POST /api/auth/login    { email, password }
POST /api/auth/register { email, password, name, organization }
GET  /api/auth/me
```

### Projets
```http
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
```

### MRV
```http
GET  /api/projects/:id/mrv?year=2024        # Calcul annuel
POST /api/projects/:id/mrv/simulate         # Simulation rapide
GET  /api/projects/:id/mrv/projection?years=10
```

### Lectures d'énergie
```http
GET  /api/projects/:id/readings
POST /api/projects/:id/readings             # Manuelle
POST /api/projects/:id/readings/bulk        # Import CSV
```

### Dashboard
```http
GET /api/dashboard/stats
GET /api/dashboard/leaderboard
```

---

## 🛠️ Commandes utiles

```bash
# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend

# Restart un service
docker compose restart backend

# Sauvegarde manuelle DB
./scripts/backup.sh

# Accès base de données
docker compose exec postgres psql -U pangea-carbon_user pangea-carbon

# Mise à jour sans downtime
git pull && docker compose build && docker compose up -d

# Monitoring resources
docker stats
```

---

## 💰 Modèle de revenus SaaS

| Source | Mécanisme | Ordre de grandeur |
|--------|-----------|-------------------|
| Abonnement | Par MW monitoré/mois | 50-200 €/MW/mois |
| Revenue share | % crédits carbone émis | 2-5% du revenu carbone |
| API access | Acheteurs qui vérifient | Pricing enterprise |

**Exemple CFAO Aeolus (1 GW cible 2030) :**
- 1 GW × 85% CF × 8760h = 7.45M MWh/an
- × 0.547 EF (Côte d'Ivoire) = **4.07M tCO₂e/an**
- × $12/tCO₂e = **$48.8M revenus carbone bruts**
- Votre fee à 3% = **$1.46M/an récurrents**

---

## 🔐 Sécurité

- JWT avec refresh tokens (15min access, 7j refresh)
- Bcrypt password hashing (factor 12)
- Rate limiting sur toutes les routes API
- Fail2ban sur le VPS
- UFW firewall (ports 22, 80, 443 seulement)
- Variables sensibles en `.env` (chmod 600)
- Audit trail complet sur toutes les mutations

---

## 📄 Standards supportés

- **Verra VCS** + méthodologie ACM0002
- **Gold Standard** (compatible)
- **Article 6 Paris Agreement**
- **ICVCM Core Carbon Principles**

---

*PANGEA CARBON Africa v1.0 · Built with ❤️ for African renewable energy*

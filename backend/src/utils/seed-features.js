/**
 * Seed des FeatureFlags — idempotent, safe à relancer
 * Usage: node src/utils/seed-features.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FEATURES = [
  { key: 'pdf_reports',         name: 'Rapports PDF',           description: 'Génération PDF Verra ACM0002',     enabled: true,  rolloutPct: 100 },
  { key: 'africa_map',          name: 'Carte Afrique',           description: 'Carte interactive Leaflet',        enabled: true,  rolloutPct: 100 },
  { key: 'mrv_calculator',      name: 'Calculateur MRV',         description: 'Simulateur temps réel',            enabled: true,  rolloutPct: 100 },
  { key: 'bulk_import',         name: 'Import CSV/Excel',        description: 'Import données en masse',          enabled: true,  rolloutPct: 100 },
  { key: 'ai_assistant',        name: 'Assistant IA',            description: 'Claude AI intégré',                enabled: true,  rolloutPct: 100 },
  { key: 'api_access',          name: 'Accès API',               description: 'API REST publique',                enabled: true,  rolloutPct: 100 },
  { key: 'carbon_marketplace',  name: 'Marketplace carbone',     description: 'Place de marché crédits',         enabled: true,  rolloutPct: 100 },
  { key: 'multi_standard',      name: 'Multi-standard',          description: 'Gold Standard + Article 6',       enabled: true,  rolloutPct: 100 },
  { key: 'white_label',         name: 'White Label',             description: 'Personnalisation marque',          enabled: false, rolloutPct: 0   },
  { key: 'sso_saml',            name: 'SSO/SAML',                description: 'Single Sign-On enterprise',       enabled: false, rolloutPct: 0   },
];

async function main() {
  console.log('🌟 Seeding Feature Flags...\n');
  for (const f of FEATURES) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description, enabled: f.enabled, rolloutPct: f.rolloutPct },
      create: f,
    });
    console.log(`${f.enabled ? '✓' : '○'} ${f.key.padEnd(25)} ${f.enabled ? 'ACTIVÉ' : 'désactivé'} (${f.rolloutPct}%)`);
  }
  console.log('\n✅ Feature flags seedés avec succès!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

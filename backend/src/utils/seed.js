/**
 * PANGEA CARBON — Seed de données démo
 * Crée un portfolio réaliste de projets africains avec MRV complet
 * Usage: docker compose exec backend node src/utils/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { MRVEngine } = require('../services/mrv.service');

const prisma = new PrismaClient();

const DEMO_PROJECTS = [
  {
    name: 'Parc Solaire Abidjan Nord',
    type: 'SOLAR', country: "Côte d'Ivoire", countryCode: 'CI',
    installedMW: 52.5, baselineEF: 0.547, status: 'CREDITED',
    latitude: 5.4167, longitude: -4.0167, standard: 'Verra VCS',
    startDate: new Date('2022-01-01'),
  },
  {
    name: 'Éolien Lac Turkana II',
    type: 'WIND', country: 'Kenya', countryCode: 'KE',
    installedMW: 120.0, baselineEF: 0.251, status: 'VERIFIED',
    latitude: 2.9833, longitude: 36.8833, standard: 'Gold Standard',
    startDate: new Date('2021-06-01'),
  },
  {
    name: 'Centrale Solaire Lagos',
    type: 'SOLAR', country: 'Nigeria', countryCode: 'NG',
    installedMW: 30.0, baselineEF: 0.430, status: 'MONITORING',
    latitude: 6.5244, longitude: 3.3792, standard: 'Verra VCS',
    startDate: new Date('2023-03-01'),
  },
  {
    name: 'Hybride Solaire-Éolien Dakar',
    type: 'HYBRID', country: 'Sénégal', countryCode: 'SN',
    installedMW: 18.5, baselineEF: 0.643, status: 'ACTIVE',
    latitude: 14.7167, longitude: -17.4677, standard: 'Verra VCS',
    startDate: new Date('2023-09-01'),
  },
  {
    name: 'Solaire Ouagadougou Est',
    type: 'SOLAR', country: 'Burkina Faso', countryCode: 'BF',
    installedMW: 25.0, baselineEF: 0.590, status: 'ACTIVE',
    latitude: 12.3647, longitude: -1.5333, standard: 'Gold Standard',
    startDate: new Date('2023-06-01'),
  },
  {
    name: 'Hydraulique Volta Nord',
    type: 'HYDRO', country: 'Ghana', countryCode: 'GH',
    installedMW: 45.0, baselineEF: 0.342, status: 'CREDITED',
    latitude: 10.9333, longitude: -1.1333, standard: 'Verra VCS',
    startDate: new Date('2021-01-01'),
  },
];

// Génère 12 mois de lectures réalistes selon le type
function generateReadings(project, year) {
  const CF_BY_MONTH = {
    SOLAR:  [0.75, 0.78, 0.82, 0.88, 0.90, 0.92, 0.89, 0.87, 0.84, 0.80, 0.76, 0.74],
    WIND:   [0.55, 0.58, 0.62, 0.65, 0.70, 0.72, 0.68, 0.64, 0.66, 0.60, 0.56, 0.53],
    HYDRO:  [0.60, 0.65, 0.72, 0.80, 0.88, 0.92, 0.95, 0.90, 0.85, 0.75, 0.65, 0.60],
    HYBRID: [0.70, 0.72, 0.75, 0.78, 0.80, 0.82, 0.80, 0.78, 0.76, 0.73, 0.70, 0.68],
    BIOMASS:[0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80, 0.80],
  };
  const factors = CF_BY_MONTH[project.type] || CF_BY_MONTH.SOLAR;
  const readings = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const cf = factors[m] + (Math.random() * 0.04 - 0.02);
    const mwh = project.installedMW * daysInMonth * 24 * cf;
    readings.push({
      periodStart: new Date(year, m, 1),
      periodEnd: new Date(year, m + 1, 0),
      energyMWh: parseFloat(mwh.toFixed(2)),
      peakPowerMW: parseFloat((project.installedMW * 0.95).toFixed(2)),
      availabilityPct: parseFloat((92 + Math.random() * 6).toFixed(1)),
      source: 'DEMO',
    });
  }
  return readings;
}

async function main() {
  console.log('🌍 PANGEA CARBON — Seed démo...\n');

  // 1. Admin user
  const hashedPw = await bcrypt.hash('PangeaCarb0n@2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'contact@pangea-carbon.com' },
    update: {},
    create: {
      email: 'contact@pangea-carbon.com',
      password: hashedPw,
      name: 'Dayiri Esdras',
      role: 'ADMIN',
      organization: 'PANGEA CARBON Africa',
    },
  });
  console.log(`✓ Admin: ${admin.email}`);

  // Demo analyst
  const analyst = await prisma.user.upsert({
    where: { email: 'demo@pangea-carbon.com' },
    update: {},
    create: {
      email: 'demo@pangea-carbon.com',
      password: await bcrypt.hash('Demo@2026!', 12),
      name: 'Demo Analyst',
      role: 'ANALYST',
      organization: 'PANGEA CARBON Africa',
    },
  });
  console.log(`✓ Demo: ${analyst.email}`);

  // 2. Projets + readings + MRV
  const year = 2024;
  for (const p of DEMO_PROJECTS) {
    const project = await prisma.project.upsert({
      where: { id: `demo-${p.countryCode}-${p.type}`.toLowerCase() },
      update: { status: p.status },
      create: {
        id: `demo-${p.countryCode}-${p.type}`.toLowerCase(),
        ...p,
        userId: admin.id,
        methodology: 'ACM0002',
      },
    });

    // Supprimer anciennes readings démo
    await prisma.energyReading.deleteMany({
      where: { projectId: project.id, source: 'DEMO' }
    });

    // Créer 12 mois + calcul MRV
    const readings = generateReadings(p, year);
    await prisma.energyReading.createMany({
      data: readings.map(r => ({ ...r, projectId: project.id })),
    });

    const mrvResult = MRVEngine.calculateAnnual(readings, project);
    await prisma.mRVRecord.upsert({
      where: { projectId_year: { projectId: project.id, year } },
      update: {
        totalEnergyMWh: mrvResult.projectMetrics.totalMWh,
        baselineEF: mrvResult.input.gridEmissionFactor,
        emissionReductions: mrvResult.emissions.grossReductions,
        leakageDeduction: mrvResult.emissions.leakageDeduction,
        netCarbonCredits: mrvResult.emissions.netCarbonCredits,
        marketPriceUSD: 12,
        revenueUSD: mrvResult.financials.netRevenueUSD,
      },
      create: {
        projectId: project.id,
        year,
        totalEnergyMWh: mrvResult.projectMetrics.totalMWh,
        baselineEF: mrvResult.input.gridEmissionFactor,
        emissionReductions: mrvResult.emissions.grossReductions,
        leakageDeduction: mrvResult.emissions.leakageDeduction,
        netCarbonCredits: mrvResult.emissions.netCarbonCredits,
        marketPriceUSD: 12,
        revenueUSD: mrvResult.financials.netRevenueUSD,
      },
    });

    console.log(`✓ ${p.name} — ${mrvResult.emissions.netCarbonCredits.toFixed(0)} tCO₂e — $${mrvResult.financials.netRevenueUSD.toFixed(0)}`);
  }

  // 3. Totaux
  const totals = await prisma.mRVRecord.aggregate({ _sum: { netCarbonCredits: true, revenueUSD: true } });
  console.log(`\n🎯 TOTAL PORTFOLIO:`);
  console.log(`   Crédits: ${totals._sum.netCarbonCredits?.toFixed(0)} tCO₂e`);
  console.log(`   Revenus: $${totals._sum.revenueUSD?.toFixed(0)}`);
  console.log('\n✅ Seed terminé — https://pangea-carbon.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());

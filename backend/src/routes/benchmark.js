/**
 * PANGEA CARBON — Benchmark africain
 * Compare vos projets vs les pairs africains
 * Données: base PANGEA CARBON + références sectorielles IRENA/IEA
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Benchmarks sectoriels africains (IRENA 2024 + IEA Africa 2024 + PANGEA CARBON data)
const AFRICAN_BENCHMARKS = {
  SOLAR: {
    specificYield: { p25: 1150, median: 1380, p75: 1620, unit: 'kWh/kWc' },
    availability: { p25: 94.2, median: 97.1, p75: 98.8, unit: '%' },
    performanceRatio: { p25: 72, median: 79, p75: 85, unit: '%' },
    lcoe: { p25: 28, median: 38, p75: 52, unit: '$/MWh' },
    carbonIntensity: { p25: 0.38, median: 0.52, p75: 0.67, unit: 'tCO₂/MWh baseline' },
    creditsPerMW: { p25: 450, median: 680, p75: 920, unit: 'tCO₂e/MW/an' },
  },
  WIND: {
    specificYield: { p25: 1800, median: 2200, p75: 2900, unit: 'kWh/kW' },
    availability: { p25: 93.0, median: 96.5, p75: 98.2, unit: '%' },
    performanceRatio: { p25: 80, median: 87, p75: 93, unit: '%' },
    lcoe: { p25: 32, median: 44, p75: 62, unit: '$/MWh' },
    creditsPerMW: { p25: 620, median: 890, p75: 1180, unit: 'tCO₂e/MW/an' },
  },
  HYDRO: {
    specificYield: { p25: 3200, median: 4100, p75: 5800, unit: 'kWh/kW' },
    availability: { p25: 89.0, median: 94.0, p75: 97.5, unit: '%' },
    creditsPerMW: { p25: 980, median: 1450, p75: 2100, unit: 'tCO₂e/MW/an' },
  },
  HYBRID: {
    specificYield: { p25: 1400, median: 1750, p75: 2200, unit: 'kWh/kW' },
    availability: { p25: 93.5, median: 96.8, p75: 98.5, unit: '%' },
    creditsPerMW: { p25: 550, median: 780, p75: 1050, unit: 'tCO₂e/MW/an' },
  },
};

// Benchmarks par pays (EF grille et revenus moyens)
const COUNTRY_BENCHMARKS = {
  CI: { avgEF: 0.547, avgCreditsPerMW: 620, avgRevenuePerMW: 7440, marketMaturity: 'developing' },
  KE: { avgEF: 0.251, avgCreditsPerMW: 290, avgRevenuePerMW: 3480, marketMaturity: 'mature' },
  NG: { avgEF: 0.430, avgCreditsPerMW: 490, avgRevenuePerMW: 5880, marketMaturity: 'developing' },
  GH: { avgEF: 0.342, avgCreditsPerMW: 390, avgRevenuePerMW: 4680, marketMaturity: 'developing' },
  SN: { avgEF: 0.643, avgCreditsPerMW: 735, avgRevenuePerMW: 8820, marketMaturity: 'emerging' },
  MA: { avgEF: 0.631, avgCreditsPerMW: 720, avgRevenuePerMW: 8640, marketMaturity: 'mature' },
  ZA: { avgEF: 0.797, avgCreditsPerMW: 910, avgRevenuePerMW: 10920, marketMaturity: 'mature' },
};

function getPercentile(value, p25, median, p75) {
  if (value <= p25) return Math.max(0, (value / p25) * 25);
  if (value <= median) return 25 + ((value - p25) / (median - p25)) * 25;
  if (value <= p75) return 50 + ((value - median) / (p75 - median)) * 25;
  return Math.min(99, 75 + ((value - p75) / (p75 * 0.3)) * 24);
}

function getRating(percentile) {
  if (percentile >= 75) return { label: 'Top quartile', color: '#00FF94', stars: 5 };
  if (percentile >= 50) return { label: 'Au-dessus médiane', color: '#FCD34D', stars: 4 };
  if (percentile >= 25) return { label: 'Sous la médiane', color: '#F87171', stars: 3 };
  return { label: 'Bas quartile', color: '#F87171', stars: 2 };
}

// GET /api/benchmark/:projectId — Benchmark d'un projet
router.get('/:projectId', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: { mrvRecords: { orderBy: { year: 'desc' }, take: 2 }, readings: { orderBy: { periodStart: 'desc' }, take: 12 } }
    });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const benchmarks = AFRICAN_BENCHMARKS[project.type] || AFRICAN_BENCHMARKS.SOLAR;
    const countryBench = COUNTRY_BENCHMARKS[project.countryCode] || COUNTRY_BENCHMARKS.CI;
    const mrv = project.mrvRecords[0];
    const readings = project.readings;

    // Métriques du projet
    const avgMWh = readings.length ? readings.reduce((s, r) => s + r.energyMWh, 0) / readings.length : 0;
    const specificYield = avgMWh * 12 / project.installedMW;
    const avgAvailability = readings.length ? readings.reduce((s, r) => s + (r.availabilityPct || 97), 0) / readings.length : 97;
    const creditsPerMW = mrv ? mrv.netCarbonCredits / project.installedMW : 0;
    const revenuePerMW = mrv ? mrv.revenueUSD / project.installedMW : 0;

    // Calcul percentiles
    const metrics = [
      {
        id: 'specific_yield', label: 'Rendement spécifique', unit: 'kWh/kWc',
        value: parseFloat(specificYield.toFixed(0)),
        benchmark: benchmarks.specificYield,
        percentile: parseFloat(getPercentile(specificYield, benchmarks.specificYield.p25, benchmarks.specificYield.median, benchmarks.specificYield.p75).toFixed(1)),
      },
      {
        id: 'availability', label: 'Disponibilité', unit: '%',
        value: parseFloat(avgAvailability.toFixed(1)),
        benchmark: benchmarks.availability,
        percentile: parseFloat(getPercentile(avgAvailability, benchmarks.availability.p25, benchmarks.availability.median, benchmarks.availability.p75).toFixed(1)),
      },
      {
        id: 'credits_per_mw', label: 'Crédits/MW/an', unit: 'tCO₂e',
        value: parseFloat(creditsPerMW.toFixed(0)),
        benchmark: benchmarks.creditsPerMW,
        percentile: parseFloat(getPercentile(creditsPerMW, benchmarks.creditsPerMW.p25, benchmarks.creditsPerMW.median, benchmarks.creditsPerMW.p75).toFixed(1)),
      },
      {
        id: 'revenue_per_mw', label: 'Revenus/MW/an', unit: '$',
        value: parseFloat(revenuePerMW.toFixed(0)),
        benchmark: { p25: countryBench.avgRevenuePerMW * 0.7, median: countryBench.avgRevenuePerMW, p75: countryBench.avgRevenuePerMW * 1.35 },
        percentile: parseFloat(getPercentile(revenuePerMW, countryBench.avgRevenuePerMW * 0.7, countryBench.avgRevenuePerMW, countryBench.avgRevenuePerMW * 1.35).toFixed(1)),
      },
    ].map(m => ({ ...m, rating: getRating(m.percentile) }));

    const overallPercentile = metrics.reduce((s, m) => s + m.percentile, 0) / metrics.length;

    // Tops pairs dans la DB PANGEA CARBON
    const peers = await prisma.project.findMany({
      where: { type: project.type, countryCode: project.countryCode, id: { not: project.id } },
      include: { mrvRecords: { orderBy: { year: 'desc' }, take: 1 } },
      take: 5,
    });

    res.json({
      project: { id: project.id, name: project.name, type: project.type, installedMW: project.installedMW, countryCode: project.countryCode },
      metrics, overallPercentile: parseFloat(overallPercentile.toFixed(1)),
      overallRating: getRating(overallPercentile),
      countryContext: countryBench,
      peers: peers.map(p => ({
        id: p.id, name: p.name, installedMW: p.installedMW,
        credits: p.mrvRecords[0]?.netCarbonCredits || 0,
        revenue: p.mrvRecords[0]?.revenueUSD || 0,
      })),
      africanContext: {
        marketMaturity: countryBench.marketMaturity,
        avgEF: countryBench.avgEF,
        note: `Parmi les parcs ${project.type} d'Afrique analysés par PANGEA CARBON + IRENA 2024`,
      }
    });
  } catch (e) { next(e); }
});

// GET /api/benchmark/portfolio/ranking — Classement du portfolio
router.get('/portfolio/ranking', auth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: { mrvRecords: { orderBy: { year: 'desc' }, take: 1 }, readings: { orderBy: { periodStart: 'desc' }, take: 12 } }
    });

    const ranking = projects.map(p => {
      const bench = AFRICAN_BENCHMARKS[p.type] || AFRICAN_BENCHMARKS.SOLAR;
      const avgMWh = p.readings.length ? p.readings.reduce((s, r) => s + r.energyMWh, 0) / p.readings.length : 0;
      const specificYield = avgMWh * 12 / p.installedMW;
      const mrv = p.mrvRecords[0];
      const creditsPerMW = mrv ? mrv.netCarbonCredits / p.installedMW : 0;
      const percentile = (getPercentile(specificYield, bench.specificYield.p25, bench.specificYield.median, bench.specificYield.p75) +
                          getPercentile(creditsPerMW, bench.creditsPerMW.p25, bench.creditsPerMW.median, bench.creditsPerMW.p75)) / 2;
      return {
        id: p.id, name: p.name, type: p.type, countryCode: p.countryCode,
        installedMW: p.installedMW, credits: mrv?.netCarbonCredits || 0,
        revenue: mrv?.revenueUSD || 0, specificYield: parseFloat(specificYield.toFixed(0)),
        creditsPerMW: parseFloat(creditsPerMW.toFixed(0)),
        percentile: parseFloat(percentile.toFixed(1)),
        rating: getRating(percentile),
      };
    }).sort((a, b) => b.percentile - a.percentile);

    res.json({ ranking, africanBenchmarks: AFRICAN_BENCHMARKS, countryBenchmarks: COUNTRY_BENCHMARKS });
  } catch (e) { next(e); }
});

module.exports = router;

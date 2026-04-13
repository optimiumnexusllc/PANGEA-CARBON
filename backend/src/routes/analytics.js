/**
 * PANGEA CARBON — Analyse Détaillée
 * Décomposition causale des performances MRV
 * Palantir-grade: pourquoi, pas juste quoi
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { MRVEngine } = require('../services/mrv.service');
const prisma = new PrismaClient();

// Facteurs de perte solar (IEC 61724)
function computeLossWaterfall(project, readings, mrvRecord) {
  if (!mrvRecord || !readings.length) return null;
  const theoreticalMax = project.installedMW * 8760 * 0.22; // 22% capacity factor théorique max
  const irradianceLoss = theoreticalMax * 0.12; // ~12% pertes irradiance
  const temperatureLoss = theoreticalMax * 0.04;
  const soilingLoss = theoreticalMax * 0.03;
  const availabilityLoss = theoreticalMax * (1 - (readings.reduce((s, r) => s + (r.availabilityPct || 98), 0) / readings.length / 100));
  const cableAndInverterLoss = theoreticalMax * 0.015;
  const actual = mrvRecord.totalEnergyMWh;
  const pr = actual / (theoreticalMax - irradianceLoss) * 100;

  return {
    theoreticalMax: parseFloat(theoreticalMax.toFixed(1)),
    irradianceLoss: parseFloat(irradianceLoss.toFixed(1)),
    temperatureLoss: parseFloat(temperatureLoss.toFixed(1)),
    soilingLoss: parseFloat(soilingLoss.toFixed(1)),
    availabilityLoss: parseFloat(availabilityLoss.toFixed(1)),
    cableAndInverterLoss: parseFloat(cableAndInverterLoss.toFixed(1)),
    actual: parseFloat(actual.toFixed(1)),
    performanceRatio: parseFloat(pr.toFixed(1)),
    totalLossesPct: parseFloat(((theoreticalMax - actual) / theoreticalMax * 100).toFixed(1)),
  };
}

// Analyse de variance mois/mois
function computeVarianceAnalysis(readings) {
  if (readings.length < 2) return [];
  return readings.slice(0, 12).map((r, i) => {
    const prev = readings[i + 1];
    const variance = prev ? ((r.energyMWh - prev.energyMWh) / prev.energyMWh * 100) : 0;
    const month = new Date(r.periodStart).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    return {
      month, energyMWh: r.energyMWh,
      variance: parseFloat(variance.toFixed(1)),
      availabilityPct: r.availabilityPct,
      driver: variance > 5 ? 'hausse_irradiance' : variance < -5 ? 'baisse_disponibilite' : 'stable',
    };
  });
}

// GET /api/analytics/:projectId — Analyse complète d'un projet
router.get('/:projectId', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        readings: { orderBy: { periodStart: 'desc' }, take: 24 },
        mrvRecords: { orderBy: { year: 'desc' }, take: 3 },
        sdgScores: { orderBy: { year: 'desc' }, take: 1 },
      }
    });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const latestMRV = project.mrvRecords[0];
    const readings = project.readings;

    // 1. Waterfall des pertes
    const lossWaterfall = computeLossWaterfall(project, readings, latestMRV);

    // 2. Variance mensuelle
    const variance = computeVarianceAnalysis(readings);

    // 3. KPIs détaillés
    const avgMWh = readings.length ? readings.reduce((s, r) => s + r.energyMWh, 0) / readings.length : 0;
    const maxMWh = readings.length ? Math.max(...readings.map(r => r.energyMWh)) : 0;
    const minMWh = readings.length ? Math.min(...readings.map(r => r.energyMWh)) : 0;
    const avgAvailability = readings.length ? readings.reduce((s, r) => s + (r.availabilityPct || 98), 0) / readings.length : 98;
    const specificYield = avgMWh * 12 / project.installedMW; // kWh/kWc

    // 4. Analyse causale
    const causalInsights = [];
    if (avgAvailability < 95) causalInsights.push({ type: 'warning', factor: 'Disponibilité', impact: `${(98 - avgAvailability).toFixed(1)}% sous optimal`, creditLoss: parseFloat((latestMRV?.netCarbonCredits * 0.03 || 0).toFixed(0)) });
    if (specificYield < 1200) causalInsights.push({ type: 'info', factor: 'Rendement spécifique', impact: `${specificYield.toFixed(0)} kWh/kWc · sous la médiane africaine (1400)`, creditLoss: 0 });
    if (lossWaterfall?.soilingLoss > lossWaterfall?.theoreticalMax * 0.04) causalInsights.push({ type: 'warning', factor: 'Pertes salissures', impact: 'Nettoyage des panneaux recommandé', creditLoss: parseFloat((latestMRV?.netCarbonCredits * 0.02 || 0).toFixed(0)) });

    // 5. Évolution MRV year-over-year
    const yoyGrowth = project.mrvRecords.length > 1
      ? (project.mrvRecords[0].netCarbonCredits - project.mrvRecords[1].netCarbonCredits) / project.mrvRecords[1].netCarbonCredits * 100
      : null;

    // 6. Décomposition des crédits
    const creditDecomposition = latestMRV ? {
      grossEmissionsReduced: parseFloat(latestMRV.grossEmissionsReduced?.toFixed(1) || '0'),
      leakageDeduction: parseFloat((latestMRV.grossEmissionsReduced * 0.03 || 0).toFixed(1)),
      uncertaintyDeduction: parseFloat((latestMRV.grossEmissionsReduced * 0.05 || 0).toFixed(1)),
      netCarbonCredits: parseFloat(latestMRV.netCarbonCredits?.toFixed(1) || '0'),
      revenueUSD: parseFloat(latestMRV.revenueUSD?.toFixed(0) || '0'),
    } : null;

    res.json({
      project: { id: project.id, name: project.name, type: project.type, installedMW: project.installedMW, countryCode: project.countryCode, baselineEF: project.baselineEF },
      latestMRV, lossWaterfall, variance,
      kpis: { avgMWh: parseFloat(avgMWh.toFixed(1)), maxMWh, minMWh, avgAvailability: parseFloat(avgAvailability.toFixed(1)), specificYield: parseFloat(specificYield.toFixed(0)), volatility: parseFloat(((maxMWh - minMWh) / avgMWh * 100).toFixed(1)) },
      causalInsights, creditDecomposition, yoyGrowth: yoyGrowth ? parseFloat(yoyGrowth.toFixed(1)) : null,
      dataQuality: { readingsCount: readings.length, completeness: Math.min(100, readings.length / 12 * 100).toFixed(0), hasAvailability: readings.some(r => r.availabilityPct) },
    });
  } catch (e) { next(e); }
});

// GET /api/analytics/portfolio/overview — Vue portfolio complète
router.get('/portfolio/overview', auth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: {
        readings: { orderBy: { periodStart: 'desc' }, take: 12 },
        mrvRecords: { orderBy: { year: 'desc' }, take: 2 },
      }
    });

    const analysis = projects.map(p => {
      const latestMRV = p.mrvRecords[0];
      const avgAvail = p.readings.length ? p.readings.reduce((s, r) => s + (r.availabilityPct || 98), 0) / p.readings.length : 98;
      const specificYield = p.readings.length ? p.readings.reduce((s, r) => s + r.energyMWh, 0) / p.installedMW : 0;
      return {
        id: p.id, name: p.name, type: p.type, countryCode: p.countryCode, installedMW: p.installedMW,
        credits: latestMRV?.netCarbonCredits || 0,
        revenue: latestMRV?.revenueUSD || 0,
        avgAvailability: parseFloat(avgAvail.toFixed(1)),
        specificYield: parseFloat(specificYield.toFixed(0)),
        performanceScore: parseFloat(Math.min(100, avgAvail * 0.4 + Math.min(specificYield / 15, 60)).toFixed(1)),
      };
    });

    const totalCredits = analysis.reduce((s, p) => s + p.credits, 0);
    const totalRevenue = analysis.reduce((s, p) => s + p.revenue, 0);
    const avgPerformance = analysis.reduce((s, p) => s + p.performanceScore, 0) / (analysis.length || 1);

    res.json({ projects: analysis, summary: { totalCredits, totalRevenue, avgPerformance: parseFloat(avgPerformance.toFixed(1)), projectCount: projects.length } });
  } catch (e) { next(e); }
});

module.exports = router;

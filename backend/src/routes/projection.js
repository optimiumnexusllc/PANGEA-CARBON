/**
 * PANGEA CARBON — Projection 10 ans
 * Simulation Monte Carlo des revenus carbone
 * Scénarios: conservative / base / optimistic
 */
const router = require('express').Router();
const { validate, rules } = require('../middleware/validate');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const prisma = new PrismaClient();

// Paramètres de simulation par scénario
const SCENARIOS = {
  conservative: { label: 'Conservateur', color: '#F87171', growthRate: -0.005, priceGrowth: 0.03, degradation: 0.008, uncertainty: 0.08 },
  base:         { label: 'Base',         color: '#FCD34D', growthRate: 0.02,  priceGrowth: 0.05, degradation: 0.005, uncertainty: 0.05 },
  optimistic:   { label: 'Optimiste',    color: '#00FF94', growthRate: 0.04,  priceGrowth: 0.08, degradation: 0.003, uncertainty: 0.03 },
};

// Facteur d'émission grille: tendance baissière (décarbonation réseau)
const EF_DECLINE_BY_COUNTRY = { CI: 0.008, KE: 0.021, NG: 0.003, GH: 0.012, SN: 0.005, MA: 0.032, DEFAULT: 0.008 };

// Projection annuelle avec dégradation et tendances marché
function projectYear(baseCredits, basePrice, year, scenario, efDeclineRate) {
  const scen = SCENARIOS[scenario];
  const degradationFactor = Math.pow(1 - scen.degradation, year);
  const efAdjustment = Math.max(0.6, 1 - efDeclineRate * year); // EF grid baisse avec décarbonation
  const productionGrowth = Math.pow(1 + scen.growthRate, year);
  const priceInflation = Math.pow(1 + scen.priceGrowth, year);

  const credits = baseCredits * degradationFactor * productionGrowth * efAdjustment;
  const price = basePrice * priceInflation;
  const revenue = credits * price;
  const uncertainty = revenue * scen.uncertainty;

  return {
    year: new Date().getFullYear() + year,
    credits: parseFloat(credits.toFixed(0)),
    price: parseFloat(price.toFixed(2)),
    revenue: parseFloat(revenue.toFixed(0)),
    revenueMin: parseFloat((revenue - uncertainty).toFixed(0)),
    revenueMax: parseFloat((revenue + uncertainty).toFixed(0)),
    efAdjustment: parseFloat(efAdjustment.toFixed(3)),
  };
}

// Monte Carlo: 500 simulations
function monteCarloSimulation(baseCredits, basePrice, years, scenario) {
  const scen = SCENARIOS[scenario];
  const simulations = 200;
  const results = [];

  for (let s = 0; s < simulations; s++) {
    let totalRevenue = 0;
    for (let y = 1; y <= years; y++) {
      const randomGrowth = scen.growthRate + (Math.random() - 0.5) * scen.uncertainty;
      const randomPrice = basePrice * Math.pow(1 + scen.priceGrowth + (Math.random() - 0.5) * 0.02, y);
      const credits = baseCredits * Math.pow(1 + randomGrowth, y) * Math.pow(1 - scen.degradation, y);
      totalRevenue += credits * randomPrice;
    }
    results.push(totalRevenue);
  }

  results.sort((a, b) => a - b);
  return {
    p10: parseFloat(results[Math.floor(simulations * 0.1)].toFixed(0)),
    p50: parseFloat(results[Math.floor(simulations * 0.5)].toFixed(0)),
    p90: parseFloat(results[Math.floor(simulations * 0.9)].toFixed(0)),
    mean: parseFloat((results.reduce((s, v) => s + v, 0) / simulations).toFixed(0)),
  };
}

// POST /api/projection/:projectId — Projection avec paramètres custom
router.post('/:projectId', auth, requirePermission('reports.generate'), rules.projection, validate, async (req, res, next) => {
  try {
    const { years = 10, carbonPrice, additionalMW, scenarioFilter } = req.body;
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: { mrvRecords: { orderBy: { year: 'desc' }, take: 1 }, readings: { orderBy: { periodStart: 'desc' }, take: 12 } }
    });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const mrv = project.mrvRecords[0];
    const baseCredits = mrv?.netCarbonCredits || project.installedMW * 730 * 12 * project.baselineEF * 0.92;
    const basePrice = carbonPrice || 12;
    const efDeclineRate = EF_DECLINE_BY_COUNTRY[project.countryCode] || EF_DECLINE_BY_COUNTRY.DEFAULT;
    const adjustedMW = project.installedMW + (additionalMW || 0);
    const adjustedCredits = baseCredits * (adjustedMW / project.installedMW);

    // Projections par scénario
    const scenarios = {};
    const scenariosToRun = scenarioFilter ? [scenarioFilter] : Object.keys(SCENARIOS);

    for (const scen of scenariosToRun) {
      const yearly = Array.from({ length: years }, (_, i) => projectYear(adjustedCredits, basePrice, i + 1, scen, efDeclineRate));
      const monteCarlo = monteCarloSimulation(adjustedCredits, basePrice, years, scen);
      const totalRevenue = yearly.reduce((s, y) => s + y.revenue, 0);
      const npv = yearly.reduce((s, y, i) => s + y.revenue / Math.pow(1.08, i + 1), 0); // 8% discount rate

      scenarios[scen] = {
        label: SCENARIOS[scen].label, color: SCENARIOS[scen].color,
        yearly, monteCarlo, totalRevenue: parseFloat(totalRevenue.toFixed(0)),
        npv: parseFloat(npv.toFixed(0)),
        irr: parseFloat((totalRevenue / (project.installedMW * 1000000) * 100).toFixed(1)),
      };
    }

    // Breakeven analysis
    const capex = project.installedMW * 850000; // ~$850K/MW
    const baseYearly = scenarios.base?.yearly || [];
    let cumulativeRevenue = 0;
    let breakevenYear = null;
    for (const y of baseYearly) {
      cumulativeRevenue += y.revenue;
      if (!breakevenYear && cumulativeRevenue >= capex * 0.15) { // 15% from carbon
        breakevenYear = y.year;
      }
    }

    res.json({
      project: { id: project.id, name: project.name, type: project.type, installedMW: project.installedMW, countryCode: project.countryCode, baselineEF: project.baselineEF },
      parameters: { years, basePrice, baseCredits: parseFloat(adjustedCredits.toFixed(0)), additionalMW: additionalMW || 0, efDeclineRate },
      scenarios, breakevenYear,
      insights: [
        { label: 'Impact décarbonation réseau', value: `EF baisse de ${(efDeclineRate * 100 * years).toFixed(1)}% sur ${years} ans → crédits ajustés en conséquence` },
        { label: 'Stratégie recommandée', value: 'Certifier Article 6 maintenant: $45/t figé avant décarbonation du réseau' },
        { label: 'Risque principal', value: 'Déclin EF grille accéléré (transition énergétique Afrique)' },
      ]
    });
  } catch (e) { next(e); }
});

// GET /api/projection/:projectId — Projection rapide avec paramètres défaut
router.get('/:projectId', auth, async (req, res, next) => {
  req.body = { years: 10 };
  return router.handle({ ...req, method: 'POST' }, res, next);
});

// POST /api/projection/portfolio/total — Projection portfolio complet
router.post('/portfolio/total', auth, requirePermission('reports.generate'), async (req, res, next) => {
  try {
    const { years = 10 } = req.body;
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: { mrvRecords: { orderBy: { year: 'desc' }, take: 1 } }
    });

    let totalBase = 0, totalOptimistic = 0, totalConservative = 0;
    const byYear = Array.from({ length: years }, (_, i) => ({ year: new Date().getFullYear() + i + 1, base: 0, optimistic: 0, conservative: 0 }));

    for (const p of projects) {
      const mrv = p.mrvRecords[0];
      const baseCredits = mrv?.netCarbonCredits || 0;
      const efDecline = EF_DECLINE_BY_COUNTRY[p.countryCode] || 0.008;

      for (let y = 0; y < years; y++) {
        const base = projectYear(baseCredits, 12, y + 1, 'base', efDecline);
        const opt = projectYear(baseCredits, 12, y + 1, 'optimistic', efDecline);
        const cons = projectYear(baseCredits, 12, y + 1, 'conservative', efDecline);
        byYear[y].base += base.revenue;
        byYear[y].optimistic += opt.revenue;
        byYear[y].conservative += cons.revenue;
        totalBase += base.revenue;
        totalOptimistic += opt.revenue;
        totalConservative += cons.revenue;
      }
    }

    res.json({
      byYear: byYear.map(y => ({ ...y, base: Math.round(y.base), optimistic: Math.round(y.optimistic), conservative: Math.round(y.conservative) })),
      totals: { base: Math.round(totalBase), optimistic: Math.round(totalOptimistic), conservative: Math.round(totalConservative) },
      projectCount: projects.length,
    });
  } catch (e) { next(e); }
});

module.exports = router;

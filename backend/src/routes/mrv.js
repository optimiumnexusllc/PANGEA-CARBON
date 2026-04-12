const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { MRVEngine } = require('../services/mrv.service');
const prisma = new PrismaClient();

// GET /api/projects/:id/mrv - Calcul MRV pour un projet
router.get('/:id/mrv', auth, async (req, res, next) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const readings = await prisma.energyReading.findMany({
      where: {
        projectId: req.params.id,
        periodStart: { gte: new Date(`${currentYear}-01-01`) },
        periodEnd: { lte: new Date(`${currentYear}-12-31`) },
      },
      orderBy: { periodStart: 'asc' }
    });

    if (readings.length === 0) {
      return res.status(404).json({ error: `Aucune donnée de production pour ${currentYear}` });
    }

    const mrvResult = MRVEngine.calculateAnnual(readings, project);

    // Sauvegarder/mettre à jour le record MRV
    await prisma.mRVRecord.upsert({
      where: { projectId_year: { projectId: req.params.id, year: currentYear } },
      update: {
        totalEnergyMWh: mrvResult.projectMetrics.totalMWh,
        baselineEF: mrvResult.input.gridEmissionFactor,
        emissionReductions: mrvResult.emissions.grossReductions,
        leakageDeduction: mrvResult.emissions.leakageDeduction,
        netCarbonCredits: mrvResult.emissions.netCarbonCredits,
        marketPriceUSD: mrvResult.financials.marketPriceUSD,
        revenueUSD: mrvResult.financials.netRevenueUSD,
      },
      create: {
        projectId: req.params.id,
        year: currentYear,
        totalEnergyMWh: mrvResult.projectMetrics.totalMWh,
        baselineEF: mrvResult.input.gridEmissionFactor,
        emissionReductions: mrvResult.emissions.grossReductions,
        leakageDeduction: mrvResult.emissions.leakageDeduction,
        netCarbonCredits: mrvResult.emissions.netCarbonCredits,
        marketPriceUSD: mrvResult.financials.marketPriceUSD,
        revenueUSD: mrvResult.financials.netRevenueUSD,
      }
    });

    res.json({ year: currentYear, project: { id: project.id, name: project.name }, ...mrvResult });
  } catch (e) { next(e); }
});

// POST /api/projects/:id/mrv/simulate - Simulation rapide sans données
router.post('/:id/mrv/simulate', auth, async (req, res, next) => {
  try {
    const { energyMWh, marketPriceUSD } = req.body;
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const result = MRVEngine.calculate({
      energyMWh: parseFloat(energyMWh),
      countryCode: project.countryCode,
      marketPriceUSD: marketPriceUSD ? parseFloat(marketPriceUSD) : undefined,
    });

    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/projects/:id/mrv/projection - Projection sur N années
router.get('/:id/mrv/projection', auth, async (req, res, next) => {
  try {
    const { years = 10, annualGrowth = 0, priceEscalation = 3 } = req.query;
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    // Capacité annuelle estimée (85% de facteur de charge typique solaire Afrique)
    const estimatedAnnualMWh = project.installedMW * 8760 * 0.85;

    const projection = MRVEngine.projectRevenue({
      energyMWh: estimatedAnnualMWh,
      countryCode: project.countryCode,
      years: parseInt(years),
      annualGrowthPct: parseFloat(annualGrowth),
      priceEscalationPct: parseFloat(priceEscalation),
    });

    res.json({ project: { id: project.id, name: project.name, installedMW: project.installedMW }, ...projection });
  } catch (e) { next(e); }
});

// POST /api/mrv/calculate - Calcul standalone (sans projet)
router.post('/mrv/standalone', auth, async (req, res, next) => {
  try {
    const { energyMWh, countryCode, marketPriceUSD, customEF } = req.body;
    const result = MRVEngine.calculate({ energyMWh, countryCode, marketPriceUSD, customEF });
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;

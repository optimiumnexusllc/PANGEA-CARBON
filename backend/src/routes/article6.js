/**
 * PANGEA CARBON — Article 6 Paris Agreement / ITMO Module
 * International Transferred Mitigation Outcomes (ITMOs)
 * Methodologie: Article 6.2 + 6.4 Paris Agreement
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Prix ITMO par pays acheteur (estimations marché 2025-2026)
const ITMO_BUYER_COUNTRIES = {
  'CH': { name: 'Suisse', priceUSD: 48, active: true, agreements: ['Ghana', 'Sénégal', 'Rwanda'] },
  'JP': { name: 'Japon', priceUSD: 42, active: true, agreements: ['Kenya', 'Éthiopie', 'Maroc'] },
  'SG': { name: 'Singapour', priceUSD: 45, active: true, agreements: ['Rwanda', 'Kenya'] },
  'SE': { name: 'Suède', priceUSD: 50, active: true, agreements: ['Mozambique'] },
  'NO': { name: 'Norvège', priceUSD: 46, active: true, agreements: ['Tanzanie'] },
  'DE': { name: 'Allemagne', priceUSD: 38, active: false, agreements: [] },
  'NL': { name: 'Pays-Bas', priceUSD: 40, active: false, agreements: [] },
};

// Statut Article 6 par pays hôte africain
const AFRICAN_ARTICLE6_READINESS = {
  'KE': { ready: true, registry: true, legislation: true, score: 95 },
  'RW': { ready: true, registry: true, legislation: true, score: 92 },
  'GH': { ready: true, registry: true, legislation: true, score: 90 },
  'SN': { ready: true, registry: false, legislation: true, score: 72 },
  'TZ': { ready: true, registry: false, legislation: true, score: 68 },
  'MZ': { ready: false, registry: false, legislation: false, score: 35 },
  'CI': { ready: false, registry: false, legislation: false, score: 28 },
  'NG': { ready: false, registry: false, legislation: false, score: 25 },
  'MA': { ready: false, registry: false, legislation: true, score: 55 },
  'ZA': { ready: true, registry: false, legislation: true, score: 70 },
  'ET': { ready: false, registry: false, legislation: false, score: 30 },
};

// GET /api/article6/projects — Projets éligibles Article 6
router.get('/projects', auth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: {
        mrvRecords: { orderBy: { year: 'desc' }, take: 1 },
        itmoRecords: { orderBy: { createdAt: 'desc' }, take: 3 },
      }
    });

    const analyzed = projects.map(p => {
      const readiness = AFRICAN_ARTICLE6_READINESS[p.countryCode] || { ready: false, score: 20 };
      const mrv = p.mrvRecords[0];
      const bestBuyer = Object.entries(ITMO_BUYER_COUNTRIES)
        .filter(([, b]) => b.active)
        .sort((a, b) => b[1].priceUSD - a[1].priceUSD)[0];

      const itmoValue = mrv ? mrv.netCarbonCredits * (bestBuyer?.[1].priceUSD || 45) : 0;
      const vsVerraValue = mrv ? mrv.revenueUSD : 0;
      const premiumMultiplier = bestBuyer ? bestBuyer[1].priceUSD / 12 : 3.5;

      return {
        ...p,
        article6: {
          countryReadiness: readiness,
          eligible: readiness.ready,
          readinessScore: readiness.score,
          bestBuyerCountry: bestBuyer ? { code: bestBuyer[0], ...bestBuyer[1] } : null,
          itmoValueUSD: Math.round(itmoValue),
          verraValueUSD: Math.round(vsVerraValue),
          premiumMultiplier: parseFloat(premiumMultiplier.toFixed(1)),
          premiumUSD: Math.round(itmoValue - vsVerraValue),
          itmoRecords: p.itmoRecords,
        }
      };
    });

    const totalItmoValue = analyzed.reduce((s, p) => s + (p.article6.itmoValueUSD || 0), 0);
    const totalVerraValue = analyzed.reduce((s, p) => s + (p.article6.verraValueUSD || 0), 0);

    res.json({
      projects: analyzed,
      summary: {
        totalProjects: projects.length,
        eligibleProjects: analyzed.filter(p => p.article6.eligible).length,
        totalItmoValueUSD: totalItmoValue,
        totalVerraValueUSD: totalVerraValue,
        totalPremiumUSD: totalItmoValue - totalVerraValue,
        premiumMultiplier: totalVerraValue > 0 ? parseFloat((totalItmoValue / totalVerraValue).toFixed(1)) : 0,
      },
      buyerCountries: ITMO_BUYER_COUNTRIES,
      africanReadiness: AFRICAN_ARTICLE6_READINESS,
    });
  } catch (e) { next(e); }
});

// POST /api/article6/itmo — Enregistrer une transaction ITMO
router.post('/itmo', auth, async (req, res, next) => {
  try {
    const { projectId, year, hostCountry, buyingCountry, itmoQuantity, authorizationRef } = req.body;
    const buyer = ITMO_BUYER_COUNTRIES[buyingCountry];
    if (!buyer) return res.status(400).json({ error: 'Pays acheteur non supporté' });

    const pricePerTonne = buyer.priceUSD;
    const totalValueUSD = itmoQuantity * pricePerTonne;

    const itmo = await prisma.iTMORecord.create({
      data: { projectId, year: parseInt(year), hostCountry, buyingCountry, itmoQuantity: parseFloat(itmoQuantity), pricePerTonne, totalValueUSD, authorizationRef, correspondingAdj: true, status: 'AUTHORIZED' }
    });

    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'CREATE_ITMO', entity: 'ITMORecord', entityId: itmo.id, after: itmo } });
    res.status(201).json(itmo);
  } catch (e) { next(e); }
});

// GET /api/article6/itmo/:projectId — ITMOs d'un projet
router.get('/itmo/:projectId', auth, async (req, res, next) => {
  try {
    const records = await prisma.iTMORecord.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: 'desc' }
    });
    const totalValue = records.reduce((s, r) => s + r.totalValueUSD, 0);
    res.json({ records, totalValueUSD: totalValue, count: records.length });
  } catch (e) { next(e); }
});

// GET /api/article6/buyer-analysis — Analyse par pays acheteur
router.get('/buyer-analysis', auth, async (req, res, next) => {
  res.json({
    buyers: Object.entries(ITMO_BUYER_COUNTRIES).map(([code, b]) => ({ code, ...b })),
    marketPrices: { min: 35, max: 55, avg: 45, unit: '$/tCO2e' },
    vsVoluntaryMarket: { voluntary: 12, article6: 45, multiplier: 3.75 },
    topOpportunities: [
      { pair: 'Kenya → Japon', price: 42, bilateral: true },
      { pair: 'Rwanda → Singapour', price: 45, bilateral: true },
      { pair: 'Ghana → Suisse', price: 48, bilateral: true },
    ]
  });
});

module.exports = router;

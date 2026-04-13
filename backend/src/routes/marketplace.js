/**
 * PANGEA CARBON — Carbon Marketplace
 * Place de marché crédits carbone africains
 * Vendeurs: EPC/IPP · Acheteurs: Corporates · Fee: 2-3% PANGEA CARBON
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Prix live simulés (en prod: Xpansiv CBL API)
const LIVE_PRICES = {
  VERRA_VCS: { bid: 11.20, ask: 12.80, last: 12.00, change: +0.35, changeP: +2.9 },
  GOLD_STANDARD: { bid: 22.50, ask: 25.00, last: 23.75, change: +1.25, changeP: +5.6 },
  ARTICLE6: { bid: 42.00, ask: 48.00, last: 45.00, change: -2.00, changeP: -4.3 },
  CORSIA: { bid: 17.50, ask: 20.00, last: 18.75, change: +0.75, changeP: +4.2 },
  BIOMASS: { bid: 8.50, ask: 10.50, last: 9.50, change: -0.50, changeP: -5.0 },
};

// GET /api/marketplace/prices — Prix live par standard
router.get('/prices', auth, async (req, res) => {
  // Simuler légère variation toutes les 30s
  const now = Date.now();
  const seed = Math.floor(now / 30000);
  const jitter = (std) => ((Math.sin(seed * 7 + std.charCodeAt(0)) * 0.05) * LIVE_PRICES[std].last);

  const prices = Object.entries(LIVE_PRICES).map(([standard, p]) => ({
    standard,
    bid: parseFloat((p.bid + jitter(standard)).toFixed(2)),
    ask: parseFloat((p.ask + jitter(standard)).toFixed(2)),
    last: parseFloat((p.last + jitter(standard)).toFixed(2)),
    change: p.change,
    changeP: p.changeP,
    volume24h: Math.floor(Math.random() * 50000 + 10000),
    updatedAt: new Date().toISOString(),
  }));

  res.json({ prices, source: 'PANGEA CARBON Price Feed (Xpansiv CBL reference)', timestamp: new Date() });
});

// GET /api/marketplace/listings — Annonces disponibles
router.get('/listings', auth, async (req, res, next) => {
  try {
    const { standard, minQty, maxPrice, country } = req.query;

    // Générer des listings depuis les crédits émis (blockchain registry)
    const issuances = await prisma.creditIssuance.findMany({
      where: {
        status: 'ISSUED',
        ...(standard && { standard }),
        quantity: { gte: parseFloat(minQty as string) || 1 },
      },
      include: { project: { select: { name: true, type: true, countryCode: true, installedMW: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });

    // Si pas de crédits réels, générer des listings démo
    const listings = issuances.length > 0 ? issuances.map(iss => {
      const price = LIVE_PRICES[iss.standard as keyof typeof LIVE_PRICES];
      return {
        id: iss.id, standard: iss.standard, vintage: iss.vintage,
        quantity: iss.quantity, availableQty: iss.quantity,
        askPrice: price?.ask || 12,
        project: iss.project,
        serialFrom: iss.serialFrom, serialTo: iss.serialTo,
        blockHash: iss.blockHash?.slice(0, 16) + '...',
        issuedAt: iss.issuedAt,
        seller: 'PANGEA CARBON Africa',
        verified: true,
        co2Cert: iss.standard,
      };
    }) : generateDemoListings();

    const filtered = listings.filter(l => !maxPrice || l.askPrice <= parseFloat(maxPrice as string))
      .filter(l => !country || l.project?.countryCode === country);

    res.json({
      listings: filtered,
      total: filtered.length,
      totalAvailable: filtered.reduce((s, l) => s + (l.availableQty || l.quantity), 0),
    });
  } catch (e) { next(e); }
});

function generateDemoListings() {
  const projects = [
    { name: 'Parc Solaire Abidjan Nord', type: 'SOLAR', countryCode: 'CI', installedMW: 52.5 },
    { name: 'Turkana Wind Farm', type: 'WIND', countryCode: 'KE', installedMW: 120 },
    { name: 'Lagos Solar Plant', type: 'SOLAR', countryCode: 'NG', installedMW: 30 },
    { name: 'Dakar Hybrid Project', type: 'HYBRID', countryCode: 'SN', installedMW: 18.5 },
    { name: 'Volta Hydro Ghana', type: 'HYDRO', countryCode: 'GH', installedMW: 45 },
  ];
  return projects.flatMap((p, i) => [
    { id: `demo-${i}-vcs`, standard: 'VERRA_VCS', vintage: 2024, quantity: Math.floor(Math.random() * 5000 + 1000), availableQty: Math.floor(Math.random() * 3000 + 500), askPrice: 12 + Math.random() * 2, project: p, verified: true, seller: p.name, issuedAt: new Date() },
    { id: `demo-${i}-gs`, standard: 'GOLD_STANDARD', vintage: 2024, quantity: Math.floor(Math.random() * 2000 + 500), availableQty: Math.floor(Math.random() * 1500 + 200), askPrice: 23 + Math.random() * 3, project: p, verified: true, seller: p.name, issuedAt: new Date() },
  ]).slice(0, 12);
}

// POST /api/marketplace/bid — Passer un ordre d'achat
router.post('/bid', auth, async (req, res, next) => {
  try {
    const { listingId, quantity, maxPrice, buyerNote } = req.body;
    if (!listingId || !quantity || !maxPrice) return res.status(400).json({ error: 'listingId, quantity, maxPrice requis' });

    const fee = parseFloat(quantity) * parseFloat(maxPrice) * 0.025; // 2.5% PANGEA CARBON fee
    const total = parseFloat(quantity) * parseFloat(maxPrice) + fee;

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'MARKETPLACE_BID',
        entity: 'CreditIssuance', entityId: listingId,
        after: { quantity, maxPrice, fee, total, buyerNote }
      }
    });

    res.status(201).json({
      orderId: `ORD-${Date.now()}`,
      status: 'PENDING_SETTLEMENT',
      quantity: parseFloat(quantity),
      maxPrice: parseFloat(maxPrice),
      pangea_fee: parseFloat(fee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      message: 'Ordre enregistré. Settlement sous 24-48h après vérification KYC/AML.',
      nextStep: 'Contactez contact@pangea-carbon.com pour la procédure de settlement.',
    });
  } catch (e) { next(e); }
});

// GET /api/marketplace/stats — Stats du marché
router.get('/stats', auth, async (req, res, next) => {
  try {
    const issuances = await prisma.creditIssuance.findMany({ where: { status: 'ISSUED' } });
    const retired = await prisma.creditIssuance.findMany({ where: { status: 'RETIRED' } });

    res.json({
      totalAvailable: issuances.reduce((s, i) => s + i.quantity, 0),
      totalRetired: retired.reduce((s, i) => s + i.quantity, 0),
      activeListings: issuances.length,
      standards: ['VERRA_VCS', 'GOLD_STANDARD', 'ARTICLE6', 'CORSIA'],
      africaMarketSize: 400000000, // $400M potentiel africain
      pangea_fee_pct: 2.5,
      prices: LIVE_PRICES,
    });
  } catch (e) { next(e); }
});

module.exports = router;

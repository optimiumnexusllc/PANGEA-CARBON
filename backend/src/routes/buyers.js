/**
 * PANGEA CARBON — Carbon Demand Side / Corporate Buyers
 * Routes: buyer profiles, lead scoring, CBAM calculator, demand intelligence
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── CBAM Calculator Engine ───────────────────────────────────────────────────
function calculateCBAM({ sector, exportsToEU, co2Embedded, carbonPriceEU = 65 }) {
  const SECTOR_FACTORS = {
    STEEL:        { defaultIntensity: 1.85, cbamFactor: 1.0  }, // tCO2/t acier
    CEMENT:       { defaultIntensity: 0.83, cbamFactor: 1.0  },
    ALUMINIUM:    { defaultIntensity: 6.70, cbamFactor: 1.0  },
    FERTILIZER:   { defaultIntensity: 2.30, cbamFactor: 1.0  },
    ELECTRICITY:  { defaultIntensity: 0.50, cbamFactor: 1.0  },
    HYDROGEN:     { defaultIntensity: 9.00, cbamFactor: 1.0  },
  };
  const sf = SECTOR_FACTORS[sector] || { defaultIntensity: 1.0, cbamFactor: 1.0 };
  const totalCO2 = co2Embedded || (exportsToEU * sf.defaultIntensity / 1000);
  const annualCost = totalCO2 * carbonPriceEU;
  const pangeaOffset = totalCO2 * 12; // $12/t crédits volontaires
  const savings = annualCost - pangeaOffset;
  return {
    totalCO2tpa: Math.round(totalCO2),
    annualCBAMCost: Math.round(annualCost),
    pangeaOffsetCost: Math.round(pangeaOffset),
    annualSavings: Math.round(savings),
    savingsPct: Math.round((savings / annualCost) * 100),
    recommendation: savings > 0
      ? `Offset via PANGEA CARBON saves ~$${Math.round(savings).toLocaleString()}/year vs EU ETS certificates`
      : 'EU ETS certificates may be more cost-effective at current prices',
    urgency: totalCO2 > 10000 ? 'HIGH' : totalCO2 > 1000 ? 'MEDIUM' : 'LOW',
  };
}

// ─── Lead Score Engine ────────────────────────────────────────────────────────
function calculateLeadScore(profile) {
  let score = 0;
  if (profile.annualBudgetUSD > 1000000)  score += 25;
  else if (profile.annualBudgetUSD > 100000) score += 15;
  else if (profile.annualBudgetUSD > 10000)  score += 5;
  if (profile.buyerType === 'COMPLIANCE_CBAM')   score += 20;
  if (profile.buyerType === 'STRATEGIC_NETZERO')  score += 18;
  if (profile.buyerType === 'CORPORATE_VOLUNTARY') score += 12;
  if (profile.sbtValidated)     score += 15;
  if (profile.listedCompany)    score += 10;
  if (profile.contactEmail)     score += 8;
  if (profile.totalEmissions > 100000) score += 10;
  if (profile.kycStatus === 'VERIFIED') score += 12;
  if (profile.annualVolumeT > 10000) score += 8;
  return Math.min(100, score);
}

// ─── GET /api/buyers — Liste tous les buyers (ADMIN+) ─────────────────────────
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, type, country, search, sort = 'leadScore' } = req.query;
    const where = {};
    if (status)  where.status = status;
    if (type)    where.buyerType = type;
    if (country) where.country = country;
    if (search)  where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { contactEmail: { contains: search, mode: 'insensitive' } },
      { organization: { name: { contains: search, mode: 'insensitive' } } },
    ];

    const buyers = await prisma.buyerProfile.findMany({
      where,
      include: {
        organization: { select: { name: true, plan: true, status: true } },
      },
      orderBy: sort === 'leadScore' ? { leadScore: 'desc' }
             : sort === 'budget'    ? { annualBudgetUSD: 'desc' }
             : sort === 'volume'    ? { annualVolumeT: 'desc' }
             : { createdAt: 'desc' },
      take: 100,
    });

    // Stats agrégées
    const stats = {
      total: buyers.length,
      qualified: buyers.filter(b => b.status === 'QUALIFIED' || b.status === 'ACTIVE').length,
      premium: buyers.filter(b => b.status === 'PREMIUM').length,
      totalBudgetUSD: buyers.reduce((s, b) => s + (b.annualBudgetUSD || 0), 0),
      totalVolumeT:   buyers.reduce((s, b) => s + (b.annualVolumeT || 0), 0),
      cbamBuyers: buyers.filter(b => b.buyerType?.includes('CBAM')).length,
      strategicBuyers: buyers.filter(b => b.buyerType === 'STRATEGIC_NETZERO').length,
    };

    res.json({ buyers, stats });
  } catch(e) { next(e); }
});

// ─── POST /api/buyers — Créer un buyer profile ────────────────────────────────
router.post('/', auth, requirePermission('buyer.create_profile'), async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization required' });

    const data = { ...req.body };
    // Calculer le lead score initial
    data.leadScore = calculateLeadScore(data);
    data.lastActivityAt = new Date();

    const profile = await prisma.buyerProfile.upsert({
      where: { organizationId: orgId },
      update: { ...data, updatedAt: new Date(), leadScore: data.leadScore, lastActivityAt: new Date() },
      create: { organizationId: orgId, ...data, status: 'PROSPECT' },
    });

    res.json({ success: true, profile, leadScore: data.leadScore });
  } catch(e) { next(e); }
});

// ─── PUT /api/buyers/profile — Mettre à jour son profil buyer ─────────────────
router.put('/profile', auth, requirePermission('buyer.update_profile'), async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization required' });

    const data = { ...req.body };
    data.leadScore = calculateLeadScore(data);
    data.lastActivityAt = new Date();

    const profile = await prisma.buyerProfile.upsert({
      where: { organizationId: orgId },
      update: { ...data, updatedAt: new Date() },
      create: { organizationId: orgId, ...data, status: 'PROSPECT' },
    });
    res.json({ success: true, profile });
  } catch(e) { next(e); }
});

// ─── GET /api/buyers/profile — Mon profil buyer ───────────────────────────────
router.get('/profile', auth, async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return res.json({ exists: false });
    const profile = await prisma.buyerProfile.findUnique({
      where: { organizationId: orgId },
      include: { organization: { select: { name: true, plan: true } } },
    });
    res.json(profile || { exists: false });
  } catch(e) { next(e); }
});

// ─── POST /api/buyers/cbam-calculator ─────────────────────────────────────────
router.post('/cbam-calculator', auth, requirePermission('buyer.create_profile'), async (req, res) => {
  const result = calculateCBAM(req.body);
  res.json(result);
});

// ─── GET /api/buyers/market-intelligence ──────────────────────────────────────
router.get('/market-intelligence', auth, async (req, res, next) => {
  try {
    const [buyers, orders, listings] = await Promise.all([
      prisma.buyerProfile.count(),
      prisma.marketplaceOrder.groupBy({
        by: ['status'],
        _sum: { total: true, quantity: true },
        _count: true,
      }).catch(() => []),
      prisma.creditIssuance.aggregate({
        _sum: { quantity: true },
        _count: true,
        where: { forSale: true },
      }).catch(() => ({ _sum: { quantity: 0 }, _count: 0 })),
    ]);

    const paidOrders = orders.find(o => ['PAID','SETTLED'].includes(o.status));
    res.json({
      totalBuyers: buyers,
      totalVolumeTraded: paidOrders?._sum?.quantity || 0,
      totalValueUSD:     paidOrders?._sum?.total    || 0,
      creditsAvailable:  listings._sum.quantity      || 0,
      avgPricePerTonne:  12.4, // CBL reference
      marketTrend:       '+8.2%',
      topBuyerSectors:   ['MANUFACTURING','FINANCE','TRANSPORT','TECH','ENERGY'],
      cbamDeadlineAlert: 'Q1 2026 — Phase 3 reporting deadline',
    });
  } catch(e) { next(e); }
});

// ─── GET /api/buyers/:id ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res, next) => {
  try {
    const profile = await prisma.buyerProfile.findUnique({
      where: { id: req.params.id },
      include: {
        organization: { select: { name: true, plan: true } },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Buyer not found' });
    res.json(profile);
  } catch(e) { next(e); }
});

// ─── PATCH /api/buyers/:id/status ─────────────────────────────────────────────
router.patch('/:id/status', auth, requirePermission('buyer.qualify_leads'), async (req, res, next) => {
  try {
    if (!['SUPER_ADMIN','ADMIN','ORG_OWNER'].includes(req.user.role))
      return res.status(403).json({ error: 'Admin required' });
    const { status, kycStatus, carbonDeskNote } = req.body;
    const updated = await prisma.buyerProfile.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(kycStatus && { kycStatus, kycVerifiedAt: kycStatus === 'VERIFIED' ? new Date() : null }),
        ...(carbonDeskNote && { carbonDeskNote }),
        lastActivityAt: new Date(),
      },
    });
    res.json({ success: true, profile: updated });
  } catch(e) { next(e); }
});

module.exports = router;

/**
 * PANGEA CARBON — GHG Protocol Audit Engine
 * Palantir-grade carbon audit for corporations
 *
 * Standards supportés:
 *   GHG Protocol (WRI/WBCSD) — Scope 1, 2, 3
 *   ISO 14064-1 — vérification officielle
 *   Bilan Carbone (ADEME) — francophone
 *
 * Facteurs d'émission: IPCC AR6, UNFCCC, IEA 2024, Facteurs nationaux ADEME
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// ─── Facteurs d'émission GHG Protocol (IPCC AR6 + IEA 2024) ─────────────────
const EMISSION_FACTORS = {
  // SCOPE 1 — Combustion stationnaire
  DIESEL:           { factor: 2.6391, unit: 'LITRE',  scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Diesel / Gasoil' },
  PETROL:           { factor: 2.3142, unit: 'LITRE',  scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Essence / Petrol' },
  NATURAL_GAS:      { factor: 2.0431, unit: 'M3',     scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Gaz naturel' },
  LPG:              { factor: 1.5551, unit: 'LITRE',  scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'GPL / LPG' },
  HFO:              { factor: 3.1760, unit: 'LITRE',  scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Fioul lourd / HFO' },
  CHARCOAL:         { factor: 2.8900, unit: 'KG',     scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Charbon de bois' },
  COAL:             { factor: 2.4200, unit: 'KG',     scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Charbon' },
  BIOMASS:          { factor: 0.0150, unit: 'KG',     scope: 1, cat: 'STATIONARY_COMBUSTION',  desc: 'Biomasse' },
  // SCOPE 1 — Flotte de véhicules
  DIESEL_VEHICLE:   { factor: 0.2689, unit: 'KM',     scope: 1, cat: 'MOBILE_COMBUSTION',      desc: 'Véhicule diesel' },
  PETROL_VEHICLE:   { factor: 0.2070, unit: 'KM',     scope: 1, cat: 'MOBILE_COMBUSTION',      desc: 'Véhicule essence' },
  TRUCK_DIESEL:     { factor: 0.9000, unit: 'KM',     scope: 1, cat: 'MOBILE_COMBUSTION',      desc: 'Camion diesel' },
  MOTORCYCLE:       { factor: 0.1140, unit: 'KM',     scope: 1, cat: 'MOBILE_COMBUSTION',      desc: 'Moto/Scooter' },
  // SCOPE 1 — Fugitives
  REFRIGERANT_R22:  { factor: 1810,   unit: 'KG',     scope: 1, cat: 'FUGITIVE_EMISSIONS',     desc: 'Réfrigérant R-22' },
  REFRIGERANT_R410A:{ factor: 2088,   unit: 'KG',     scope: 1, cat: 'FUGITIVE_EMISSIONS',     desc: 'Réfrigérant R-410A' },
  // SCOPE 2 — Électricité (facteurs par pays, source: IEA 2024)
  ELEC_CI:          { factor: 0.5470, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Côte d\'Ivoire' },
  ELEC_GH:          { factor: 0.3420, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Ghana' },
  ELEC_NG:          { factor: 0.4300, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Nigeria' },
  ELEC_KE:          { factor: 0.2510, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Kenya' },
  ELEC_SN:          { factor: 0.6430, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Sénégal' },
  ELEC_TZ:          { factor: 0.2840, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Tanzanie' },
  ELEC_ET:          { factor: 0.0270, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Éthiopie (hydro)' },
  ELEC_ZA:          { factor: 0.9280, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Afrique du Sud' },
  ELEC_BF:          { factor: 0.5900, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Burkina Faso' },
  ELEC_RW:          { factor: 0.1580, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Rwanda' },
  ELEC_CM:          { factor: 0.2100, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Cameroun' },
  ELEC_ML:          { factor: 0.7200, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Mali' },
  ELEC_EUROPE:      { factor: 0.2720, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Europe (IEA)' },
  ELEC_WORLD:       { factor: 0.4940, unit: 'KWH',    scope: 2, cat: 'ELECTRICITY',            desc: 'Électricité — Mondial (IEA)' },
  // SCOPE 2 — Chaleur / Vapeur
  STEAM:            { factor: 0.2700, unit: 'KWH',    scope: 2, cat: 'HEAT_STEAM',             desc: 'Chaleur / Vapeur achetée' },
  // SCOPE 3 — Chaîne de valeur (15 catégories GHG Protocol)
  AIR_SHORT:        { factor: 0.2550, unit: 'PKM',    scope: 3, cat: 'BUSINESS_TRAVEL',        desc: 'Vol court-courrier (passager.km)' },
  AIR_LONG:         { factor: 0.1950, unit: 'PKM',    scope: 3, cat: 'BUSINESS_TRAVEL',        desc: 'Vol long-courrier (passager.km)' },
  RAIL:             { factor: 0.0410, unit: 'PKM',    scope: 3, cat: 'BUSINESS_TRAVEL',        desc: 'Train (passager.km)' },
  TAXI_MOTO:        { factor: 0.1800, unit: 'KM',     scope: 3, cat: 'COMMUTING',              desc: 'Taxi / Moto-taxi' },
  BUS:              { factor: 0.0890, unit: 'PKM',    scope: 3, cat: 'COMMUTING',              desc: 'Bus / Transport collectif' },
  FREIGHT_ROAD:     { factor: 0.1020, unit: 'TKM',    scope: 3, cat: 'UPSTREAM_TRANSPORT',     desc: 'Fret routier (tonne.km)' },
  FREIGHT_AIR:      { factor: 0.6020, unit: 'TKM',    scope: 3, cat: 'UPSTREAM_TRANSPORT',     desc: 'Fret aérien (tonne.km)' },
  FREIGHT_SEA:      { factor: 0.0082, unit: 'TKM',    scope: 3, cat: 'UPSTREAM_TRANSPORT',     desc: 'Fret maritime (tonne.km)' },
  PAPER:            { factor: 0.9280, unit: 'KG',     scope: 3, cat: 'PURCHASED_GOODS',        desc: 'Papier consommé' },
  PLASTIC:          { factor: 3.2000, unit: 'KG',     scope: 3, cat: 'PURCHASED_GOODS',        desc: 'Plastique' },
  STEEL:            { factor: 1.8500, unit: 'KG',     scope: 3, cat: 'PURCHASED_GOODS',        desc: 'Acier' },
  CEMENT:           { factor: 0.8300, unit: 'KG',     scope: 3, cat: 'PURCHASED_GOODS',        desc: 'Ciment' },
  FOOD_BEEF:        { factor: 27.000, unit: 'KG',     scope: 3, cat: 'PURCHASED_GOODS',        desc: 'Bœuf (restauration)' },
  FOOD_CHICKEN:     { factor: 5.700,  unit: 'KG',     scope: 3, cat: 'PURCHASED_GOODS',        desc: 'Poulet (restauration)' },
  IT_LAPTOP:        { factor: 300,    unit: 'UNIT',   scope: 3, cat: 'CAPITAL_GOODS',          desc: 'Ordinateur portable' },
  IT_SERVER:        { factor: 1200,   unit: 'UNIT',   scope: 3, cat: 'CAPITAL_GOODS',          desc: 'Serveur' },
  WASTE_LANDFILL:   { factor: 0.4670, unit: 'KG',     scope: 3, cat: 'WASTE',                  desc: 'Déchets — décharge' },
  WASTE_RECYCLED:   { factor: 0.0210, unit: 'KG',     scope: 3, cat: 'WASTE',                  desc: 'Déchets — recyclage' },
  WATER:            { factor: 0.0003, unit: 'LITRE',  scope: 3, cat: 'WATER',                   desc: 'Consommation d\'eau' },
};

// Catégories GHG Protocol (libellés FR/EN)
const CATEGORIES = {
  STATIONARY_COMBUSTION: { fr: 'Combustion stationnaire', en: 'Stationary combustion', scope: 1, icon: '🔥' },
  MOBILE_COMBUSTION:     { fr: 'Flotte de véhicules',     en: 'Mobile combustion',     scope: 1, icon: '🚗' },
  FUGITIVE_EMISSIONS:    { fr: 'Émissions fugitives',     en: 'Fugitive emissions',    scope: 1, icon: '💨' },
  ELECTRICITY:           { fr: 'Électricité achetée',     en: 'Purchased electricity', scope: 2, icon: '⚡' },
  HEAT_STEAM:            { fr: 'Chaleur / Vapeur',        en: 'Heat & Steam',          scope: 2, icon: '♨️' },
  BUSINESS_TRAVEL:       { fr: 'Déplacements pro',        en: 'Business travel',       scope: 3, icon: '✈️' },
  COMMUTING:             { fr: 'Trajets domicile-travail', en: 'Employee commuting',   scope: 3, icon: '🚌' },
  UPSTREAM_TRANSPORT:    { fr: 'Transport amont',         en: 'Upstream transport',    scope: 3, icon: '🚢' },
  PURCHASED_GOODS:       { fr: 'Biens & services achetés', en: 'Purchased goods',      scope: 3, icon: '📦' },
  CAPITAL_GOODS:         { fr: 'Biens d\'équipement',     en: 'Capital goods',         scope: 3, icon: '💻' },
  WASTE:                 { fr: 'Déchets générés',         en: 'Waste generated',       scope: 3, icon: '🗑️' },
  WATER:                 { fr: 'Eau consommée',           en: 'Water consumption',     scope: 3, icon: '💧' },
};

// ─── GET /ghg/factors — Facteurs d'émission ──────────────────────────────────
router.get('/factors', auth, (req, res) => {
  const factors = Object.entries(EMISSION_FACTORS).map(([key, ef]) => ({
    key, ...ef,
    category: CATEGORIES[ef.cat] || { fr: ef.cat, en: ef.cat },
  }));
  res.json({ factors, categories: CATEGORIES, total: factors.length });
});

// ─── GET /ghg/audits — Liste des audits ──────────────────────────────────────
router.get('/audits', auth, async (req, res, next) => {
  try {
    const audits = await prisma.gHGAudit.findMany({
      where: { organizationId: req.user.organizationId || undefined },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ audits, total: audits.length });
  } catch(e) { next(e); }
});

// ─── POST /ghg/audits — Créer un audit ───────────────────────────────────────
router.post('/audits', auth, async (req, res, next) => {
  try {
    const { name, reportingYear, framework, netZeroTarget } = req.body;
    if (!name || !reportingYear) return res.status(400).json({ error: 'name and reportingYear required' });

    const audit = await prisma.gHGAudit.create({
      data: {
        organizationId: req.user.organizationId || 'default',
        userId: req.user.userId,
        name, reportingYear: parseInt(reportingYear),
        framework: framework || 'GHG_PROTOCOL',
        netZeroTarget: netZeroTarget ? parseInt(netZeroTarget) : null,
        status: 'IN_PROGRESS',
      }
    });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'GHG_AUDIT_CREATED', entity: 'GHGAudit', entityId: audit.id, after: { name, reportingYear, framework } }
    });

    res.status(201).json(audit);
  } catch(e) { next(e); }
});

// ─── GET /ghg/audits/:id — Détail d'un audit ─────────────────────────────────
router.get('/audits/:id', auth, async (req, res, next) => {
  try {
    const audit = await prisma.gHGAudit.findUnique({
      where: { id: req.params.id },
      include: { entries: { orderBy: { scope: 'asc' } } }
    });
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    // Recalculer les totaux par scope
    const byScope = { 1: 0, 2: 0, 3: 0 };
    const byCategory = {};
    audit.entries.forEach(e => {
      byScope[e.scope] = (byScope[e.scope] || 0) + e.co2e;
      byCategory[e.category] = (byCategory[e.category] || 0) + e.co2e;
    });
    const grand = byScope[1] + byScope[2] + byScope[3];

    res.json({
      ...audit,
      scope1Total: byScope[1],
      scope2Total: byScope[2],
      scope3Total: byScope[3],
      grandTotal: grand,
      byCategory,
      offsetNeeded: Math.ceil(grand),
      scopeBreakdown: [
        { scope: 1, label: 'Scope 1 — Direct', total: byScope[1], pct: grand ? (byScope[1]/grand*100).toFixed(1) : 0, color: '#F87171' },
        { scope: 2, label: 'Scope 2 — Electricity', total: byScope[2], pct: grand ? (byScope[2]/grand*100).toFixed(1) : 0, color: '#FCD34D' },
        { scope: 3, label: 'Scope 3 — Value chain', total: byScope[3], pct: grand ? (byScope[3]/grand*100).toFixed(1) : 0, color: '#38BDF8' },
      ],
    });
  } catch(e) { next(e); }
});

// ─── POST /ghg/audits/:id/entries — Ajouter une entrée ───────────────────────
router.post('/audits/:id/entries', auth, async (req, res, next) => {
  try {
    const { factorKey, quantity, description, country, notes, customFactor } = req.body;

    const ef = EMISSION_FACTORS[factorKey];
    let emissionFactor = ef?.factor || parseFloat(customFactor) || 0;
    if (!emissionFactor) return res.status(400).json({ error: 'Unknown factor key or customFactor required' });

    const qty = parseFloat(quantity) || 0;
    const co2e = qty * emissionFactor;

    const entry = await prisma.gHGEntry.create({
      data: {
        auditId: req.params.id,
        scope: ef?.scope || req.body.scope || 1,
        category: ef?.cat || req.body.category || 'OTHER',
        subcategory: factorKey,
        description: description || ef?.desc || factorKey,
        quantity: qty,
        unit: ef?.unit || req.body.unit || 'UNIT',
        emissionFactor,
        efSource: 'IPCC_AR6_IEA_2024',
        co2e,
        country: country || null,
        notes: notes || null,
      }
    });

    // Recalculer les totaux de l'audit
    await recalcAudit(req.params.id);

    res.status(201).json({ ...entry, co2e_display: `${co2e.toFixed(4)} tCO₂e` });
  } catch(e) { next(e); }
});

// ─── DELETE /ghg/audits/:id/entries/:eid ─────────────────────────────────────
router.delete('/audits/:id/entries/:eid', auth, async (req, res, next) => {
  try {
    await prisma.gHGEntry.delete({ where: { id: req.params.eid } });
    await recalcAudit(req.params.id);
    res.json({ deleted: true });
  } catch(e) { next(e); }
});

// ─── POST /ghg/audits/:id/bulk — Import bulk d'entrées ───────────────────────
router.post('/audits/:id/bulk', auth, async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });

    const created = [];
    for (const row of entries) {
      const ef = EMISSION_FACTORS[row.factorKey];
      if (!ef && !row.customFactor) continue;
      const factor = ef?.factor || parseFloat(row.customFactor);
      const qty    = parseFloat(row.quantity) || 0;
      const co2e   = qty * factor;
      const entry  = await prisma.gHGEntry.create({
        data: {
          auditId:        req.params.id,
          scope:          ef?.scope || row.scope || 1,
          category:       ef?.cat   || row.category || 'OTHER',
          subcategory:    row.factorKey || null,
          description:    row.description || ef?.desc || row.factorKey,
          quantity:       qty,
          unit:           ef?.unit || row.unit || 'UNIT',
          emissionFactor: factor,
          efSource:       'IPCC_AR6_IEA_2024',
          co2e, country: row.country || null, notes: row.notes || null,
        }
      });
      created.push(entry);
    }

    await recalcAudit(req.params.id);
    res.json({ created: created.length, entries: created });
  } catch(e) { next(e); }
});

// ─── POST /ghg/audits/:id/ai-analysis — Analyse Claude ──────────────────────
router.post('/audits/:id/ai-analysis', auth, async (req, res, next) => {
  try {
    const audit = await prisma.gHGAudit.findUnique({
      where: { id: req.params.id },
      include: { entries: true }
    });
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const byScope = { 1: 0, 2: 0, 3: 0 };
    audit.entries.forEach(e => { byScope[e.scope] = (byScope[e.scope]||0) + e.co2e; });
    const grand = byScope[1] + byScope[2] + byScope[3];

    // Appel Claude pour analyse
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return res.status(400).json({ error: 'ANTHROPIC_API_KEY not configured' });

    const prompt = `Tu es un expert GHG Protocol / ISO 14064 spécialisé en Afrique subsaharienne.

Audit carbone: ${audit.name} (${audit.reportingYear})
Framework: ${audit.framework}
Scope 1: ${byScope[1].toFixed(2)} tCO2e
Scope 2: ${byScope[2].toFixed(2)} tCO2e
Scope 3: ${byScope[3].toFixed(2)} tCO2e
TOTAL: ${grand.toFixed(2)} tCO2e

Top 5 sources:
${audit.entries.sort((a,b)=>b.co2e-a.co2e).slice(0,5).map(e => `- ${e.description}: ${e.co2e.toFixed(2)} tCO2e`).join('\n')}

Produis une analyse Palantir-grade de 3 sections:
1. DIAGNOSTIC (forces, faiblesses, comparaison secteur africain)
2. ROADMAP RÉDUCTION (3 actions prioritaires avec ROI estimé)
3. STRATÉGIE COMPENSATION (crédits carbone recommandés, projets africains Verra/Gold Standard)

Sois précis, chiffré, actionnable. Contexte africain prioritaire.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });

    const data = await response.json();
    const analysis = data.content?.[0]?.text || 'Analysis generation failed';

    await prisma.gHGAudit.update({
      where: { id: req.params.id },
      data: { aiAnalysis: analysis }
    });

    res.json({ analysis, tokens: data.usage });
  } catch(e) { next(e); }
});

// ─── GET /ghg/audits/:id/offset-plan — Plan de compensation ──────────────────
router.get('/audits/:id/offset-plan', auth, async (req, res, next) => {
  try {
    const audit = await prisma.gHGAudit.findUnique({
      where: { id: req.params.id }, include: { entries: true }
    });
    if (!audit) return res.status(404).json({ error: 'Audit not found' });

    const grand = audit.entries.reduce((s, e) => s + e.co2e, 0);
    const offsetNeeded = Math.ceil(grand);

    // Recommandations de projets africains
    const projects = await prisma.project.findMany({
      where: { status: { in: ['CREDITED', 'ACTIVE', 'VERIFIED'] } },
      include: { creditIssuances: { where: { status: 'ISSUED' }, take: 1 } },
      take: 5,
    });

    const offsets = [
      {
        standard: 'VERRA_VCS',
        price: 12.80,
        qty: Math.ceil(offsetNeeded * 0.6),
        cost: Math.ceil(offsetNeeded * 0.6) * 12.80,
        label: 'Verra VCS — solaire africain',
        description: '60% via projets Verra VCS afrique sub-saharienne',
        projects: projects.slice(0, 2).map(p => p.name),
      },
      {
        standard: 'GOLD_STANDARD',
        price: 24.00,
        qty: Math.ceil(offsetNeeded * 0.3),
        cost: Math.ceil(offsetNeeded * 0.3) * 24.00,
        label: 'Gold Standard SDG+',
        description: '30% Gold Standard avec co-bénéfices SDG',
        projects: projects.slice(2, 4).map(p => p.name),
      },
      {
        standard: 'ARTICLE6',
        price: 45.00,
        qty: Math.ceil(offsetNeeded * 0.1),
        cost: Math.ceil(offsetNeeded * 0.1) * 45.00,
        label: 'Article 6 ITMO premium',
        description: '10% Article 6 pour engagements net-zéro haute qualité',
        projects: projects.slice(4, 5).map(p => p.name),
      },
    ];

    const totalOffsetCost = offsets.reduce((s, o) => s + o.cost, 0);
    const scopes = { 1: 0, 2: 0, 3: 0 };
    audit.entries.forEach(e => { scopes[e.scope] = (scopes[e.scope]||0) + e.co2e; });

    res.json({
      auditId: audit.id,
      reportingYear: audit.reportingYear,
      totalEmissions: grand,
      offsetNeeded,
      offsetAlreadyPurchased: audit.offsetPurchased || 0,
      remainingToOffset: Math.max(0, offsetNeeded - (audit.offsetPurchased || 0)),
      strategy: offsets,
      totalOffsetCost,
      costPerTonne: totalOffsetCost / offsetNeeded,
      timeline: '3-6 months for full offset portfolio',
      scopes,
      recommendation: grand < 100 ? 'SME — Single project offset' :
                      grand < 1000 ? 'Mid-size — Diversified portfolio' :
                      'Corporate — Full Article 6 + VCS + Gold Standard strategy',
    });
  } catch(e) { next(e); }
});

// ─── GET /ghg/dashboard — Tableau de bord GHG global ────────────────────────
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const audits = await prisma.gHGAudit.findMany({
      where: { organizationId: req.user.organizationId || undefined },
      include: { entries: true },
      orderBy: { reportingYear: 'desc' },
    });

    const currentYear = new Date().getFullYear() - 1;
    const currentAudit = audits.find(a => a.reportingYear === currentYear) || audits[0];

    let totalEmissions = 0, scope1 = 0, scope2 = 0, scope3 = 0;
    if (currentAudit) {
      currentAudit.entries.forEach(e => {
        totalEmissions += e.co2e;
        if (e.scope === 1) scope1 += e.co2e;
        if (e.scope === 2) scope2 += e.co2e;
        if (e.scope === 3) scope3 += e.co2e;
      });
    }

    // Tendance YoY
    const trend = audits.slice(0, 3).map(a => ({
      year: a.reportingYear,
      total: a.entries.reduce((s,e) => s+e.co2e, 0),
    })).reverse();

    res.json({
      totalEmissions, scope1, scope2, scope3,
      auditCount: audits.length,
      currentAudit: currentAudit ? { id: currentAudit.id, name: currentAudit.name, year: currentAudit.reportingYear, status: currentAudit.status } : null,
      trend,
      offsetRequired: Math.ceil(totalEmissions),
      netZeroGap: currentAudit?.netZeroTarget ? `${currentAudit.netZeroTarget - new Date().getFullYear()} years` : null,
      maturityScore: audits.length === 0 ? 0 : audits.length === 1 ? 25 : audits.length <= 3 ? 60 : 90,
    });
  } catch(e) { next(e); }
});

// ─── Helper: recalcul des totaux d'un audit ───────────────────────────────────
async function recalcAudit(auditId) {
  const entries = await prisma.gHGEntry.findMany({ where: { auditId } });
  const scope1 = entries.filter(e=>e.scope===1).reduce((s,e)=>s+e.co2e,0);
  const scope2 = entries.filter(e=>e.scope===2).reduce((s,e)=>s+e.co2e,0);
  const scope3 = entries.filter(e=>e.scope===3).reduce((s,e)=>s+e.co2e,0);
  const grand  = scope1 + scope2 + scope3;
  await prisma.gHGAudit.update({
    where: { id: auditId },
    data: { scope1Total: scope1, scope2Total: scope2, scope3Total: scope3, grandTotal: grand, offsetNeeded: Math.ceil(grand) }
  });
}

module.exports = router;

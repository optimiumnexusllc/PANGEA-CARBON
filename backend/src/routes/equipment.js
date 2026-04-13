/**
 * PANGEA CARBON — Equipment API
 * Ingestion données depuis onduleurs : SMA, Huawei, SolarEdge, Fronius, CSV
 * Auth: X-API-Key header (clé d'API par organisation)
 */
const router = require('express').Router();
const { validate, rules } = require('../middleware/validate');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { MRVEngine } = require('../services/mrv.service');
const prisma = new PrismaClient();

// Middleware: vérifier X-API-Key
const apiKeyAuth = async (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: 'X-API-Key manquant' });

  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: { select: { id: true, organizationId: true, role: true } } }
  });

  if (!apiKey || !apiKey.isActive) return res.status(401).json({ error: 'Clé API invalide ou révoquée' });
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return res.status(401).json({ error: 'Clé API expirée' });

  // Mettre à jour lastUsedAt
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  req.apiKey = apiKey;
  req.user = { userId: apiKey.user.id, organizationId: apiKey.user.organizationId };
  next();
};

// POST /api/equipment/reading — Lecture unique d'onduleur
router.post('/reading', apiKeyAuth, rules.equipmentReading, validate, async (req, res, next) => {
  try {
    const {
      project_id, device_id,
      timestamp, energy_kwh, energy_mwh,
      peak_power_kw, peak_power_mw,
      availability_pct, period_start, period_end,
      notes
    } = req.body;

    // Trouver le projet (par id ou par device_id mappé)
    let project;
    if (project_id) {
      project = await prisma.project.findUnique({ where: { id: project_id } });
    } else if (device_id) {
      // Chercher par notes contenant device_id (convention de nommage)
      project = await prisma.project.findFirst({
        where: { description: { contains: device_id } }
      });
    }

    if (!project) return res.status(404).json({ error: 'Projet introuvable. Passez project_id ou un device_id valide.' });

    // Conversion kWh → MWh si nécessaire
    const mwh = energy_mwh || (energy_kwh ? energy_kwh / 1000 : null);
    if (!mwh) return res.status(400).json({ error: 'energy_kwh ou energy_mwh requis' });

    const mwPeak = peak_power_mw || (peak_power_kw ? peak_power_kw / 1000 : null);

    // Calculer les périodes si non fournies
    const ts = timestamp ? new Date(timestamp) : new Date();
    const pStart = period_start ? new Date(period_start) : new Date(ts.getFullYear(), ts.getMonth(), 1);
    const pEnd = period_end ? new Date(period_end) : new Date(ts.getFullYear(), ts.getMonth() + 1, 0);

    const reading = await prisma.energyReading.create({
      data: {
        projectId: project.id,
        periodStart: pStart,
        periodEnd: pEnd,
        energyMWh: parseFloat(mwh),
        peakPowerMW: mwPeak ? parseFloat(mwPeak) : null,
        availabilityPct: availability_pct ? parseFloat(availability_pct) : null,
        source: device_id ? `API:${device_id}` : 'API',
        notes: notes || null,
      }
    });

    // Calculer MRV si l'année est complète (12 lectures)
    const year = pStart.getFullYear();
    const yearReadings = await prisma.energyReading.count({
      where: { projectId: project.id, periodStart: { gte: new Date(`${year}-01-01`) } }
    });

    let mrvPreview = null;
    if (yearReadings >= 1) {
      const readings = await prisma.energyReading.findMany({
        where: { projectId: project.id, periodStart: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } }
      });
      const mrv = MRVEngine.calculateAnnual(readings, project);
      mrvPreview = {
        totalMWh: mrv.projectMetrics.totalMWh,
        netCarbonCredits: mrv.emissions.netCarbonCredits,
        revenueUSD: mrv.financials.netRevenueUSD,
      };
    }

    res.status(201).json({
      success: true,
      reading: { id: reading.id, energyMWh: reading.energyMWh, periodStart: reading.periodStart },
      project: { id: project.id, name: project.name },
      mrvPreview,
    });
  } catch (e) { next(e); }
});

// POST /api/equipment/readings/bulk — Import en masse (CSV parsé côté client)
router.post('/readings/bulk', apiKeyAuth, async (req, res, next) => {
  try {
    const { project_id, readings } = req.body;
    if (!Array.isArray(readings) || !readings.length) {
      return res.status(400).json({ error: 'readings doit être un tableau non vide' });
    }

    const project = await prisma.project.findUnique({ where: { id: project_id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const data = readings.map(r => ({
      projectId: project.id,
      periodStart: new Date(r.period_start || r.periodStart),
      periodEnd: new Date(r.period_end || r.periodEnd),
      energyMWh: parseFloat(r.energy_mwh || r.energyMWh || (r.energy_kwh / 1000)),
      peakPowerMW: r.peak_power_mw ? parseFloat(r.peak_power_mw) : null,
      availabilityPct: r.availability_pct ? parseFloat(r.availability_pct) : null,
      source: 'BULK_API',
    }));

    const result = await prisma.energyReading.createMany({ data, skipDuplicates: true });
    res.json({ success: true, created: result.count, total: readings.length });
  } catch (e) { next(e); }
});

// GET /api/equipment/projects — Liste des projets accessibles via cette clé
router.get('/projects', apiKeyAuth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      select: { id: true, name: true, type: true, installedMW: true, countryCode: true, status: true,
        _count: { select: { readings: true } } }
    });
    res.json({ projects, apiKeyPrefix: req.apiKey.keyPrefix });
  } catch (e) { next(e); }
});

// GET /api/equipment/status — Statut de la connexion + stats live
router.get('/status', apiKeyAuth, async (req, res, next) => {
  try {
    const recentReadings = await prisma.energyReading.findMany({
      where: { project: { userId: req.user.userId } },
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { project: { select: { name: true } } }
    });
    res.json({
      status: 'connected', apiKey: req.apiKey.keyPrefix + '••••••••',
      lastActivity: req.apiKey.lastUsedAt,
      recentReadings: recentReadings.map(r => ({
        project: r.project.name, energyMWh: r.energyMWh,
        period: r.periodStart, source: r.source
      })),
    });
  } catch (e) { next(e); }
});

// POST /api/equipment/webhook — Webhook générique (reçoit payload onduleur)
router.post('/webhook/:deviceType', async (req, res, next) => {
  try {
    const { deviceType } = req.params;
    const key = req.headers['x-api-key'] || req.headers['x-pangea-key'];
    if (!key) return res.status(401).json({ error: 'Authentification requise' });

    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
    if (!apiKey?.isActive) return res.status(401).json({ error: 'Clé invalide' });

    // Normaliser selon le deviceType
    let normalized = {};
    const body = req.body;

    if (deviceType === 'sma') {
      normalized = {
        energy_mwh: body.result?.['0199-xxxxx:Production:Wh'] ? body.result['0199-xxxxx:Production:Wh'] / 1000000 : null,
        peak_power_mw: body.result?.['0199-xxxxx:Production:W'] ? body.result['0199-xxxxx:Production:W'] / 1000000 : null,
      };
    } else if (deviceType === 'huawei') {
      normalized = {
        energy_mwh: body.day_power_wh ? body.day_power_wh / 1000000 : null,
        peak_power_mw: body.active_power_kw ? body.active_power_kw / 1000 : null,
        availability_pct: body.efficiency_percent,
      };
    } else if (deviceType === 'solaredge') {
      const production = body.energy?.values?.[0];
      normalized = { energy_mwh: production?.value ? production.value / 1000000 : null };
    } else if (deviceType === 'fronius') {
      normalized = {
        energy_mwh: body.Body?.Data?.Site?.E_Day ? body.Body.Data.Site.E_Day / 1000000 : null,
        peak_power_mw: body.Body?.Data?.Site?.P_PV ? body.Body.Data.Site.P_PV / 1000000 : null,
      };
    }

    // Log pour processing async (simplifié)
    await prisma.auditLog.create({
      data: {
        action: `WEBHOOK_${deviceType.toUpperCase()}`,
        entity: 'EnergyReading', entityId: 'webhook',
        after: { ...normalized, raw: body, key: apiKey.keyPrefix },
      }
    });

    res.json({ received: true, deviceType, normalized });
  } catch (e) { next(e); }
});

module.exports = router;

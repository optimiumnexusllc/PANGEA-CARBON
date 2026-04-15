const router = require('express').Router();
const { validate, rules } = require('../middleware/validate');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const prisma = new PrismaClient();

// GET /api/projects/:id/readings
router.get('/:id/readings', auth, async (req, res, next) => {
  try {
    const { year, page = 1, limit = 50 } = req.query;
    const where = { projectId: req.params.id };
    if (year) {
      where.periodStart = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }

    const [readings, total] = await Promise.all([
      prisma.energyReading.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.energyReading.count({ where }),
    ]);

    res.json({ readings, total });
  } catch (e) { next(e); }
});

// POST /api/projects/:id/readings - Ajouter une lecture manuelle
router.post('/:id/readings', auth, requirePermission('projects.update'), [
  body('periodStart').isISO8601(),
  body('periodEnd').isISO8601(),
  body('energyMWh').isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { periodStart, periodEnd, energyMWh, peakPowerMW, availabilityPct, notes } = req.body;

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const reading = await prisma.energyReading.create({
      data: {
        projectId: req.params.id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        energyMWh: parseFloat(energyMWh),
        peakPowerMW: peakPowerMW ? parseFloat(peakPowerMW) : null,
        availabilityPct: availabilityPct ? parseFloat(availabilityPct) : null,
        notes,
        source: 'MANUAL',
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        projectId: req.params.id,
        action: 'CREATE',
        entity: 'EnergyReading',
        entityId: reading.id,
        after: reading,
        ipAddress: req.ip,
      }
    });

    res.status(201).json(reading);
    // Déclencher le calcul MRV en arrière-plan
    try {
      const { jobs } = require('../jobs/queue');
      await jobs.scheduleMRV(projectId, req.user.userId);
    } catch (queueErr) {
      // Ne pas bloquer si la queue échoue
      console.warn('[Queue] MRV schedule failed:', queueErr.message);
    }
  } catch (e) { next(e); }
});

// POST /api/projects/:id/readings/bulk - Import CSV (array)
router.post('/:id/readings/bulk', auth, requirePermission('projects.update'), async (req, res, next) => {
  try {
    const { readings } = req.body;
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'Format invalide: tableau de lectures requis' });
    }

    const data = readings.map(r => ({
      projectId: req.params.id,
      periodStart: new Date(r.periodStart),
      periodEnd: new Date(r.periodEnd),
      energyMWh: parseFloat(r.energyMWh),
      peakPowerMW: r.peakPowerMW ? parseFloat(r.peakPowerMW) : null,
      availabilityPct: r.availabilityPct ? parseFloat(r.availabilityPct) : null,
      source: 'CSV',
    }));

    const result = await prisma.energyReading.createMany({ data, skipDuplicates: true });
    res.json({ created: result.count, total: readings.length });
  } catch (e) { next(e); }
});

module.exports = router;

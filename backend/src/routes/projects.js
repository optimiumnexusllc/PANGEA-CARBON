const router = require('express').Router();
const { validate, rules } = require('../middleware/validate');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { AFRICAN_GRID_EMISSION_FACTORS } = require('../services/mrv.service');
const prisma = new PrismaClient();

// GET /api/projects
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, type, country, page = 1, limit = 20 } = req.query;
    // Isolation tenant: filtre par organisation ou par user
    const orgId = req.user.organizationId;
    const where = {};
    if (req.user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN voit tout
    } else if (orgId) {
      // Users avec org: voient les projets de leur org
      where.user = { organizationId: orgId };
    } else {
      // Users sans org: voient seulement leurs projets
      where.userId = req.user.userId;
    }
    if (status) where.status = status;
    if (type) where.type = type;
    if (country) where.countryCode = country;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { readings: true, reports: true } },
          mrvRecords: { orderBy: { year: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { next(e); }
});

// GET /api/projects/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        readings: { orderBy: { periodStart: 'desc' }, take: 12 },
        mrvRecords: { orderBy: { year: 'desc' } },
        reports: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { readings: true } }
      }
    });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });
    res.json(project);
  } catch (e) { next(e); }
});

// POST /api/projects
router.post('/', auth, [
  body('name').trim().notEmpty(),
  body('type').isIn(['SOLAR', 'WIND', 'HYDRO', 'BIOMASS', 'HYBRID']),
  body('country').trim().notEmpty(),
  body('countryCode').trim().isLength({ min: 2, max: 2 }),
  body('installedMW').isFloat({ min: 0.001 }),
  body('startDate').isISO8601(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, type, country, countryCode, latitude, longitude,
            installedMW, startDate, endDate, standard } = req.body;

    // Récupère facteur d'émission du pays automatiquement
    const countryData = AFRICAN_GRID_EMISSION_FACTORS[countryCode.toUpperCase()];
    const baselineEF = req.body.baselineEF || (countryData?.ef ?? 0.5);

    const project = await prisma.project.create({
      data: {
        name, description, type, country,
        countryCode: countryCode.toUpperCase(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        installedMW: parseFloat(installedMW),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        baselineEF: parseFloat(baselineEF),
        standard: standard || 'Verra VCS',
        userId: req.user.userId,
      }
    });

    res.status(201).json(project);
  } catch (e) { next(e); }
});

// PUT /api/projects/:id
router.put('/:id', auth, rules.project.map(r => r.optional()), validate, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });
    const canAccess = req.user.role === 'SUPER_ADMIN' || 
      project.userId === req.user.userId ||
      (req.user.organizationId && project.user?.organizationId === req.user.organizationId) ||
      req.user.role === 'ADMIN';
    if (!canAccess) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        installedMW: req.body.installedMW ? parseFloat(req.body.installedMW) : undefined,
        baselineEF: req.body.baselineEF ? parseFloat(req.body.baselineEF) : undefined,
      }
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// GET /api/projects/countries/supported
router.get('/meta/countries', auth, (req, res) => {
  const countries = Object.entries(AFRICAN_GRID_EMISSION_FACTORS).map(([code, data]) => ({
    code, ...data,
  }));
  res.json(countries);
});

module.exports = router;

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

// DELETE /api/projects/:id — Supprimer un projet (cascade)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const canDelete = req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'ADMIN' ||
      project.userId === req.user.userId;
    if (!canDelete) return res.status(403).json({ error: 'Permission refusée' });

    // Cascade delete dans l'ordre (contraintes FK)
    await prisma.mRVRecord.deleteMany({ where: { projectId: req.params.id } });
    await prisma.energyReading.deleteMany({ where: { projectId: req.params.id } });
    await prisma.report.deleteMany({ where: { projectId: req.params.id } });
    await prisma.sDGScore.deleteMany({ where: { projectId: req.params.id } });
    await prisma.iTMORecord.deleteMany({ where: { projectId: req.params.id } });
    await prisma.satelliteReading.deleteMany({ where: { projectId: req.params.id } });
    await prisma.IoTReading.deleteMany({ where: { projectId: req.params.id } });
    await prisma.cORSIAEligibility.deleteMany({ where: { projectId: req.params.id } });
    await prisma.creditIssuance.deleteMany({ where: { projectId: req.params.id } });
    await prisma.baselineAssessment.deleteMany({ where: { projectId: req.params.id } });
    await prisma.project.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'PROJECT_DELETED', entity: 'Project', entityId: req.params.id, after: { name: project.name } }
    });

    res.json({ success: true, deleted: project.name });
  } catch (e) { next(e); }
});

// DELETE /api/projects/:id/readings/:readingId — Supprimer une lecture
router.delete('/:id/readings/:readingId', auth, async (req, res, next) => {
  try {
    const reading = await prisma.energyReading.findUnique({ where: { id: req.params.readingId } });
    if (!reading || reading.projectId !== req.params.id)
      return res.status(404).json({ error: 'Lecture introuvable' });
    await prisma.energyReading.delete({ where: { id: req.params.readingId } });
    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'READING_DELETED', entity: 'EnergyReading', entityId: req.params.readingId }
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/projects/meta/geocode/:countryCode — Coordonnées par pays
router.get('/meta/geocode/:countryCode', auth, (req, res) => {
  const COORDS = {
    CI: { lat: 5.3600,  lng: -4.0083, city: 'Abidjan' },
    KE: { lat: -1.2921, lng: 36.8219, city: 'Nairobi' },
    NG: { lat: 6.5244,  lng: 3.3792,  city: 'Lagos' },
    GH: { lat: 5.5560,  lng: -0.1969, city: 'Accra' },
    SN: { lat: 14.6937, lng: -17.4441,city: 'Dakar' },
    MA: { lat: 33.9716, lng: -6.8498, city: 'Rabat' },
    ZA: { lat: -26.2041,lng: 28.0473, city: 'Johannesburg' },
    ET: { lat: 9.0250,  lng: 38.7469, city: 'Addis Abeba' },
    TZ: { lat: -6.7924, lng: 39.2083, city: 'Dar es Salaam' },
    UG: { lat: 0.3476,  lng: 32.5825, city: 'Kampala' },
    RW: { lat: -1.9441, lng: 30.0619, city: 'Kigali' },
    MZ: { lat: -25.9692,lng: 32.5732, city: 'Maputo' },
    ZM: { lat: -15.4167,lng: 28.2833, city: 'Lusaka' },
    TG: { lat: 6.1375,  lng: 1.2123,  city: 'Lomé' },
    BJ: { lat: 6.3654,  lng: 2.4183,  city: 'Cotonou' },
    BF: { lat: 12.3647, lng: -1.5354, city: 'Ouagadougou' },
    ML: { lat: 12.6392, lng: -8.0029, city: 'Bamako' },
    CM: { lat: 3.8480,  lng: 11.5021, city: 'Yaoundé' },
    CD: { lat: -4.3276, lng: 15.3136, city: 'Kinshasa' },
    MG: { lat: -18.9137,lng: 47.5361, city: 'Antananarivo' },
  };
  const coords = COORDS[req.params.countryCode.toUpperCase()];
  if (!coords) return res.status(404).json({ error: 'Pays non référencé' });
  res.json(coords);
});

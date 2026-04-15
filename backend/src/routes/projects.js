const router = require('express').Router();
const { validate, rules } = require('../middleware/validate');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
// plan-limits checks are inlined in the POST handler
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
router.post('/', auth, requirePermission('projects.create'), [
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

    // ─── Vérification limite de plan ──────────────────────────────────────
    if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
      try {
        const { checkProjectLimit, checkMWLimit } = require('../services/plan-limits.service');
        const uid = req.user.userId;
        const newMW = parseFloat(req.body.installedMW) || 0;

        const projCheck = await checkProjectLimit(uid);
        if (!projCheck.allowed) {
          return res.status(402).json({
            error: 'Limite de projets atteinte (' + projCheck.current + '/' + projCheck.max + ') — Plan ' + projCheck.plan,
            code: 'PLAN_PROJECT_LIMIT',
            current: projCheck.current,
            max: projCheck.max,
            currentPlan: projCheck.plan,
            requiredPlan: projCheck.required,
            upgradeUrl: '/dashboard/settings',
          });
        }

        if (newMW > 0) {
          const mwCheck = await checkMWLimit(uid, newMW);
          if (!mwCheck.allowed) {
            return res.status(402).json({
              error: 'Limite MW atteinte (' + mwCheck.currentMW + '+' + newMW + '/' + mwCheck.maxMW + ' MW) — Plan ' + mwCheck.plan,
              code: 'PLAN_MW_LIMIT',
              currentMW: mwCheck.currentMW,
              newMW,
              max: mwCheck.maxMW,
              currentPlan: mwCheck.plan,
              requiredPlan: mwCheck.required,
              upgradeUrl: '/dashboard/settings',
            });
          }
        }
      } catch (limitErr) {
        console.error('[PlanCheck] Error:', limitErr.message);
        // Non-fatal: si le check échoue, on laisse passer (et on log)
      }
    }

    const { name, description, type, country, countryCode, latitude, longitude,
            installedMW, startDate, endDate, standard } = req.body;

    // Récupère facteur d'émission du pays automatiquement
    const countryData = AFRICAN_GRID_EMISSION_FACTORS[countryCode.toUpperCase()];
    const baselineEF = req.body.baselineEF || (countryData?.ef ?? 0.5);

    const createData = {
      name,
      description: description || null,
      type,
      country,
      countryCode: countryCode.toUpperCase(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      installedMW: parseFloat(installedMW),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      baselineEF: parseFloat(baselineEF),
      standard: standard || 'Verra VCS',
      userId: req.user.userId,
    };
    // Lier à l'organisation si l'utilisateur en a une
    if (req.user.organizationId) {
      createData.organizationId = req.user.organizationId;
    }
    const project = await prisma.project.create({ data: createData });

    res.status(201).json(project);
  } catch (e) { next(e); }
});

// PUT /api/projects/:id
router.put('/:id', auth, requirePermission('projects.update'), rules.project.map(r => r.optional()), validate, async (req, res, next) => {
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
router.delete('/:id', auth, requirePermission('projects.delete'), async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const canDelete = req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'ADMIN' ||
      project.userId === req.user.userId;
    if (!canDelete) return res.status(403).json({ error: 'Permission refusée' });

    const pid = req.params.id;
    // Cascade delete complet — toutes les FK vers Project
    const dels = [
      prisma.mRVRecord.deleteMany({ where: { projectId: pid } }),
      prisma.energyReading.deleteMany({ where: { projectId: pid } }),
      prisma.report.deleteMany({ where: { projectId: pid } }),
      prisma.sDGScore.deleteMany({ where: { projectId: pid } }),
      prisma.iTMORecord.deleteMany({ where: { projectId: pid } }),
      prisma.satelliteReading.deleteMany({ where: { projectId: pid } }),
      prisma.IoTReading.deleteMany({ where: { projectId: pid } }),
      prisma.cORSIAEligibility.deleteMany({ where: { projectId: pid } }),
      prisma.creditIssuance.deleteMany({ where: { projectId: pid } }),
      prisma.baselineAssessment.deleteMany({ where: { projectId: pid } }),
      prisma.projectCertification.deleteMany({ where: { projectId: pid } }).catch(()=>{}),
      prisma.forwardContract.deleteMany({ where: { projectId: pid } }).catch(()=>{}),
    ];
    // CreditPipeline a PipelineStep et PipelineDocument en cascade
    const pipelines = await prisma.creditPipeline.findMany({ where: { projectId: pid }, select: { id: true } });
    for (const p of pipelines) {
      await prisma.pipelineDocument.deleteMany({ where: { pipelineId: p.id } }).catch(()=>{});
      await prisma.pipelineStep.deleteMany({ where: { pipelineId: p.id } }).catch(()=>{});
    }
    await prisma.creditPipeline.deleteMany({ where: { projectId: pid } }).catch(()=>{});
    // GHG Audit entries
    const ghgAudits = await prisma.gHGAudit.findMany({ where: { projectId: pid }, select: { id: true } }).catch(()=>[]);
    for (const a of ghgAudits) {
      await prisma.gHGEntry.deleteMany({ where: { auditId: a.id } }).catch(()=>{});
      await prisma.gHGReport.deleteMany({ where: { auditId: a.id } }).catch(()=>{});
    }
    await prisma.gHGAudit.deleteMany({ where: { projectId: pid } }).catch(()=>{});
    // AuditLog (non-critique, peut être gardé)
    await Promise.allSettled(dels);
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
    // AFRIQUE DE L'OUEST
    CI: { lat: 5.3600,  lng: -4.0083,  city: 'Abidjan' },
    GH: { lat: 5.5560,  lng: -0.1969,  city: 'Accra' },
    NG: { lat: 6.4541,  lng: 3.3947,   city: 'Lagos' },
    SN: { lat: 14.7167, lng: -17.4677, city: 'Dakar' },
    ML: { lat: 12.6500, lng: -8.0000,  city: 'Bamako' },
    BF: { lat: 12.3647, lng: -1.5332,  city: 'Ouagadougou' },
    TG: { lat: 6.1375,  lng: 1.2123,   city: 'Lomé' },
    BJ: { lat: 6.3654,  lng: 2.4183,   city: 'Cotonou' },
    NE: { lat: 13.5117, lng: 2.1251,   city: 'Niamey' },
    GN: { lat: 9.5370,  lng: -13.6773, city: 'Conakry' },
    GM: { lat: 13.4549, lng: -16.5790, city: 'Banjul' },
    GW: { lat: 11.8636, lng: -15.5977, city: 'Bissau' },
    SL: { lat: 8.4657,  lng: -13.2317, city: 'Freetown' },
    LR: { lat: 6.3106,  lng: -10.8047, city: 'Monrovia' },
    MR: { lat: 18.0783, lng: -15.9652, city: 'Nouakchott' },
    CV: { lat: 14.9305, lng: -23.5133, city: 'Praia' },
    // AFRIQUE CENTRALE
    CM: { lat: 3.8480,  lng: 11.5021,  city: 'Yaoundé' },
    CD: { lat: -4.3317, lng: 15.3314,  city: 'Kinshasa' },
    CG: { lat: -4.2661, lng: 15.2832,  city: 'Brazzaville' },
    GA: { lat: 0.3854,  lng: 9.4536,   city: 'Libreville' },
    GQ: { lat: 3.7523,  lng: 8.7741,   city: 'Malabo' },
    CF: { lat: 4.3612,  lng: 18.5550,  city: 'Bangui' },
    TD: { lat: 12.1048, lng: 15.0445,  city: "N'Djamena" },
    // AFRIQUE DE L'EST
    KE: { lat: -1.2921, lng: 36.8219,  city: 'Nairobi' },
    TZ: { lat: -6.7924, lng: 39.2083,  city: 'Dar es Salaam' },
    ET: { lat: 9.0054,  lng: 38.7636,  city: 'Addis-Abeba' },
    RW: { lat: -1.9441, lng: 30.0619,  city: 'Kigali' },
    UG: { lat: 0.3136,  lng: 32.5811,  city: 'Kampala' },
    MZ: { lat: -25.9692,lng: 32.5732,  city: 'Maputo' },
    MG: { lat: -18.9137,lng: 47.5361,  city: 'Antananarivo' },
    ZW: { lat: -17.8252,lng: 31.0335,  city: 'Harare' },
    MW: { lat: -13.9669,lng: 33.7873,  city: 'Lilongwe' },
    BI: { lat: -3.3731, lng: 29.3644,  city: 'Bujumbura' },
    SO: { lat: 2.0469,  lng: 45.3182,  city: 'Mogadiscio' },
    DJ: { lat: 11.5806, lng: 43.1450,  city: 'Djibouti' },
    ER: { lat: 15.3389, lng: 38.9318,  city: 'Asmara' },
    SS: { lat: 4.8594,  lng: 31.5713,  city: 'Djouba' },
    SD: { lat: 15.5007, lng: 32.5599,  city: 'Khartoum' },
    SC: { lat: -4.6796, lng: 55.4920,  city: 'Victoria' },
    MU: { lat: -20.1609,lng: 57.4977,  city: 'Port Louis' },
    KM: { lat: -11.7022,lng: 43.2551,  city: 'Moroni' },
    // AFRIQUE AUSTRALE
    ZA: { lat: -26.2041,lng: 28.0473,  city: 'Johannesburg' },
    ZM: { lat: -15.4166,lng: 28.2833,  city: 'Lusaka' },
    NA: { lat: -22.5597,lng: 17.0832,  city: 'Windhoek' },
    BW: { lat: -24.6282,lng: 25.9231,  city: 'Gaborone' },
    SZ: { lat: -26.3186,lng: 31.1410,  city: 'Mbabane' },
    LS: { lat: -29.3142,lng: 27.4833,  city: 'Maseru' },
    AO: { lat: -8.8368, lng: 13.2343,  city: 'Luanda' },
    // AFRIQUE DU NORD
    MA: { lat: 33.9716, lng: -6.8498,  city: 'Rabat' },
    EG: { lat: 30.0444, lng: 31.2357,  city: 'Le Caire' },
    DZ: { lat: 36.7372, lng: 3.0865,   city: 'Alger' },
    TN: { lat: 36.8065, lng: 10.1815,  city: 'Tunis' },
    LY: { lat: 32.9020, lng: 13.1800,  city: 'Tripoli' },
  };
  const coords = COORDS[req.params.countryCode.toUpperCase()];
  if (!coords) return res.status(404).json({ error: 'Pays non référencé' });
  res.json(coords);
});

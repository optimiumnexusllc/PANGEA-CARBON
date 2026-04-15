const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const { MRVEngine } = require('../services/mrv.service');
const { generateMRVReport } = require('../services/pdf.service');
const prisma = new PrismaClient();

// GET /api/reports — liste des rapports générés
router.get('/', auth, async (req, res, next) => {
  try {
    const where = req.user.role !== 'ADMIN' ? { project: { userId: req.user.userId } } : {};
    const records = await prisma.mRVRecord.findMany({
      where,
      include: { project: { select: { name: true, type: true, countryCode: true, installedMW: true, country: true } } },
      orderBy: [{ year: 'desc' }, { netCarbonCredits: 'desc' }],
    });
    res.json(records);
  } catch (e) { next(e); }
});

// GET /api/reports/history — liste des PDFs générés
router.get('/history', auth, async (req, res, next) => {
  try {
    const where = !['SUPER_ADMIN','ADMIN','ORG_OWNER'].includes(req.user.role)
      ? { userId: req.user.userId }
      : req.user.organizationId
        ? { project: { organizationId: req.user.organizationId } }
        : {};

    const reports = await prisma.report.findMany({
      where,
      include: { project: { select: { name:true, countryCode:true, type:true } } },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });
    res.json(reports);
  } catch (e) { next(e); }
});

// GET /api/reports/:projectId/:year/pdf — Génère et télécharge le PDF MRV
router.get('/:projectId/:year/pdf', auth, async (req, res, next) => {
  try {
    const { projectId, year } = req.params;
    const yr = parseInt(year);
    const lang = req.query.lang === 'fr' ? 'fr' : 'en';
    const standardId = req.query.standard || 'VERRA_VCS';
    const VALID_STANDARDS = ['VERRA_VCS','GOLD_STANDARD','ARTICLE6','CDM','ACR','CAR','CORSIA','VCMI','PLAN_VIVO'];
    const std = VALID_STANDARDS.includes(standardId) ? standardId : 'VERRA_VCS';

    // Charger projet
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    // Charger lectures
    const readings = await prisma.energyReading.findMany({
      where: {
        projectId,
        periodStart: { gte: new Date(yr+'-01-01') },
        periodEnd: { lte: new Date(yr+'-12-31') },
      },
      orderBy: { periodStart: 'asc' },
    });

    if (readings.length === 0) {
      return res.status(404).json({ error: 'Aucune donnée de production pour '+yr });
    }

    // Calcul MRV
    const mrvData = MRVEngine.calculateAnnual(readings, project);
    mrvData.year = yr;

    // Générer PDF avec lang + standard
    const pdfBuffer = await generateMRVReport(project, mrvData, readings, lang, std);

    // Créer record rapport (clé unique par projet+année+standard+lang)
    const reportKey = projectId+'-'+yr+'-'+std+'-'+lang;
    await prisma.report.upsert({
      where: { id: reportKey },
      update: { status: 'READY', generatedAt: new Date(), fileSize: pdfBuffer.length },
      create: {
        id: reportKey,
        projectId,
        userId: req.user.userId,
        type: 'ANNUAL_MRV_'+std+'_'+lang.toUpperCase(),
        year: yr,
        status: 'READY',
        generatedAt: new Date(),
        fileSize: pdfBuffer.length,
      },
    }).catch(()=>{});

    // Envoi PDF
    const filename = 'PANGEA-CARBON_MRV_'+std+'_'+(project.countryCode||'AF')+'_'+yr+'_'+lang.toUpperCase()+'.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="'+filename+'"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (e) { next(e); }
});

// GET /api/reports/:projectId/:year/preview — Preview JSON des données MRV
router.get('/:projectId/:year/preview', auth, async (req, res, next) => {
  try {
    const { projectId, year } = req.params;
    const yr = parseInt(year);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const readings = await prisma.energyReading.findMany({
      where: { projectId, periodStart: { gte: new Date(`${yr}-01-01`) }, periodEnd: { lte: new Date(`${yr}-12-31`) } },
      orderBy: { periodStart: 'asc' },
    });
    if (!readings.length) return res.status(404).json({ error: 'Pas de données' });
    const mrv = MRVEngine.calculateAnnual(readings, project);
    mrv.year = yr;
    res.json({ project, mrv, readingsCount: readings.length });
  } catch (e) { next(e); }
});


// DELETE /api/reports/:id — Supprimer un rapport généré
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Rapport introuvable' });

    // Vérifier les droits
    const canDelete = ['SUPER_ADMIN','ADMIN','ORG_OWNER'].includes(req.user.role) ||
                      report.userId === req.user.userId;
    if (!canDelete) return res.status(403).json({ error: 'Permission refusée' });

    await prisma.report.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({ data: {
      userId: req.user.userId, action: 'REPORT_DELETED', entity: 'Report',
      entityId: req.params.id, before: { type: report.type, year: report.year },
    }}).catch(()=>{});

    res.json({ success: true, deleted: req.params.id });
  } catch (e) { next(e); }
});

module.exports = router;

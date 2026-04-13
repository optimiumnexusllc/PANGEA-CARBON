const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
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

// GET /api/reports/:projectId/:year/pdf — Génère et télécharge le PDF MRV
router.get('/:projectId/:year/pdf', auth, async (req, res, next) => {
  try {
    const { projectId, year } = req.params;
    const yr = parseInt(year);

    // Charger projet
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    // Charger lectures
    const readings = await prisma.energyReading.findMany({
      where: {
        projectId,
        periodStart: { gte: new Date(`${yr}-01-01`) },
        periodEnd: { lte: new Date(`${yr}-12-31`) },
      },
      orderBy: { periodStart: 'asc' },
    });

    if (readings.length === 0) {
      return res.status(404).json({ error: `Aucune donnée de production pour ${yr}` });
    }

    // Calcul MRV
    const mrvData = MRVEngine.calculateAnnual(readings, project);
    mrvData.year = yr;

    // Générer PDF
    const pdfBuffer = await generateMRVReport(project, mrvData, readings);

    // Créer record rapport
    await prisma.report.upsert({
      where: { id: `${projectId}-${yr}` },
      update: { status: 'READY', generatedAt: new Date(), fileSize: pdfBuffer.length },
      create: {
        id: `${projectId}-${yr}`,
        projectId,
        userId: req.user.userId,
        type: 'ANNUAL_MRV',
        year: yr,
        status: 'READY',
        generatedAt: new Date(),
        fileSize: pdfBuffer.length,
      },
    });

    // Envoi PDF
    const filename = `PANGEA-CARBON_MRV_${project.countryCode}_${yr}_${projectId.slice(-6).toUpperCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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

module.exports = router;

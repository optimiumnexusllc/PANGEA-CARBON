const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/dashboard/stats - KPIs globaux
router.get('/stats', auth, async (req, res, next) => {
  try {
    const userId = req.user.role !== 'ADMIN' ? req.user.userId : undefined;
    const where = userId ? { userId } : {};

    const [
      totalProjects,
      projectsByStatus,
      projectsByType,
      latestMRV,
      totalReadings,
    ] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.groupBy({ by: ['status'], where, _count: true }),
      prisma.project.groupBy({ by: ['type'], where, _count: true }),
      prisma.mRVRecord.aggregate({
        where: userId ? { project: { userId } } : {},
        _sum: { netCarbonCredits: true, revenueUSD: true, totalEnergyMWh: true },
      }),
      prisma.energyReading.count({ where: userId ? { project: { userId } } : {} }),
    ]);

    // MW total installé
    const mwAgg = await prisma.project.aggregate({ where, _sum: { installedMW: true } });

    // Timeline sur 12 mois
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const timeline = await prisma.energyReading.groupBy({
      by: ['periodStart'],
      where: {
        ...(userId ? { project: { userId } } : {}),
        periodStart: { gte: twelveMonthsAgo }
      },
      _sum: { energyMWh: true },
      orderBy: { periodStart: 'asc' },
    });

    // Répartition géographique
    const byCountry = await prisma.mRVRecord.groupBy({
      by: ['projectId'],
      where: userId ? { project: { userId } } : {},
      _sum: { netCarbonCredits: true, revenueUSD: true },
    });

    res.json({
      overview: {
        totalProjects,
        totalInstalledMW: mwAgg._sum.installedMW || 0,
        totalCarbonCredits: latestMRV._sum.netCarbonCredits || 0,
        totalRevenueUSD: latestMRV._sum.revenueUSD || 0,
        totalEnergyMWh: latestMRV._sum.totalEnergyMWh || 0,
        totalReadings,
      },
      projectsByStatus: projectsByStatus.map(p => ({ status: p.status, count: p._count })),
      projectsByType: projectsByType.map(p => ({ type: p.type, count: p._count })),
      timeline: timeline.map(t => ({
        period: t.periodStart,
        energyMWh: t._sum.energyMWh || 0,
      })),
    });
  } catch (e) { next(e); }
});

// GET /api/dashboard/leaderboard - Top projets par crédits
router.get('/leaderboard', auth, async (req, res, next) => {
  try {
    const records = await prisma.mRVRecord.findMany({
      include: { project: { select: { name: true, type: true, countryCode: true, installedMW: true } } },
      orderBy: { netCarbonCredits: 'desc' },
      take: 10,
    });

    res.json(records.map(r => ({
      projectId: r.projectId,
      projectName: r.project.name,
      type: r.project.type,
      countryCode: r.project.countryCode,
      installedMW: r.project.installedMW,
      year: r.year,
      carbonCredits: r.netCarbonCredits,
      revenueUSD: r.revenueUSD,
    })));
  } catch (e) { next(e); }
});

module.exports = router;

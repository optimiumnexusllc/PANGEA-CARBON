/**
 * PANGEA CARBON — Gold Standard SDG Impact Scoring
 * 17 Sustainable Development Goals measurement
 * Calcule le premium de prix basé sur les co-bénéfices
 */
const router = require('express').Router();
const { validate, rules } = require('../middleware/validate');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Pondération SDG par type de projet renouvelable (Gold Standard framework)
const SDG_WEIGHTS = {
  SOLAR:  { sdg7:3, sdg8:2, sdg13:3, sdg1:1, sdg10:1, sdg11:1, sdg5:0.5, sdg3:0.5, sdg4:0.5 },
  WIND:   { sdg7:3, sdg8:2, sdg13:3, sdg14:0.5, sdg15:0.5, sdg11:1, sdg9:1 },
  HYDRO:  { sdg7:3, sdg6:2, sdg13:2, sdg8:1, sdg15:1, sdg2:1, sdg3:0.5 },
  BIOMASS:{ sdg7:2, sdg8:2, sdg13:2, sdg2:1, sdg15:1, sdg12:1, sdg1:1 },
  HYBRID: { sdg7:3, sdg8:2, sdg13:3, sdg9:1, sdg11:1, sdg1:0.5 },
};

// SDG labels complets
const SDG_META = {
  sdg1: { name: 'Pas de pauvreté', emoji: '🏘️', maxPoints: 10 },
  sdg2: { name: 'Faim zéro', emoji: '🌾', maxPoints: 10 },
  sdg3: { name: 'Bonne santé', emoji: '💊', maxPoints: 10 },
  sdg4: { name: 'Éducation de qualité', emoji: '📚', maxPoints: 10 },
  sdg5: { name: 'Égalité des sexes', emoji: '♀️', maxPoints: 10 },
  sdg6: { name: 'Eau propre', emoji: '💧', maxPoints: 10 },
  sdg7: { name: 'Énergie propre', emoji: '⚡', maxPoints: 10 },
  sdg8: { name: 'Travail décent', emoji: '💼', maxPoints: 10 },
  sdg9: { name: 'Innovation', emoji: '🏭', maxPoints: 10 },
  sdg10: { name: 'Inégalités réduites', emoji: '⚖️', maxPoints: 10 },
  sdg11: { name: 'Villes durables', emoji: '🏙️', maxPoints: 10 },
  sdg12: { name: 'Consommation responsable', emoji: '♻️', maxPoints: 10 },
  sdg13: { name: 'Action climatique', emoji: '🌍', maxPoints: 10 },
  sdg14: { name: 'Vie aquatique', emoji: '🐠', maxPoints: 10 },
  sdg15: { name: 'Vie terrestre', emoji: '🌲', maxPoints: 10 },
  sdg16: { name: 'Paix & Justice', emoji: '⚖️', maxPoints: 10 },
  sdg17: { name: 'Partenariats', emoji: '🤝', maxPoints: 10 },
};

function calculatePremium(totalScore, gsStarRating) {
  // Gold Standard price premium based on SDG impact score
  if (gsStarRating >= 5) return 18; // $18/tCO2e premium
  if (gsStarRating >= 4) return 12;
  if (gsStarRating >= 3) return 8;
  if (gsStarRating >= 2) return 5;
  if (totalScore >= 50) return 3;
  return 0;
}

function calculateStarRating(totalScore, sdgData, projectType) {
  const weights = SDG_WEIGHTS[projectType] || SDG_WEIGHTS.SOLAR;
  const weightedSdgs = Object.keys(weights).filter(k => sdgData[k] >= 7).length;
  if (totalScore >= 80 && weightedSdgs >= 5) return 5;
  if (totalScore >= 65 && weightedSdgs >= 4) return 4;
  if (totalScore >= 50 && weightedSdgs >= 3) return 3;
  if (totalScore >= 35) return 2;
  if (totalScore >= 20) return 1;
  return 0;
}

// POST /api/sdg/score — Calculer score SDG d'un projet
router.post('/score', auth, rules.sdgScore, validate, async (req, res, next) => {
  try {
    const { projectId, year, sdgInputs, jobsCreated, householdsElectrified } = req.body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const weights = SDG_WEIGHTS[project.type] || SDG_WEIGHTS.SOLAR;

    // Calcul du score pondéré
    let totalScore = 0;
    const sdgData = {};
    for (let i = 1; i <= 17; i++) {
      const key = `sdg${i}`;
      const rawScore = parseFloat(sdgInputs?.[key] || 0);
      const weight = weights[key] || 0;
      sdgData[key] = rawScore;
      totalScore += rawScore * (weight > 0 ? weight : 0.2);
    }
    totalScore = Math.min(100, totalScore);
    const gsStarRating = calculateStarRating(totalScore, sdgData, project.type);
    const premiumUSD = calculatePremium(totalScore, gsStarRating);

    const score = await prisma.sDGScore.upsert({
      where: { projectId_year: { projectId, year: parseInt(year) } },
      update: { ...sdgData, totalScore, premiumUSD, gsStarRating, jobsCreated: parseInt(jobsCreated || 0), householdsElectrified: parseInt(householdsElectrified || 0) },
      create: { projectId, year: parseInt(year), ...sdgData, totalScore, premiumUSD, gsStarRating, jobsCreated: parseInt(jobsCreated || 0), householdsElectrified: parseInt(householdsElectrified || 0) }
    });

    res.json({ score, gsStarRating, totalScore, premiumUSD, sdgMeta: SDG_META });
  } catch (e) { next(e); }
});

// GET /api/sdg/:projectId — Score SDG d'un projet
router.get('/:projectId', auth, async (req, res, next) => {
  try {
    const { year } = req.query;
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    const scores = await prisma.sDGScore.findMany({
      where: { projectId: req.params.projectId, ...(year && { year: parseInt(year as string) }) },
      orderBy: { year: 'desc' }
    });

    const weights = SDG_WEIGHTS[project?.type || 'SOLAR'];
    const mrvData = await prisma.mRVRecord.findFirst({ where: { projectId: req.params.projectId }, orderBy: { year: 'desc' } });

    const latestScore = scores[0];
    const premiumRevenue = latestScore && mrvData
      ? mrvData.netCarbonCredits * latestScore.premiumUSD
      : 0;

    res.json({
      project,
      scores,
      latestScore,
      sdgMeta: SDG_META,
      weights,
      premiumRevenue,
      gsLabel: latestScore ? `Gold Standard ${latestScore.gsStarRating}★` : 'Non évalué',
    });
  } catch (e) { next(e); }
});

// GET /api/sdg/portfolio/summary — Résumé SDG du portfolio
router.get('/portfolio/summary', auth, async (req, res, next) => {
  try {
    const scores = await prisma.sDGScore.findMany({
      where: { project: { userId: req.user.userId } },
      include: { project: { select: { name: true, type: true, countryCode: true } } },
      orderBy: [{ gsStarRating: 'desc' }, { totalScore: 'desc' }]
    });

    const mrvTotal = await prisma.mRVRecord.aggregate({
      where: { project: { userId: req.user.userId } },
      _sum: { netCarbonCredits: true }
    });

    const avgPremium = scores.length ? scores.reduce((s, r) => s + r.premiumUSD, 0) / scores.length : 0;
    const totalPremiumRevenue = (mrvTotal._sum.netCarbonCredits || 0) * avgPremium;
    const totalJobsCreated = scores.reduce((s, r) => s + r.jobsCreated, 0);
    const totalHouseholds = scores.reduce((s, r) => s + r.householdsElectrified, 0);

    res.json({
      scores,
      summary: {
        totalProjects: scores.length,
        avgGsStarRating: scores.length ? scores.reduce((s, r) => s + r.gsStarRating, 0) / scores.length : 0,
        avgPremiumUSD: parseFloat(avgPremium.toFixed(2)),
        totalPremiumRevenue: Math.round(totalPremiumRevenue),
        totalJobsCreated,
        totalHouseholdsElectrified: totalHouseholds,
      },
      sdgMeta: SDG_META,
    });
  } catch (e) { next(e); }
});

module.exports = router;

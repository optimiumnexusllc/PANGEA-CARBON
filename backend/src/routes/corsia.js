/**
 * PANGEA CARBON — CORSIA Eligibility Checker
 * Carbon Offsetting and Reduction Scheme for International Aviation
 * ICAO Standards + Verra/Gold Standard approved methodologies
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

const CORSIA_REQUIREMENTS = [
  { id: 'additionality', name: 'Additionnalité', weight: 25, desc: 'Le projet n\'aurait pas eu lieu sans le financement carbone' },
  { id: 'permanence', name: 'Permanence', weight: 20, desc: 'Réductions permanentes ou compensées si perte' },
  { id: 'quantification', name: 'Quantification robuste', weight: 20, desc: 'MRV certifiable par des méthodes reconnues' },
  { id: 'no_double_counting', name: 'Pas de double comptage', weight: 20, desc: 'Ajustement correspondant Article 6 ou engagement unilatéral' },
  { id: 'sustainable_dev', name: 'Développement durable', weight: 10, desc: 'Contributions positives aux SDG' },
  { id: 'transparency', name: 'Transparence', weight: 5, desc: 'Données publiquement accessibles et vérifiables' },
];

const APPROVED_STANDARDS = ['Verra VCS', 'Gold Standard', 'American Carbon Registry', 'Climate Action Reserve'];
const ELIGIBLE_PROJECT_TYPES = ['SOLAR', 'WIND', 'HYDRO', 'BIOMASS'];

function calculateCorsiaScore(project, mrvRecord, sdgScore) {
  const checks = {
    additionality: project.startDate && new Date(project.startDate) > new Date('2016-01-01') ? 100 : 60,
    permanence: ['SOLAR', 'WIND', 'HYDRO'].includes(project.type) ? 100 : 70,
    quantification: mrvRecord ? 90 : 40,
    no_double_counting: APPROVED_STANDARDS.includes(project.standard) ? 80 : 40,
    sustainable_dev: sdgScore ? Math.min(100, sdgScore.totalScore * 1.2) : 50,
    transparency: mrvRecord ? 85 : 30,
  };

  const totalScore = CORSIA_REQUIREMENTS.reduce((sum, req) => {
    return sum + (checks[req.id] || 0) * req.weight / 100;
  }, 0);

  const eligible = totalScore >= 70 && checks.quantification >= 60 && checks.no_double_counting >= 60;
  const failures = CORSIA_REQUIREMENTS
    .filter(r => (checks[r.id] || 0) < 60)
    .map(r => `${r.name}: score insuffisant (${checks[r.id] || 0}/100)`);

  const baseCorsiaPrice = 18; // $/tCO2e CORSIA floor price 2024-2026
  const premiumForScore = totalScore >= 85 ? 8 : totalScore >= 75 ? 4 : 0;
  const estimatedPremium = eligible ? baseCorsiaPrice + premiumForScore - 12 : 0; // vs Verra $12

  return { checks, totalScore: parseFloat(totalScore.toFixed(1)), eligible, failures, estimatedPremium, corsiaPhase: 'PHASE_1_2024_2026' };
}

// GET /api/corsia/check/:projectId — Vérifier éligibilité
router.get('/check/:projectId', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const [mrvRecord, sdgScore, existingCheck] = await Promise.all([
      prisma.mRVRecord.findFirst({ where: { projectId: project.id }, orderBy: { year: 'desc' } }),
      prisma.sDGScore.findFirst({ where: { projectId: project.id }, orderBy: { year: 'desc' } }),
      prisma.cORSIAEligibility.findUnique({ where: { projectId: project.id } }),
    ]);

    const analysis = calculateCorsiaScore(project, mrvRecord, sdgScore);
    const estimatedPremiumRevenue = mrvRecord ? mrvRecord.netCarbonCredits * analysis.estimatedPremium : 0;

    const record = await prisma.cORSIAEligibility.upsert({
      where: { projectId: project.id },
      update: {
        eligible: analysis.eligible, eligibilityScore: analysis.totalScore,
        phase: analysis.corsiaPhase, verraApproved: APPROVED_STANDARDS.includes(project.standard),
        additionalityMet: analysis.checks.additionality >= 70,
        permanenceMet: analysis.checks.permanence >= 70,
        noDoubleCounting: analysis.checks.no_double_counting >= 70,
        failureReasons: analysis.failures,
        estimatedPremiumUSD: analysis.estimatedPremium,
        lastChecked: new Date(),
      },
      create: {
        projectId: project.id, eligible: analysis.eligible, eligibilityScore: analysis.totalScore,
        phase: analysis.corsiaPhase, verraApproved: APPROVED_STANDARDS.includes(project.standard),
        additionalityMet: analysis.checks.additionality >= 70,
        permanenceMet: analysis.checks.permanence >= 70,
        noDoubleCounting: analysis.checks.no_double_counting >= 70,
        failureReasons: analysis.failures,
        estimatedPremiumUSD: analysis.estimatedPremium,
      }
    });

    res.json({
      project: { id: project.id, name: project.name, type: project.type, standard: project.standard },
      analysis, record, requirements: CORSIA_REQUIREMENTS,
      estimatedPremiumRevenue: Math.round(estimatedPremiumRevenue),
      marketContext: {
        corsiaCurrentPrice: 18, verraCurrentPrice: 12,
        premiumerTonne: analysis.estimatedPremium,
        totalAviationDemand: '2B+ tCO2e cumulative 2021-2035',
        africanOpportunity: '$400M+ annual market',
      }
    });
  } catch (e) { next(e); }
});

// GET /api/corsia/portfolio — Portfolio CORSIA
router.get('/portfolio', auth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: { corsiaEligibility: true, mrvRecords: { orderBy: { year: 'desc' }, take: 1 } }
    });

    const eligible = projects.filter(p => p.corsiaEligibility?.eligible);
    const totalCredits = eligible.reduce((s, p) => s + (p.mrvRecords[0]?.netCarbonCredits || 0), 0);
    const avgPremium = eligible.reduce((s, p) => s + (p.corsiaEligibility?.estimatedPremiumUSD || 0), 0) / (eligible.length || 1);

    res.json({
      projects: projects.map(p => ({
        ...p,
        corsiaStatus: p.corsiaEligibility?.eligible ? 'ELIGIBLE' : p.corsiaEligibility ? 'NOT_ELIGIBLE' : 'NOT_CHECKED'
      })),
      summary: {
        total: projects.length, eligible: eligible.length,
        eligibleCredits: Math.round(totalCredits),
        avgPremiumUSD: parseFloat(avgPremium.toFixed(2)),
        totalPremiumRevenue: Math.round(totalCredits * avgPremium),
      }
    });
  } catch (e) { next(e); }
});

module.exports = router;

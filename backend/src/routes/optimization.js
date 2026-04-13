/**
 * PANGEA CARBON — Optimisation MRV
 * Recommandations concrètes avec impact $ calculé
 * Palantir-grade: chaque conseil a une valeur monétaire
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

const OPTIMIZATION_RULES = [
  {
    id: 'gold_standard_upgrade',
    category: 'Standard',
    title: 'Passer à Gold Standard',
    description: 'Votre projet est éligible Gold Standard SDG. Le premium moyen est de +$12/tCO₂e vs Verra.',
    effort: 'MEDIUM',
    timeToImpact: '3-6 mois',
    condition: (p, mrv, sdg) => !sdg && mrv?.netCarbonCredits > 1000,
    calculateImpact: (p, mrv) => ({ revenueGainUSD: Math.round(mrv.netCarbonCredits * 12), creditsGain: 0 }),
    priority: 1,
  },
  {
    id: 'article6_upgrade',
    category: 'Marché',
    title: 'Qualification Article 6 ITMO',
    description: 'Vos crédits pourraient se vendre $45/tCO₂e (vs $12 Verra) via des accords bilatéraux souverains.',
    effort: 'HIGH',
    timeToImpact: '6-18 mois',
    condition: (p, mrv) => mrv?.netCarbonCredits > 5000,
    calculateImpact: (p, mrv) => ({ revenueGainUSD: Math.round(mrv.netCarbonCredits * 33), creditsGain: 0 }),
    priority: 1,
  },
  {
    id: 'availability_improvement',
    category: 'Performance',
    title: 'Améliorer la disponibilité',
    description: 'Votre disponibilité moyenne est inférieure à 98%. Chaque % gagné = crédits additionnels.',
    effort: 'LOW',
    timeToImpact: '1 mois',
    condition: (p, mrv, sdg, readings) => {
      const avg = readings.length ? readings.reduce((s, r) => s + (r.availabilityPct || 98), 0) / readings.length : 98;
      return avg < 97;
    },
    calculateImpact: (p, mrv, readings) => {
      const avg = readings.length ? readings.reduce((s, r) => s + (r.availabilityPct || 98), 0) / readings.length : 98;
      const gainPct = (98 - avg) / 100;
      const creditsGain = Math.round((mrv?.netCarbonCredits || 0) * gainPct);
      return { revenueGainUSD: Math.round(creditsGain * 12), creditsGain };
    },
    priority: 2,
  },
  {
    id: 'baseline_optimization',
    category: 'Méthodologie',
    title: 'Révision du facteur d\'émission baseline',
    description: 'Le facteur d\'émission grille de votre pays a évolué. Une révision peut augmenter vos crédits.',
    effort: 'LOW',
    timeToImpact: '2-4 semaines',
    condition: (p) => p.baselineEF < 0.4,
    calculateImpact: (p, mrv) => {
      const potentialEF = p.baselineEF * 1.08;
      const additionalCredits = mrv ? (mrv.totalEnergyMWh * (potentialEF - p.baselineEF) * 0.92) : 0;
      return { revenueGainUSD: Math.round(additionalCredits * 12), creditsGain: Math.round(additionalCredits) };
    },
    priority: 2,
  },
  {
    id: 'frequency_monitoring',
    category: 'Données',
    title: 'Augmenter la fréquence de monitoring',
    description: 'Données mensuelles vs hebdomadaires: réduction de l\'incertitude MRV de 5% → 2%. Crédits nets additionnels.',
    effort: 'LOW',
    timeToImpact: 'Immédiat',
    condition: (p, mrv, sdg, readings) => readings.length < 12,
    calculateImpact: (p, mrv) => {
      const gain = mrv ? mrv.netCarbonCredits * 0.03 : 0;
      return { revenueGainUSD: Math.round(gain * 12), creditsGain: Math.round(gain) };
    },
    priority: 3,
  },
  {
    id: 'corsia_eligibility',
    category: 'Marché',
    title: 'Certification CORSIA aviation',
    description: 'Votre projet peut être éligible CORSIA. Prix garanti $18-26/tCO₂e. Demande structurelle 2024-2035.',
    effort: 'MEDIUM',
    timeToImpact: '3-6 mois',
    condition: (p, mrv) => ['SOLAR','WIND','HYDRO'].includes(p.type) && mrv?.netCarbonCredits > 2000,
    calculateImpact: (p, mrv) => ({ revenueGainUSD: Math.round((mrv?.netCarbonCredits || 0) * 8), creditsGain: 0 }),
    priority: 2,
  },
  {
    id: 'dmrv_certification',
    category: 'Vérification',
    title: 'Adopter le dMRV (vérification digitale)',
    description: 'Remplacer l\'audit annuel ($80K) par la vérification satellite continue. ROI immédiat.',
    effort: 'MEDIUM',
    timeToImpact: '2-3 mois',
    condition: () => true,
    calculateImpact: () => ({ revenueGainUSD: 80000, creditsGain: 0 }),
    priority: 2,
  },
];

const EFFORT_COLOR = { LOW: '#00FF94', MEDIUM: '#FCD34D', HIGH: '#F87171' };
const EFFORT_LABEL = { LOW: 'Facile', MEDIUM: 'Moyen', HIGH: 'Complexe' };

// GET /api/optimization/:projectId — Recommandations pour un projet
router.get('/:projectId', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        readings: { orderBy: { periodStart: 'desc' }, take: 12 },
        mrvRecords: { orderBy: { year: 'desc' }, take: 1 },
        sdgScores: { orderBy: { year: 'desc' }, take: 1 },
        corsiaEligibility: true,
      }
    });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const mrv = project.mrvRecords[0];
    const sdg = project.sdgScores[0];
    const recommendations = [];

    for (const rule of OPTIMIZATION_RULES) {
      try {
        if (rule.condition(project, mrv, sdg, project.readings)) {
          const impact = rule.calculateImpact(project, mrv, project.readings);
          recommendations.push({
            id: rule.id, category: rule.category, title: rule.title,
            description: rule.description, effort: rule.effort,
            effortColor: EFFORT_COLOR[rule.effort],
            effortLabel: EFFORT_LABEL[rule.effort],
            timeToImpact: rule.timeToImpact, priority: rule.priority,
            revenueGainUSD: impact.revenueGainUSD,
            creditsGain: impact.creditsGain,
          });
        }
      } catch (e) { /* skip failing rule */ }
    }

    recommendations.sort((a, b) => a.priority - b.priority || b.revenueGainUSD - a.revenueGainUSD);

    const totalPotentialGain = recommendations.reduce((s, r) => s + r.revenueGainUSD, 0);
    const quickWins = recommendations.filter(r => r.effort === 'LOW');
    const currentRevenue = mrv?.revenueUSD || 0;

    res.json({
      project: { id: project.id, name: project.name, type: project.type, installedMW: project.installedMW },
      recommendations,
      summary: {
        totalPotentialGain,
        currentRevenue,
        upliftPct: currentRevenue > 0 ? parseFloat((totalPotentialGain / currentRevenue * 100).toFixed(1)) : 0,
        quickWinsCount: quickWins.length,
        quickWinsGain: quickWins.reduce((s, r) => s + r.revenueGainUSD, 0),
        recommendationsCount: recommendations.length,
      }
    });
  } catch (e) { next(e); }
});

// GET /api/optimization/portfolio/gap — Gap analysis portfolio
router.get('/portfolio/gap', auth, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      include: { mrvRecords: { orderBy: { year: 'desc' }, take: 1 } }
    });

    const gaps = projects.map(p => {
      const mrv = p.mrvRecords[0];
      const currentRevenue = mrv?.revenueUSD || 0;
      const goldStandardRevenue = (mrv?.netCarbonCredits || 0) * 24;
      const article6Revenue = (mrv?.netCarbonCredits || 0) * 45;
      return {
        id: p.id, name: p.name, currentRevenue,
        goldStandardPotential: goldStandardRevenue,
        article6Potential: article6Revenue,
        gapToOptimal: article6Revenue - currentRevenue,
        optimizationScore: parseFloat(Math.min(100, currentRevenue / Math.max(1, goldStandardRevenue) * 100).toFixed(1)),
      };
    });

    res.json({ gaps, totalCurrentRevenue: gaps.reduce((s, g) => s + g.currentRevenue, 0), totalOptimalRevenue: gaps.reduce((s, g) => s + g.article6Potential, 0) });
  } catch (e) { next(e); }
});

module.exports = router;

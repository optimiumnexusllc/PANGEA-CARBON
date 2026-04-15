/**
 * PANGEA CARBON — Certification Engine
 * Génération et vérification des certifications projet
 * Tiers: VERIFIED → CERTIFIED → ELITE → ELITE_CORSIA
 */
const router = require('express').Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const prisma = new PrismaClient();

// Définition des tiers
const TIERS = {
  VERIFIED: {
    label: 'PANGEA VERIFIED',
    color: '#38BDF8',
    badge: 'Données MRV vérifiées sur la plateforme PANGEA CARBON',
    requirements: ['mrv_data', 'energy_readings'],
    validity_months: 12,
    score_min: 0,
  },
  CERTIFIED: {
    label: 'PANGEA CERTIFIED',
    color: '#00FF94',
    badge: 'Certification complète — standard reconnu + audit tiers',
    requirements: ['mrv_data', 'energy_readings', 'standard_certification', 'auditor'],
    validity_months: 24,
    score_min: 40,
  },
  ELITE: {
    label: 'PANGEA ELITE',
    color: '#A78BFA',
    badge: 'Elite — ACMI + co-bénéfices ODD documentés + standard premium',
    requirements: ['mrv_data', 'energy_readings', 'standard_certification', 'auditor', 'acmi', 'odd_score'],
    validity_months: 36,
    score_min: 70,
  },
  ELITE_CORSIA: {
    label: 'PANGEA ELITE + CORSIA',
    color: '#FCD34D',
    badge: 'Niveau maximum — éligible aviation internationale CORSIA',
    requirements: ['mrv_data', 'energy_readings', 'standard_certification', 'auditor', 'acmi', 'odd_score', 'corsia'],
    validity_months: 36,
    score_min: 85,
  },
};

const AFRICAN_STANDARDS = {
  ACMI: { label: 'ACMI', full: 'African Carbon Markets Initiative', color: '#00FF94', region: 'Africa' },
  CI_CARBON: { label: 'CI Carbon', full: 'Côte d\'Ivoire National Carbon Registry', color: '#F59E0B', region: 'CI' },
  KE_CARBON: { label: 'Kenya Carbon', full: 'Kenya Carbon Markets Framework', color: '#10B981', region: 'KE' },
  NG_CARBON: { label: 'Nigeria Carbon', full: 'Nigeria Carbon Market Initiative', color: '#3B82F6', region: 'NG' },
  GH_CARBON: { label: 'Ghana Carbon', full: 'Ghana Carbon Registry', color: '#8B5CF6', region: 'GH' },
  RW_CARBON: { label: 'Rwanda Carbon', full: 'Rwanda Green Fund Carbon', color: '#EC4899', region: 'RW' },
  SACCS: { label: 'SACCS', full: 'Southern Africa Carbon Crediting System', color: '#F97316', region: 'ZA' },
};

// Calculer le score de certification d'un projet
async function computeCertificationScore(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      energyReadings: true,
      mrvRecords: true,
      sDGScores: true,
      cORSIAEligibilities: true,
      creditIssuances: true,
    }
  });
  if (!project) return null;

  let score = 0;
  const checks = {};

  // MRV data (20 pts)
  if (project.mrvRecords.length > 0) { score += 20; checks.mrv_data = true; }
  // Energy readings (15 pts)
  if (project.energyReadings.length >= 3) { score += 15; checks.energy_readings = true; }
  // Latitude/longitude (5 pts)
  if (project.latitude && project.longitude) { score += 5; checks.gps = true; }
  // Status actif (10 pts)
  if (['ACTIVE','MONITORING','VERIFIED','CREDITED'].includes(project.status)) { score += 10; checks.active = true; }
  // Crédits émis (15 pts)
  if (project.creditIssuances.length > 0) { score += 15; checks.credits_issued = true; }
  // Score SDG/ODD (15 pts max)
  const sdg = project.sDGScores[0];
  if (sdg) { const oddPts = Math.min(15, Math.round(sdg.totalScore * 0.15)); score += oddPts; checks.odd_score = oddPts > 0; }
  // CORSIA (10 pts)
  const corsia = project.cORSIAEligibilities[0];
  if (corsia?.eligible) { score += 10; checks.corsia = true; }
  // Description complète (5 pts)
  if (project.description && project.description.length > 50) { score += 5; checks.description = true; }
  // MW installés (5 pts)
  if (project.installedMW > 0) { score += 5; checks.installed_mw = true; }

  return { score: Math.min(100, score), checks, project };
}

// Déterminer le tier selon le score + paramètres
function determineTier(score, params = {}) {
  if (score >= 85 && params.corsia && params.acmi) return 'ELITE_CORSIA';
  if (score >= 70 && params.acmi) return 'ELITE';
  if (score >= 40 && params.auditor) return 'CERTIFIED';
  if (score >= 0) return 'VERIFIED';
}

// GET /api/certification/standards/africa — Standards africains
router.get('/standards/africa', auth, (req, res) => {
  res.json({
    standards: AFRICAN_STANDARDS,
    acmi: {
      name: 'African Carbon Markets Initiative',
      founded: 2022,
      target: '300M crédits/an d\'ici 2030',
      countries: ['CI', 'KE', 'NG', 'GH', 'SN', 'ET', 'RW', 'TZ', 'UG', 'ZA', 'MZ', 'CM'],
      description: 'Initiative panafricaine lancée à COP27 pour développer les marchés carbone africains. Soutenue par 9 chefs d\'État africains et des partenaires internationaux.',
      url: 'https://acmi.africa',
      tiers: TIERS,
    }
  });
});

// GET /api/certification/tiers — Description des tiers
router.get('/tiers', auth, (req, res) => {
  res.json({ tiers: TIERS });
});

// GET /api/certification/project/:id/score — Score d'un projet
router.get('/project/:id/score', auth, async (req, res, next) => {
  try {
    const result = await computeCertificationScore(req.params.id);
    if (!result) return res.status(404).json({ error: 'Projet introuvable' });
    const { score, checks, project } = result;
    const tier = determineTier(score);
    res.json({
      score,
      tier,
      tierInfo: TIERS[tier],
      checks,
      projectName: project.name,
      canUpgrade: {
        to_certified: score >= 40,
        to_elite: score >= 70,
        to_elite_corsia: score >= 85,
      }
    });
  } catch (e) { next(e); }
});

// POST /api/certification/project/:id/issue — Émettre une certification
router.post('/project/:id/issue', auth, requirePermission('pipeline.issue_credits'), async (req, res, next) => {
  try {
    const { standards = [], acmiCompliant = false, corsiaEligible = false, auditorName, auditorUrl, oddScore } = req.body;

    const result = await computeCertificationScore(req.params.id);
    if (!result) return res.status(404).json({ error: 'Projet introuvable' });
    const { score, checks, project } = result;

    const tier = determineTier(score, { acmi: acmiCompliant, corsia: corsiaEligible, auditor: !!auditorName });
    const tierInfo = TIERS[tier];

    // Générer un hash unique SHA256
    const hashInput = `${project.id}:${project.name}:${tier}:${Date.now()}:PANGEA-CARBON`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + tierInfo.validity_months);

    // Upsert certification
    const cert = await prisma.projectCertification.upsert({
      where: { projectId: req.params.id },
      update: { tier, hash, standards, acmiCompliant, corsiaEligible, oddScore: oddScore || 0, auditorName, auditorUrl, expiresAt, revokedAt: null, issuedAt: new Date(), metadata: { score, checks } },
      create: { projectId: req.params.id, tier, hash, standards, acmiCompliant, corsiaEligible, oddScore: oddScore || 0, auditorName, auditorUrl, expiresAt, metadata: { score, checks } },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'CERTIFICATION_ISSUED', entity: 'ProjectCertification', entityId: cert.id, projectId: req.params.id, after: { tier, hash, score } }
    });

    res.json({ success: true, certification: cert, tier, tierInfo, score, hash, verifyUrl: `https://pangea-carbon.com/verify/${hash}` });
  } catch (e) { next(e); }
});

// GET /api/certification/project/:id — Récupérer la certification d'un projet
router.get('/project/:id', auth, async (req, res, next) => {
  try {
    const cert = await prisma.projectCertification.findUnique({
      where: { projectId: req.params.id },
      include: { project: { select: { name: true, type: true, country: true, installedMW: true } } }
    });
    if (!cert) return res.status(404).json({ error: 'Aucune certification' });
    const tierInfo = TIERS[cert.tier] || TIERS.VERIFIED;
    const isValid = !cert.revokedAt && new Date(cert.expiresAt) > new Date();
    res.json({ ...cert, tierInfo, isValid, verifyUrl: `https://pangea-carbon.com/verify/${cert.hash}` });
  } catch (e) { next(e); }
});

// DELETE /api/certification/project/:id/revoke — Révoquer
router.delete('/project/:id/revoke', auth, requirePermission('projects.delete'), async (req, res, next) => {
  try {
    const cert = await prisma.projectCertification.update({
      where: { projectId: req.params.id },
      data: { revokedAt: new Date() }
    });
    res.json({ success: true, revokedAt: cert.revokedAt });
  } catch (e) { next(e); }
});

// GET /api/certification/verify/:hash — VÉRIFICATION PUBLIQUE (sans auth)
router.get('/verify/:hash', async (req, res, next) => {
  try {
    const cert = await prisma.projectCertification.findUnique({
      where: { hash: req.params.hash },
      include: { project: { select: { name: true, type: true, country: true, countryCode: true, installedMW: true, status: true } } }
    });
    if (!cert) return res.status(404).json({ error: 'Certification introuvable ou invalide' });

    const tierInfo = TIERS[cert.tier] || TIERS.VERIFIED;
    const isValid = !cert.revokedAt && new Date(cert.expiresAt) > new Date();
    const isExpired = new Date(cert.expiresAt) < new Date();
    const isRevoked = !!cert.revokedAt;

    res.json({
      valid: isValid,
      status: isRevoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'VALID',
      tier: cert.tier,
      tierInfo,
      project: cert.project,
      standards: cert.standards,
      acmiCompliant: cert.acmiCompliant,
      corsiaEligible: cert.corsiaEligible,
      oddScore: cert.oddScore,
      auditorName: cert.auditorName,
      auditorUrl: cert.auditorUrl,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      revokedAt: cert.revokedAt,
      hash: cert.hash,
      verifiedBy: 'PANGEA CARBON Africa — Carbon Credit Intelligence Platform',
      verifiedAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// GET /api/certification/portfolio — Vue globale des certifications de l'org
router.get('/portfolio', auth, async (req, res, next) => {
  try {
    const certs = await prisma.projectCertification.findMany({
      include: { project: { select: { name: true, type: true, country: true, organizationId: true, userId: true } } },
      orderBy: { issuedAt: 'desc' }
    });
    const stats = { VERIFIED: 0, CERTIFIED: 0, ELITE: 0, ELITE_CORSIA: 0 };
    certs.forEach(c => { if (!c.revokedAt) stats[c.tier] = (stats[c.tier] || 0) + 1; });
    res.json({ certifications: certs, stats, total: certs.length });
  } catch (e) { next(e); }
});

module.exports = router;

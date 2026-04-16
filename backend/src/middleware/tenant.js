/**
 * PANGEA CARBON — Middleware Multi-Tenant
 * Isole les données par organisation
 * Sprint 1 — Sécurité critique
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * tenantScope — Injecte req.tenantWhere pour filtrer par org
 * Usage: router.get('/projects', auth, tenantScope, ...)
 * Puis: prisma.project.findMany({ where: { ...req.tenantWhere, ...otherFilters } })
 */
const tenantScope = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Auth requise' });

    // SUPER_ADMIN voit tout
    if (req.user.role === 'SUPER_ADMIN') {
      req.tenantWhere = {};
      req.organizationId = null;
      req.isSuperAdmin = true;
      return next();
    }

    // Résoudre l'organizationId depuis le JWT ou la DB
    let organizationId = req.user.organizationId;
    if (!organizationId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
      organizationId = user?.organizationId;
    }

    req.organizationId = organizationId;
    req.isSuperAdmin = false;

    if (organizationId) {
      // Filtre par org: tous les users de l'org voient les mêmes projets
      req.tenantWhere = { user: { organizationId } };
      req.tenantWhereProject = { user: { organizationId } };
    } else {
      // Utilisateur sans org: voit seulement ses propres données
      req.tenantWhere = { userId };
      req.tenantWhereProject = { userId };
    }

    next();
  } catch (e) {
    next(e);
  }
};

/**
 * checkFeature — Vérifie qu'une feature est activée pour cette org
 * Usage: router.post('/sdg/score', auth, checkFeature('multi_standard'), ...)
 */
const checkFeature = (featureKey) => async (req, res, next) => {
  try {
    // ADMIN et SUPER_ADMIN bypassent les feature flags
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) return next();

    const flag = await prisma.featureFlag.findUnique({ where: { key: featureKey } });

    // Si le flag n'existe pas ou est désactivé globalement
    if (!flag || !flag.enabled) {
      return res.status(403).json({
        error: `Fonctionnalité "${featureKey}" non disponible sur votre plan.`,
        upgradeRequired: true,
        feature: featureKey,
      });
    }

    // Vérifier le rollout %
    if (flag.rolloutPct < 100) {
      // Utiliser un hash de l'userId pour un rollout déterministe
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(req.user.userId).digest('hex');
      const bucket = parseInt(hash.slice(0, 2), 16) / 2.55; // 0-100
      if (bucket > flag.rolloutPct) {
        return res.status(403).json({
          error: `Fonctionnalité en cours de déploiement. Contactez le support.`,
          upgradeRequired: false,
          feature: featureKey,
        });
      }
    }

    // Vérifier OrgFeature override si l'org a des overrides
    if (req.organizationId) {
      const orgOverride = await prisma.orgFeature.findUnique({
        where: { organizationId_featureKey: { organizationId: req.organizationId, featureKey } },
      });
      if (orgOverride && !orgOverride.enabled) {
        return res.status(403).json({
          error: `Fonctionnalité désactivée pour votre organisation.`,
          upgradeRequired: true,
          feature: featureKey,
        });
      }
    }

    next();
  } catch (e) {
    console.error('[checkFeature] Erreur:', e.message);
    // Sécurité: en cas d'erreur, refuser l'accès (fail-closed)
    return res.status(503).json({ error: 'Feature check unavailable, retry later', code: 'FEATURE_CHECK_ERROR' });
  }
};

/**
 * checkPlan — Vérifie le plan de l'organisation
 * Usage: router.post('/reports/pdf', auth, checkPlan(['PRO', 'ENTERPRISE']), ...)
 */
const checkPlan = (allowedPlans) => async (req, res, next) => {
  try {
    if (['SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) return next();

    // Sans org: plan TRIAL pour ORG_OWNER, FREE pour les autres
    if (!req.organizationId) {
      const noOrgPlan = ['ORG_OWNER','ANALYST','AUDITOR'].includes(req.user?.role) ? 'TRIAL' : 'FREE';
      if (!allowedPlans.includes(noOrgPlan) && !allowedPlans.includes('FREE')) {
        return res.status(402).json({
          error: 'Plan insuffisant. Votre plan: ' + noOrgPlan + '. Requis: ' + allowedPlans.join(' ou '),
          currentPlan: noOrgPlan,
          upgradeRequired: true,
          requiredPlans: allowedPlans,
          code: 'PLAN_REQUIRED',
        });
      }
      return next();
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { plan: true, status: true }
    });

    if (!org || org.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Organisation inactive ou suspendue' });
    }

    if (!allowedPlans.includes(org.plan)) {
      return res.status(402).json({
        error: `Cette fonctionnalité requiert un plan ${allowedPlans.join(' ou ')}.`,
        currentPlan: org.plan,
        upgradeRequired: true,
        requiredPlans: allowedPlans,
      });
    }

    req.orgPlan = org.plan;
    next();
  } catch (e) {
    next(e);
  }
};

module.exports = { tenantScope, checkFeature, checkPlan };

/**
 * PANGEA CARBON — Plan Limits Service v2.0
 * Source unique de vérité pour toutes les limites numériques
 * Appliqué rigoureusement dans tous les modules
 */

// ─── DÉFINITION DES LIMITES PAR PLAN ─────────────────────────────────────────
const PLAN_LIMITS = {
  FREE:       { maxProjects:1,   maxUsers:1,  maxMW:10,    maxApiKeys:0,  canSell:false, canBuy:true,  hasPDF:false, hasAI:false },
  TRIAL:      { maxProjects:3,   maxUsers:2,  maxMW:50,    maxApiKeys:1,  canSell:false, canBuy:true,  hasPDF:false, hasAI:false },
  STARTER:    { maxProjects:5,   maxUsers:2,  maxMW:50,    maxApiKeys:3,  canSell:true,  canBuy:true,  hasPDF:true,  hasAI:false },
  PRO:        { maxProjects:999, maxUsers:10, maxMW:99999, maxApiKeys:20, canSell:true,  canBuy:true,  hasPDF:true,  hasAI:true  },
  GROWTH:     { maxProjects:50,  maxUsers:20, maxMW:5000,  maxApiKeys:10, canSell:true,  canBuy:true,  hasPDF:true,  hasAI:false },
  ENTERPRISE: { maxProjects:999, maxUsers:999,maxMW:99999, maxApiKeys:999,canSell:true,  canBuy:true,  hasPDF:true,  hasAI:true  },
  CUSTOM:     { maxProjects:999, maxUsers:999,maxMW:99999, maxApiKeys:999,canSell:true,  canBuy:true,  hasPDF:true,  hasAI:true  },
};

// Ordre des plans pour comparaison
const PLAN_ORDER = ['FREE','TRIAL','STARTER','PRO','GROWTH','ENTERPRISE','CUSTOM'];

function planTier(plan) { return PLAN_ORDER.indexOf(plan || 'FREE'); }
function nextPlan(plan) {
  const idx = PLAN_ORDER.indexOf(plan);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return 'ENTERPRISE';
  return PLAN_ORDER[idx + 1];
}

// ─── RÉSOLUTION DU PLAN EFFECTIF ─────────────────────────────────────────────
async function getUserPlanContext(userId) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: { select: { id:true, plan:true, maxProjects:true, maxUsers:true, maxMW:true, maxApiKeys:true, status:true } } }
  });

  if (!user) return { plan: 'FREE', limits: PLAN_LIMITS.FREE, hasOrg: false, orgId: null };

  // Pas d'organisation → compte FREE
  if (!user.organizationId || !user.organization) {
    return { plan: 'FREE', limits: PLAN_LIMITS.FREE, hasOrg: false, orgId: null, userId };
  }

  const org = user.organization;
  const plan = org.plan || 'TRIAL';
  const baseLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.TRIAL;

  // Les limites DB de l'org peuvent surpasser le plan (admins peuvent surclasser)
  const limits = {
    ...baseLimits,
    maxProjects: org.maxProjects || baseLimits.maxProjects,
    maxUsers:    org.maxUsers    || baseLimits.maxUsers,
    maxMW:       org.maxMW       || baseLimits.maxMW,
    maxApiKeys:  org.maxApiKeys  || baseLimits.maxApiKeys,
  };

  return { plan, limits, hasOrg: true, orgId: org.id, orgStatus: org.status, userId };
}

// ─── CHECKS ATOMIQUES ─────────────────────────────────────────────────────────

async function checkProjectLimit(userId) {
  const ctx = await getUserPlanContext(userId);
  const where = ctx.hasOrg
    ? { organizationId: ctx.orgId }
    : { userId };
  const count = await prisma.project.count({ where });
  return {
    allowed: count < ctx.limits.maxProjects,
    current: count,
    max: ctx.limits.maxProjects,
    plan: ctx.plan,
    required: nextPlan(ctx.plan),
  };
}

async function checkMWLimit(userId, newMW) {
  const ctx = await getUserPlanContext(userId);
  const where = ctx.hasOrg ? { organizationId: ctx.orgId } : { userId };
  const result = await prisma.project.aggregate({ where, _sum: { installedMW: true } });
  const currentMW = result._sum.installedMW || 0;
  return {
    allowed: (currentMW + newMW) <= ctx.limits.maxMW,
    currentMW,
    newMW,
    maxMW: ctx.limits.maxMW,
    plan: ctx.plan,
    required: nextPlan(ctx.plan),
  };
}

async function checkUserLimit(orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan:true, maxUsers:true, _count: { select: { users: true } } }
  });
  if (!org) return { allowed: false, current: 0, max: 0, plan: 'FREE' };
  const plan = org.plan || 'TRIAL';
  const max = org.maxUsers || PLAN_LIMITS[plan]?.maxUsers || 2;
  return {
    allowed: org._count.users < max,
    current: org._count.users,
    max,
    plan,
    required: nextPlan(plan),
  };
}

async function checkApiKeyLimit(userId) {
  const ctx = await getUserPlanContext(userId);
  const where = ctx.hasOrg
    ? { organizationId: ctx.orgId, isActive: true }
    : { userId, isActive: true };
  const count = await prisma.apiKey.count({ where }).catch(() => 0);
  return {
    allowed: count < ctx.limits.maxApiKeys,
    current: count,
    max: ctx.limits.maxApiKeys,
    plan: ctx.plan,
    required: nextPlan(ctx.plan),
  };
}

// ─── MIDDLEWARE FACTORY ────────────────────────────────────────────────────────

function limitMiddleware(checkFn, errorCode, getMessage) {
  return async (req, res, next) => {
    try {
      if (['SUPER_ADMIN','ADMIN'].includes(req.user?.role)) return next();
      const result = await checkFn(req);
      if (!result.allowed) {
        return res.status(402).json({
          error: getMessage(result),
          code: errorCode,
          current: result.current,
          max: result.max,
          currentPlan: result.plan,
          requiredPlan: result.required,
          upgradeUrl: '/dashboard/settings',
        });
      }
      req.planContext = result;
      next();
    } catch(e) { next(e); }
  };
}

const checkProjectLimitMW = (req) => checkMWLimit(
  req.user.userId,
  parseFloat(req.body.installedMW) || 0
);

const requireProjectLimit = limitMiddleware(
  (req) => checkProjectLimit(req.user.userId),
  'PLAN_PROJECT_LIMIT',
  (r) => 'Project limit reached (' + r.current + '/' + r.max + '). Upgrade to ' + r.required + '.'
);

const requireMWLimit = limitMiddleware(
  checkProjectLimitMW,
  'PLAN_MW_LIMIT',
  (r) => 'MW capacity limit (' + r.currentMW + '+' + r.newMW + '/' + r.maxMW + ' MW). Upgrade to ' + r.required + '.'
);

const requireApiKeyLimit = limitMiddleware(
  (req) => checkApiKeyLimit(req.user.userId),
  'PLAN_APIKEY_LIMIT',
  (r) => 'API key limit reached (' + r.current + '/' + r.max + '). Upgrade to ' + r.required + '.'
);

module.exports = {
  PLAN_LIMITS, PLAN_ORDER, planTier, nextPlan,
  getUserPlanContext,
  checkProjectLimit, checkMWLimit, checkUserLimit, checkApiKeyLimit,
  requireProjectLimit, requireMWLimit, requireApiKeyLimit,
};

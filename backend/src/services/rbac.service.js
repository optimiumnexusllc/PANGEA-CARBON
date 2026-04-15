/**
 * PANGEA CARBON — RBAC Engine v3.0 Elite
 * Permission resolution: Role defaults → DB overrides → Group → User overrides
 * Plan enforcement: TRIAL < STARTER < PRO < ENTERPRISE
 * Sprint 4 — Sécurité & Compliance
 */

// ─── PLAN HIERARCHY ───────────────────────────────────────────────────────────
const PLAN_TIER = { FREE:0, TRIAL:1, STARTER:2, PRO:3, ENTERPRISE:4, CUSTOM:4 };

// Features disponibles par plan
const PLAN_FEATURES = {
  FREE:       ['projects.read','marketplace.list','carbon_desk.view','reports.download'],
  TRIAL:      ['projects.*','mrv.calculate','mrv.submit','baseline.assess','ghg_audit.read','ghg_audit.create','reports.generate','reports.download','carbon_desk.view'],
  STARTER:    ['projects.*','pipeline.*','mrv.*','baseline.*','ghg_audit.*','reports.*','carbon_desk.*','api_keys.create','api_keys.revoke','marketplace.list','marketplace.buy'],
  PRO:        ['*_except_admin'], // tout sauf admin console
  ENTERPRISE: ['*'],              // tout
  CUSTOM:     ['*'],
};

// Modules nécessitant plan minimum
const MODULE_MIN_PLAN = {
  'esg':         'STARTER',
  'carbon_tax':  'PRO',
  'email_comp':  'PRO',
  'seller':      'STARTER',
  'marketplace.sell': 'STARTER',
  'marketplace.manage_listings': 'STARTER',
  'reports.schedule': 'PRO',
  'api_keys.view_all': 'PRO',
  'mrv.approve':  'PRO',
  'baseline.approve': 'PRO',
  'pipeline.issue_credits': 'STARTER',
  'buyer.qualify_leads': 'PRO',
  'buyer.view_crm': 'PRO',
  'carbon_desk.export': 'PRO',
  'super':       'SUPER_ADMIN_ONLY',
};

// ─── MATRICE DE PERMISSIONS PAR RÔLE ─────────────────────────────────────────
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'projects.*','pipeline.*','ghg_audit.*','marketplace.*',
    'seller.*','buyer.*','reports.*','api_keys.*','mrv.*',
    'baseline.*','carbon_desk.*','users.manage_users','users.invite',
    'orgs.manage_orgs','billing.view','features.manage_features',
    'esg.*','carbon_tax.*','email_comp.*',
  ],
  ORG_OWNER: [
    'projects.create','projects.read','projects.update','projects.delete','projects.list_all',
    'pipeline.create','pipeline.advance','pipeline.block','pipeline.cancel','pipeline.issue_credits','pipeline.list_all',
    'ghg_audit.create','ghg_audit.read','ghg_audit.update','ghg_audit.delete','ghg_audit.ai_analysis','ghg_audit.list_all',
    'marketplace.buy','marketplace.sell','marketplace.list','marketplace.manage_listings',
    'seller.configure_gateway','seller.request_payout','seller.view_revenue',
    'buyer.create_profile','buyer.update_profile',
    'reports.generate','reports.download',
    'api_keys.create','api_keys.revoke',
    'mrv.calculate','mrv.submit',
    'baseline.assess',
    'carbon_desk.view','carbon_desk.qualify',
    'users.invite',
    'billing.view',
    'esg.create','esg.read','esg.update','esg.delete','esg.generate_report','esg.list_all',
    'carbon_tax.view','carbon_tax.simulate','carbon_tax.export',
  ],
  ANALYST: [
    'projects.create','projects.read','projects.update',
    'pipeline.create','pipeline.advance',
    'ghg_audit.create','ghg_audit.read','ghg_audit.update',
    'marketplace.buy','marketplace.list',
    'reports.generate','reports.download',
    'mrv.calculate',
    'baseline.assess',
    'carbon_desk.view',
    'esg.read','esg.create','esg.update',
  ],
  AUDITOR: [
    'projects.read',
    'ghg_audit.read','ghg_audit.update','ghg_audit.ai_analysis',
    'reports.generate','reports.download',
    'mrv.calculate',
    'baseline.assess',
  ],
  CLIENT: [
    'projects.read',
    'marketplace.buy','marketplace.list',
    'buyer.create_profile','buyer.update_profile',
    'carbon_desk.view',
    'reports.download',
  ],
  VIEWER: [
    'projects.read',
    'marketplace.list',
    'carbon_desk.view',
  ],
};

// ─── TOUS LES MODULES ET PERMISSIONS ─────────────────────────────────────────
const ALL_PERMISSIONS = {
  projects:     ['create','read','update','delete','list_all'],
  pipeline:     ['create','advance','block','cancel','issue_credits','list_all'],
  ghg_audit:    ['create','read','update','delete','ai_analysis','list_all'],
  marketplace:  ['buy','sell','list','manage_listings','view_all_orders'],
  seller:       ['configure_gateway','request_payout','view_revenue'],
  buyer:        ['create_profile','update_profile','qualify_leads','view_crm'],
  reports:      ['generate','download','schedule'],
  api_keys:     ['create','revoke','view_all'],
  mrv:          ['calculate','submit','approve'],
  baseline:     ['assess','approve'],
  carbon_desk:  ['view','qualify','export'],
  users:        ['invite','manage_users'],
  orgs:         ['manage_orgs'],
  billing:      ['view','manage'],
  features:     ['manage_features'],
  super:        ['impersonate','delete_org','view_all_data'],
  esg:          ['create','read','update','delete','generate_report','list_all'],
  carbon_tax:   ['view','simulate','export'],
  email_comp:   ['send','view_history','manage_templates'],
};

// ─── RÉSOLUTION DES PERMISSIONS ───────────────────────────────────────────────
async function resolvePermissions(user, prisma) {
  if (!user) return new Set();

  const rolePerms = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.VIEWER;
  let effectivePerms = new Set();

  if (rolePerms.includes('*')) {
    const all = [];
    Object.entries(ALL_PERMISSIONS).forEach(([mod, perms]) => {
      perms.forEach(p => all.push(mod + '.' + p));
    });
    all.push('*');
    return new Set(all);
  }

  rolePerms.forEach(perm => {
    if (perm.endsWith('.*')) {
      const mod = perm.slice(0, -2);
      (ALL_PERMISSIONS[mod] || []).forEach(p => effectivePerms.add(mod + '.' + p));
    } else {
      effectivePerms.add(perm);
    }
  });

  try {
    const roleOverrides = await prisma.rolePermissionOverride.findMany({ where: { role: user.role } });
    roleOverrides.forEach(o => {
      if (o.granted) effectivePerms.add(o.permission);
      else effectivePerms.delete(o.permission);
    });
  } catch(e) {}

  try {
    const userId = user.userId || user.id;
    const memberships = await prisma.groupMember.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: { group: true }
    });
    memberships.sort((a,b) => (b.group.priority||0) - (a.group.priority||0));
    memberships.forEach(m => {
      try {
        const groupPerms = JSON.parse(m.group.permissions || '[]');
        groupPerms.forEach(p => {
          if (p.startsWith('-')) effectivePerms.delete(p.slice(1));
          else effectivePerms.add(p);
        });
      } catch(e) {}
    });
  } catch(e) {}

  try {
    const userId = user.userId || user.id;
    const userOverrides = await prisma.userPermission.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    userOverrides.forEach(o => {
      if (o.granted) effectivePerms.add(o.permission);
      else effectivePerms.delete(o.permission);
    });
  } catch(e) {}

  return effectivePerms;
}

// ─── CHECK PLAN ───────────────────────────────────────────────────────────────
function planAllows(orgPlan, permission) {
  if (!orgPlan) return false;
  const minPlan = MODULE_MIN_PLAN[permission];
  if (!minPlan) return true; // pas de restriction de plan pour ce module
  if (minPlan === 'SUPER_ADMIN_ONLY') return false;
  return (PLAN_TIER[orgPlan] || 0) >= (PLAN_TIER[minPlan] || 99);
}

// ─── MIDDLEWARE requirePermission ─────────────────────────────────────────────
function requirePermission(...permissions) {
  return async (req, res, next) => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const effectivePerms = await resolvePermissions(req.user, prisma);
      const hasAll = permissions.every(p => effectivePerms.has('*') || effectivePerms.has(p));

      if (!hasAll) {
        const missing = permissions.filter(p => !effectivePerms.has('*') && !effectivePerms.has(p));
        return res.status(403).json({
          error: 'Permission denied',
          required: permissions,
          missing,
          role: req.user?.role,
          message: 'Your role does not have permission for this action. Contact your admin.',
        });
      }

      req.permissions = effectivePerms;
      next();
    } catch(e) { next(e); }
  };
}

// ─── MIDDLEWARE requirePlan ───────────────────────────────────────────────────
function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      // SUPER_ADMIN bypass plan restrictions
      if (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN') return next();

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { organization: { select: { plan: true, status: true, name: true } } }
      });

      const orgPlan = user?.organization?.plan || 'TRIAL';
      const orgStatus = user?.organization?.status;

      if (orgStatus === 'SUSPENDED') {
        return res.status(402).json({
          error: 'Account suspended',
          message: 'Your account is suspended. Please contact support.',
          code: 'SUSPENDED',
        });
      }

      if ((PLAN_TIER[orgPlan] || 0) < (PLAN_TIER[minPlan] || 0)) {
        return res.status(402).json({
          error: 'Plan upgrade required',
          currentPlan: orgPlan,
          requiredPlan: minPlan,
          message: 'Upgrade your plan to access this feature.',
          upgradeUrl: '/dashboard/settings',
          code: 'PLAN_REQUIRED',
        });
      }

      req.orgPlan = orgPlan;
      next();
    } catch(e) { next(e); }
  };
}

// ─── HELPER ───────────────────────────────────────────────────────────────────
function hasPermission(permSet, permission) {
  return permSet.has('*') || permSet.has(permission);
}

module.exports = {
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  MODULE_MIN_PLAN,
  PLAN_FEATURES,
  PLAN_TIER,
  resolvePermissions,
  requirePermission,
  requirePlan,
  hasPermission,
  planAllows,
};

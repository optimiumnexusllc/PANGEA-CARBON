/**
 * PANGEA CARBON — RBAC Engine v2.0
 * Permission resolution: Role defaults → Group overrides → User overrides
 */

// ─── Matrice de permissions par défaut par rôle ───────────────────────────────
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], // Wildcard — tout
  ADMIN: [
    'projects.*', 'pipeline.*', 'ghg_audit.*', 'marketplace.*',
    'seller.*', 'buyer.*', 'reports.*', 'api_keys.*', 'mrv.*',
    'baseline.*', 'carbon_desk.*', 'users.manage_users', 'users.invite',
    'orgs.manage_orgs', 'billing.view', 'features.manage_features',
  ],
  ORG_OWNER: [
    'projects.create', 'projects.read', 'projects.update', 'projects.delete', 'projects.list_all',
    'pipeline.create', 'pipeline.advance', 'pipeline.block', 'pipeline.cancel', 'pipeline.issue_credits', 'pipeline.list_all',
    'ghg_audit.create', 'ghg_audit.read', 'ghg_audit.update', 'ghg_audit.delete', 'ghg_audit.ai_analysis', 'ghg_audit.list_all',
    'marketplace.buy', 'marketplace.sell', 'marketplace.list', 'marketplace.manage_listings',
    'seller.configure_gateway', 'seller.request_payout', 'seller.view_revenue',
    'buyer.create_profile', 'buyer.update_profile',
    'reports.generate', 'reports.download',
    'api_keys.create', 'api_keys.revoke',
    'mrv.calculate', 'mrv.submit',
    'baseline.assess',
    'carbon_desk.view', 'carbon_desk.qualify',
    'users.invite',
  ],
  ANALYST: [
    'projects.create', 'projects.read', 'projects.update',
    'pipeline.create', 'pipeline.advance',
    'ghg_audit.create', 'ghg_audit.read', 'ghg_audit.update',
    'marketplace.buy', 'marketplace.list',
    'reports.generate', 'reports.download',
    'mrv.calculate',
    'baseline.assess',
    'carbon_desk.view',
  ],
  AUDITOR: [
    'projects.read', 'pipeline.read',
    'ghg_audit.read', 'ghg_audit.update', 'ghg_audit.ai_analysis',
    'reports.generate', 'reports.download',
    'mrv.calculate',
    'baseline.assess',
  ],
  CLIENT: [
    'projects.read',
    'marketplace.buy', 'marketplace.list',
    'buyer.create_profile', 'buyer.update_profile',
    'carbon_desk.view',
    'reports.download',
  ],
  VIEWER: [
    'projects.read',
    'marketplace.list',
    'carbon_desk.view',
  ],
};

// ─── Tous les modules et permissions disponibles ──────────────────────────────
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

// ─── Résolution des permissions pour un user ─────────────────────────────────
async function resolvePermissions(user, prisma) {
  if (!user) return new Set();

  // 1. Permissions du rôle de base
  const rolePerms = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.VIEWER;
  let effectivePerms = new Set();

  // Wildcard SUPER_ADMIN
  if (rolePerms.includes('*')) {
    const all = [];
    Object.entries(ALL_PERMISSIONS).forEach(([mod, perms]) => {
      perms.forEach(p => all.push(`${mod}.${p}`));
    });
    all.push('*');
    return new Set(all);
  }

  // Expand wildcards (ex: "projects.*" → toutes les permissions projects)
  rolePerms.forEach(perm => {
    if (perm.endsWith('.*')) {
      const mod = perm.slice(0, -2);
      (ALL_PERMISSIONS[mod] || []).forEach(p => effectivePerms.add(`${mod}.${p}`));
    } else {
      effectivePerms.add(perm);
    }
  });

  // 2. Override par rôle depuis DB
  try {
    const roleOverrides = await prisma.rolePermissionOverride.findMany({
      where: { role: user.role }
    });
    roleOverrides.forEach(o => {
      if (o.granted) effectivePerms.add(o.permission);
      else effectivePerms.delete(o.permission);
    });
  } catch(e) {}

  // 3. Permissions des groupes
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.userId || user.id, expiresAt: { gt: new Date() } },
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

  // 4. Override par user
  try {
    const userOverrides = await prisma.userPermission.findMany({
      where: {
        userId: user.userId || user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    });
    userOverrides.forEach(o => {
      if (o.granted) effectivePerms.add(o.permission);
      else effectivePerms.delete(o.permission);
    });
  } catch(e) {}

  return effectivePerms;
}

// ─── Middleware de vérification ───────────────────────────────────────────────
function requirePermission(...permissions) {
  return async (req, res, next) => {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const effectivePerms = await resolvePermissions(req.user, prisma);
      const hasAll = permissions.every(p => effectivePerms.has(p) || effectivePerms.has('*'));
      if (!hasAll) {
        return res.status(403).json({
          error: 'Permission refusée',
          required: permissions,
          message: 'Vous n\'avez pas les droits nécessaires pour cette action',
        });
      }
      req.permissions = effectivePerms;
      next();
    } catch(e) { next(e); }
  };
}

// ─── Helper: vérifier une permission ─────────────────────────────────────────
function hasPermission(permSet, permission) {
  return permSet.has('*') || permSet.has(permission);
}

module.exports = {
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  resolvePermissions,
  requirePermission,
  hasPermission,
};

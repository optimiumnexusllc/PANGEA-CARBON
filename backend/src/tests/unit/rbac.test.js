/**
 * PANGEA CARBON — RBAC Engine v3.0 Tests Unitaires Elite
 * Run: cd backend && npx jest src/tests/unit/rbac.test.js --verbose
 */

const {
  ROLE_PERMISSIONS, ALL_PERMISSIONS, MODULE_MIN_PLAN, PLAN_TIER,
  resolvePermissions, requirePermission, requirePlan,
  hasPermission, planAllows,
} = require('../../services/rbac.service');

// ─── MOCK PRISMA ──────────────────────────────────────────────────────────────
const mockPrisma = {
  rolePermissionOverride: {
    findMany: async () => [],  // Aucun override par défaut
  },
  groupMember: {
    findMany: async () => [],
  },
  userPermission: {
    findMany: async () => [],
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const makeUser = (role, id = 'user-1') => ({ userId: id, role, id });

async function getPerms(role) {
  return resolvePermissions(makeUser(role), mockPrisma);
}

function can(perms, perm) { return perms.has('*') || perms.has(perm); }

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — ROLE PERMISSIONS STRUCTURE
// ══════════════════════════════════════════════════════════════════════════════
describe('1. RBAC — Role permissions structure', () => {
  test('All 7 roles are defined', () => {
    const roles = ['SUPER_ADMIN','ADMIN','ORG_OWNER','ANALYST','AUDITOR','CLIENT','VIEWER'];
    roles.forEach(r => {
      expect(ROLE_PERMISSIONS[r]).toBeDefined();
    });
  });

  test('SUPER_ADMIN has wildcard permission', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('*');
  });

  test('VIEWER has minimal permissions', () => {
    expect(ROLE_PERMISSIONS.VIEWER.length).toBeLessThan(5);
  });

  test('All modules exist in ALL_PERMISSIONS', () => {
    const required = ['projects','pipeline','ghg_audit','marketplace','seller',
      'buyer','reports','api_keys','mrv','baseline','carbon_desk','users',
      'orgs','billing','features','super','esg','carbon_tax','email_comp'];
    required.forEach(mod => {
      expect(ALL_PERMISSIONS[mod]).toBeDefined();
      expect(Array.isArray(ALL_PERMISSIONS[mod])).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — SUPER_ADMIN ACCESS
// ══════════════════════════════════════════════════════════════════════════════
describe('2. SUPER_ADMIN — Full access', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('SUPER_ADMIN'); });

  test('Has wildcard *', () => expect(perms.has('*')).toBe(true));

  test.each([
    'projects.create','projects.delete',
    'pipeline.issue_credits','pipeline.block',
    'super.impersonate','super.delete_org','super.view_all_data',
    'billing.manage','features.manage_features',
    'esg.create','carbon_tax.simulate','email_comp.send',
    'users.manage_users','orgs.manage_orgs',
  ])('Has permission: %s', (perm) => {
    expect(can(perms, perm)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — ADMIN RESTRICTIONS
// ══════════════════════════════════════════════════════════════════════════════
describe('3. ADMIN — Restricted admin access', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('ADMIN'); });

  test.each([
    'projects.create','projects.delete',
    'pipeline.issue_credits',
    'billing.view',
    'users.manage_users','orgs.manage_orgs',
    'esg.create','carbon_tax.view',
  ])('ADMIN can: %s', (perm) => expect(can(perms, perm)).toBe(true));

  test.each([
    'super.impersonate','super.delete_org','super.view_all_data',
    'billing.manage',
  ])('ADMIN cannot: %s', (perm) => expect(can(perms, perm)).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — ORG_OWNER
// ══════════════════════════════════════════════════════════════════════════════
describe('4. ORG_OWNER — Business owner', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('ORG_OWNER'); });

  test.each([
    'projects.create','projects.delete','projects.list_all',
    'pipeline.create','pipeline.issue_credits',
    'marketplace.sell','seller.request_payout',
    'esg.create','esg.generate_report',
    'api_keys.create',
  ])('ORG_OWNER can: %s', (perm) => expect(can(perms, perm)).toBe(true));

  test.each([
    'super.impersonate','billing.manage',
    'users.manage_users','orgs.manage_orgs',
    'features.manage_features',
  ])('ORG_OWNER cannot: %s', (perm) => expect(can(perms, perm)).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — ANALYST
// ══════════════════════════════════════════════════════════════════════════════
describe('5. ANALYST — Standard collaborator', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('ANALYST'); });

  test.each([
    'projects.create','projects.read','projects.update',
    'pipeline.create','pipeline.advance',
    'ghg_audit.create','ghg_audit.read',
    'marketplace.buy','marketplace.list',
    'reports.generate','reports.download',
    'mrv.calculate','baseline.assess',
  ])('ANALYST can: %s', (perm) => expect(can(perms, perm)).toBe(true));

  test.each([
    'projects.delete','projects.list_all',
    'pipeline.block','pipeline.cancel','pipeline.issue_credits',
    'marketplace.sell','seller.request_payout',
    'api_keys.create','billing.view',
    'users.invite','users.manage_users',
  ])('ANALYST cannot: %s', (perm) => expect(can(perms, perm)).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — AUDITOR
// ══════════════════════════════════════════════════════════════════════════════
describe('6. AUDITOR — Audit access only', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('AUDITOR'); });

  test.each([
    'projects.read',
    'ghg_audit.read','ghg_audit.update','ghg_audit.ai_analysis',
    'reports.generate','reports.download',
    'mrv.calculate','baseline.assess',
  ])('AUDITOR can: %s', (perm) => expect(can(perms, perm)).toBe(true));

  test.each([
    'projects.create','projects.update','projects.delete',
    'pipeline.create','pipeline.advance',
    'marketplace.buy','marketplace.sell',
    'api_keys.create','billing.view',
    'esg.create',
  ])('AUDITOR cannot: %s', (perm) => expect(can(perms, perm)).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — CLIENT
// ══════════════════════════════════════════════════════════════════════════════
describe('7. CLIENT — External buyer', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('CLIENT'); });

  test.each([
    'projects.read',
    'marketplace.buy','marketplace.list',
    'buyer.create_profile','buyer.update_profile',
    'carbon_desk.view','reports.download',
  ])('CLIENT can: %s', (perm) => expect(can(perms, perm)).toBe(true));

  test.each([
    'projects.create','projects.update','projects.delete',
    'marketplace.sell','marketplace.manage_listings',
    'api_keys.create','billing.view',
    'esg.create','pipeline.create',
  ])('CLIENT cannot: %s', (perm) => expect(can(perms, perm)).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — VIEWER
// ══════════════════════════════════════════════════════════════════════════════
describe('8. VIEWER — Read only', () => {
  let perms;
  beforeAll(async () => { perms = await getPerms('VIEWER'); });

  test.each([
    'projects.read','marketplace.list','carbon_desk.view',
  ])('VIEWER can: %s', (perm) => expect(can(perms, perm)).toBe(true));

  test.each([
    'projects.create','projects.update','projects.delete',
    'marketplace.buy','reports.generate',
    'esg.create','pipeline.create',
  ])('VIEWER cannot: %s', (perm) => expect(can(perms, perm)).toBe(false));
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 9 — PLAN ENFORCEMENT
// ══════════════════════════════════════════════════════════════════════════════
describe('9. Plan Enforcement — Features vs Plan tier', () => {
  test('Plan hierarchy is correct', () => {
    expect(PLAN_TIER.FREE).toBeLessThan(PLAN_TIER.TRIAL);
    expect(PLAN_TIER.TRIAL).toBeLessThan(PLAN_TIER.STARTER);
    expect(PLAN_TIER.STARTER).toBeLessThan(PLAN_TIER.PRO);
    expect(PLAN_TIER.PRO).toBeLessThanOrEqual(PLAN_TIER.ENTERPRISE);
  });

  test.each([
    ['TRIAL',    'esg',          false],
    ['STARTER',  'esg',          true],
    ['PRO',      'esg',          true],
    ['ENTERPRISE','esg',         true],
    ['TRIAL',    'carbon_tax',   false],
    ['STARTER',  'carbon_tax',   false],
    ['PRO',      'carbon_tax',   true],
    ['ENTERPRISE','carbon_tax',  true],
    ['TRIAL',    'email_comp',   false],
    ['PRO',      'email_comp',   true],
    ['TRIAL',    'marketplace.sell', false],
    ['STARTER',  'marketplace.sell', true],
    ['TRIAL',    'pipeline.issue_credits', false],
    ['STARTER',  'pipeline.issue_credits', true],
    ['TRIAL',    'reports.schedule', false],
    ['PRO',      'reports.schedule', true],
  ])('Plan %s for "%s" → allowed=%s', (plan, permission, expected) => {
    expect(planAllows(plan, permission)).toBe(expected);
  });

  test('Unknown permission is allowed (no restriction)', () => {
    expect(planAllows('TRIAL', 'projects.create')).toBe(true);
    expect(planAllows('TRIAL', 'mrv.calculate')).toBe(true);
  });

  test('No plan → denied', () => {
    expect(planAllows(null, 'esg')).toBe(false);
    expect(planAllows(undefined, 'carbon_tax')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 10 — DB OVERRIDES
// ══════════════════════════════════════════════════════════════════════════════
describe('10. RBAC — DB permission overrides', () => {
  test('Role override: grant additional permission', async () => {
    const prismaWithOverride = {
      ...mockPrisma,
      rolePermissionOverride: {
        findMany: async ({ where }) => where.role === 'VIEWER'
          ? [{ role: 'VIEWER', permission: 'marketplace.buy', granted: true }]
          : [],
      },
    };
    const perms = await resolvePermissions(makeUser('VIEWER'), prismaWithOverride);
    expect(can(perms, 'marketplace.buy')).toBe(true);
    expect(can(perms, 'projects.create')).toBe(false); // unchanged
  });

  test('Role override: revoke permission', async () => {
    const prismaWithRevoke = {
      ...mockPrisma,
      rolePermissionOverride: {
        findMany: async ({ where }) => where.role === 'ANALYST'
          ? [{ role: 'ANALYST', permission: 'projects.create', granted: false }]
          : [],
      },
    };
    const perms = await resolvePermissions(makeUser('ANALYST'), prismaWithRevoke);
    expect(can(perms, 'projects.create')).toBe(false); // revoked
    expect(can(perms, 'projects.read')).toBe(true); // unchanged
  });

  test('User override takes final precedence', async () => {
    const prismaWithUserOverride = {
      ...mockPrisma,
      userPermission: {
        findMany: async ({ where }) => where.userId === 'special-user'
          ? [{ userId: 'special-user', permission: 'billing.view', granted: true }]
          : [],
      },
    };
    const perms = await resolvePermissions(
      makeUser('ANALYST', 'special-user'), prismaWithUserOverride
    );
    expect(can(perms, 'billing.view')).toBe(true); // user override granted
  });

  test('null user returns empty set', async () => {
    const perms = await resolvePermissions(null, mockPrisma);
    expect(perms.size).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 11 — PERMISSION MATRIX vs RBAC PAGE
// ══════════════════════════════════════════════════════════════════════════════
describe('11. RBAC Matrix — Cross-role validation', () => {
  test('Higher roles have >= permissions than lower roles (projects.read)', async () => {
    const roles = ['SUPER_ADMIN','ADMIN','ORG_OWNER','ANALYST'];
    for (const role of roles) {
      const p = await getPerms(role);
      expect(can(p, 'projects.read')).toBe(true);
    }
  });

  test('Sensitive permissions restricted to high roles', async () => {
    const sensitivePerms = [
      { perm: 'super.impersonate', allowed: ['SUPER_ADMIN'] },
      { perm: 'billing.manage', allowed: ['SUPER_ADMIN'] },
      { perm: 'users.manage_users', allowed: ['SUPER_ADMIN','ADMIN'] },
      { perm: 'orgs.manage_orgs', allowed: ['SUPER_ADMIN','ADMIN'] },
    ];

    for (const { perm, allowed } of sensitivePerms) {
      for (const role of ['SUPER_ADMIN','ADMIN','ORG_OWNER','ANALYST','AUDITOR','CLIENT','VIEWER']) {
        const p = await getPerms(role);
        const hasIt = can(p, perm);
        if (allowed.includes(role)) {
          expect(hasIt).toBe(true);
        } else {
          expect(hasIt).toBe(false);
        }
      }
    }
  });

  test('hasPermission helper works correctly', () => {
    const permSet = new Set(['projects.read', 'mrv.calculate']);
    expect(hasPermission(permSet, 'projects.read')).toBe(true);
    expect(hasPermission(permSet, 'projects.delete')).toBe(false);
    const wildcard = new Set(['*']);
    expect(hasPermission(wildcard, 'anything')).toBe(true);
  });
});

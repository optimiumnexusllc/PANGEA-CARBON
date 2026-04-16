/**
 * PANGEA CARBON — Plan Limits Tests
 * Run: cd backend && npx jest src/tests/unit/plan-limits.test.js --verbose
 */
const {
  PLAN_LIMITS, PLAN_ORDER, planTier, nextPlan,
} = require('../../services/plan-limits.service');

describe('Plan Limits — Structure', () => {
  test('All 7 plans defined', () => {
    ['FREE','TRIAL','STARTER','PRO','GROWTH','ENTERPRISE','CUSTOM'].forEach(p => {
      expect(PLAN_LIMITS[p]).toBeDefined();
    });
  });

  test('Plan hierarchy correct', () => {
    expect(planTier('FREE')).toBeLessThan(planTier('TRIAL'));
    expect(planTier('TRIAL')).toBeLessThan(planTier('STARTER'));
    expect(planTier('STARTER')).toBeLessThan(planTier('PRO'));
    expect(planTier('PRO')).toBeLessThan(planTier('ENTERPRISE'));
  });

  test('nextPlan returns correct upgrade', () => {
    expect(nextPlan('FREE')).toBe('TRIAL');
    expect(nextPlan('TRIAL')).toBe('STARTER');
    expect(nextPlan('STARTER')).toBe('PRO');
  });
});

describe('Plan Limits — Project limits per plan', () => {
  test.each([
    ['FREE',       1],
    ['TRIAL',      3],
    ['STARTER',    5],
    ['PRO',      999],
    ['GROWTH',    50],
    ['ENTERPRISE',999],
  ])('%s: maxProjects=%d', (plan, max) => {
    expect(PLAN_LIMITS[plan].maxProjects).toBe(max);
  });
});

describe('Plan Limits — MW limits per plan', () => {
  test.each([
    ['FREE',         500],
    ['TRIAL',        500],
    ['STARTER',     1000],
    ['PRO',        99999],
    ['GROWTH',     10000],
    ['ENTERPRISE', 99999],
  ])('%s: maxMW=%d', (plan, max) => {
    expect(PLAN_LIMITS[plan].maxMW).toBe(max);
  });
});

describe('Plan Limits — User limits per plan', () => {
  test.each([
    ['FREE',   1],
    ['TRIAL',  2],
    ['STARTER',2],
    ['PRO',   10],
    ['GROWTH',20],
    ['ENTERPRISE',999],
  ])('%s: maxUsers=%d', (plan, max) => {
    expect(PLAN_LIMITS[plan].maxUsers).toBe(max);
  });
});

describe('Plan Limits — Feature gates', () => {
  test.each([
    ['FREE',   'canSell', false],
    ['TRIAL',  'canSell', false],
    ['STARTER','canSell', true],
    ['FREE',   'hasPDF',  false],
    ['STARTER','hasPDF',  true],
    ['TRIAL',  'hasAI',   false],
    ['PRO',    'hasAI',   true],
    ['ENTERPRISE','hasAI',true],
  ])('%s: %s=%s', (plan, feat, val) => {
    expect(PLAN_LIMITS[plan][feat]).toBe(val);
  });
});

describe('Plan Limits — FREE plan (no org)', () => {
  test('FREE: most restrictive plan', () => {
    const free = PLAN_LIMITS.FREE;
    expect(free.maxProjects).toBe(1);
    expect(free.maxUsers).toBe(1);
    expect(free.maxMW).toBe(500);
    expect(free.maxApiKeys).toBe(0);
    expect(free.canSell).toBe(false);
    expect(free.hasPDF).toBe(false);
    expect(free.hasAI).toBe(false);
  });
});

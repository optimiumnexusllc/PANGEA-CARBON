/**
 * Tests unitaires — Moteur de projection 10 ans
 */

// Helpers de projection (extraits de projection.js)
function projectYear(baseCredits, basePrice, year, scenario) {
  const SCENARIOS = {
    conservative: { growthRate: -0.005, priceGrowth: 0.03, degradation: 0.008, uncertainty: 0.08 },
    base:         { growthRate: 0.02,  priceGrowth: 0.05, degradation: 0.005, uncertainty: 0.05 },
    optimistic:   { growthRate: 0.04,  priceGrowth: 0.08, degradation: 0.003, uncertainty: 0.03 },
  };
  const scen = SCENARIOS[scenario];
  const credits = baseCredits * Math.pow(1 - scen.degradation, year) * Math.pow(1 + scen.growthRate, year);
  const price = basePrice * Math.pow(1 + scen.priceGrowth, year);
  return { credits: Math.max(0, credits), price, revenue: Math.max(0, credits) * price };
}

describe('Moteur de projection', () => {
  describe('Scénarios', () => {
    test('Scenario optimiste > base > conservateur à 10 ans', () => {
      const opt = projectYear(10000, 12, 10, 'optimistic');
      const base = projectYear(10000, 12, 10, 'base');
      const cons = projectYear(10000, 12, 10, 'conservative');

      expect(opt.revenue).toBeGreaterThan(base.revenue);
      expect(base.revenue).toBeGreaterThan(cons.revenue);
    });

    test('Revenus augmentent avec le temps (scenario base)', () => {
      const y1 = projectYear(10000, 12, 1, 'base');
      const y5 = projectYear(10000, 12, 5, 'base');
      const y10 = projectYear(10000, 12, 10, 'base');

      expect(y5.revenue).toBeGreaterThan(y1.revenue);
      expect(y10.revenue).toBeGreaterThan(y5.revenue);
    });

    test('Crédits diminuent avec la dégradation (conservative)', () => {
      const y1 = projectYear(10000, 12, 1, 'conservative');
      const y10 = projectYear(10000, 12, 10, 'conservative');

      expect(y10.credits).toBeLessThan(y1.credits);
    });
  });

  describe('Bornes de sécurité', () => {
    test('Jamais de revenus négatifs', () => {
      for (let y = 1; y <= 20; y++) {
        for (const scen of ['conservative', 'base', 'optimistic']) {
          const result = projectYear(1000, 5, y, scen);
          expect(result.revenue).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('Crédits bornés entre 0 et 200% du baseline', () => {
      const baseCredits = 10000;
      for (let y = 1; y <= 30; y++) {
        const result = projectYear(baseCredits, 12, y, 'optimistic');
        expect(result.credits).toBeGreaterThanOrEqual(0);
        expect(result.credits).toBeLessThanOrEqual(baseCredits * 2);
      }
    });
  });

  describe('Cohérence économique', () => {
    test('NPV à 8% > 0 sur 10 ans (base scenario avec EF africain)', () => {
      let npv = 0;
      for (let y = 1; y <= 10; y++) {
        const { revenue } = projectYear(5000, 12, y, 'base');
        npv += revenue / Math.pow(1.08, y);
      }
      expect(npv).toBeGreaterThan(0);
    });
  });
});

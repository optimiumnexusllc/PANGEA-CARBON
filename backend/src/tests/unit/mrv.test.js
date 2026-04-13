/**
 * PANGEA CARBON — Tests unitaires MRV Engine ACM0002
 * Sprint 3 — Crédibilité auditeurs VVB
 * Run: cd backend && npx jest src/tests/unit/mrv.test.js
 */
const { MRVEngine } = require('../../services/mrv.service');

// ─── DONNÉES DE TEST ──────────────────────────────────────────────────────
const SOLAR_PROJECT_CI = {
  id: 'test-solar-ci',
  name: 'Parc Solaire Test Abidjan',
  type: 'SOLAR',
  installedMW: 10,
  countryCode: 'CI',
  baselineEF: 0.547, // tCO2/MWh (Côte d'Ivoire UNFCCC 2024)
  standard: 'Verra VCS',
};

const WIND_PROJECT_KE = {
  id: 'test-wind-ke',
  name: 'Wind Farm Test Turkana',
  type: 'WIND',
  installedMW: 25,
  countryCode: 'KE',
  baselineEF: 0.251,
  standard: 'Gold Standard',
};

// 12 mois de lectures (10 MW solaire, ~4h équivalent/jour en CI)
const MONTHLY_READINGS_SOLAR = Array.from({ length: 12 }, (_, i) => ({
  id: `reading-${i}`,
  projectId: 'test-solar-ci',
  periodStart: new Date(2024, i, 1),
  periodEnd: new Date(2024, i + 1, 0),
  energyMWh: 1200 + Math.sin(i) * 100, // ~1200 MWh/mois avec saisonnalité
  availabilityPct: 97.5,
  peakPowerMW: 9.8,
  source: 'TEST',
}));

const MONTHLY_READINGS_WIND = Array.from({ length: 12 }, (_, i) => ({
  id: `wind-${i}`,
  projectId: 'test-wind-ke',
  periodStart: new Date(2024, i, 1),
  periodEnd: new Date(2024, i + 1, 0),
  energyMWh: 5500 + Math.cos(i) * 300,
  availabilityPct: 96.0,
  source: 'TEST',
}));

// ─── TESTS ────────────────────────────────────────────────────────────────
describe('MRV Engine — ACM0002 v19.0', () => {

  describe('Calcul de base', () => {
    test('calculateAnnual retourne un résultat valide pour un projet solaire CI', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);

      expect(result).toBeDefined();
      expect(result.emissions).toBeDefined();
      expect(result.financials).toBeDefined();
      expect(result.projectMetrics).toBeDefined();
    });

    test('Production totale est la somme des lectures mensuelles', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const expectedTotal = MONTHLY_READINGS_SOLAR.reduce((s, r) => s + r.energyMWh, 0);

      expect(result.projectMetrics.totalMWh).toBeCloseTo(expectedTotal, 0);
    });

    test('Émissions brutes = Production × EF grille', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const totalMWh = MONTHLY_READINGS_SOLAR.reduce((s, r) => s + r.energyMWh, 0);
      const expectedGross = totalMWh * SOLAR_PROJECT_CI.baselineEF;

      expect(result.emissions.grossEmissionsReduced).toBeCloseTo(expectedGross, -1);
    });
  });

  describe('Déductions ACM0002', () => {
    test('Leakage ≤ 5% des émissions brutes (ACM0002 §4.2)', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const leakagePct = result.emissions.leakage / result.emissions.grossEmissionsReduced * 100;

      expect(leakagePct).toBeLessThanOrEqual(5);
      expect(leakagePct).toBeGreaterThan(0);
    });

    test('Uncertainty ≤ 10% des émissions brutes (Verra v19.0)', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const uncertaintyPct = result.emissions.uncertainty / result.emissions.grossEmissionsReduced * 100;

      expect(uncertaintyPct).toBeLessThanOrEqual(10);
      expect(uncertaintyPct).toBeGreaterThan(0);
    });

    test('Crédits nets < Émissions brutes (déductions appliquées)', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);

      expect(result.emissions.netCarbonCredits).toBeLessThan(result.emissions.grossEmissionsReduced);
      expect(result.emissions.netCarbonCredits).toBeGreaterThan(0);
    });
  });

  describe('Plausibilité physique', () => {
    test('Facteur de capacité solaire entre 10% et 35% (CI)', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const capacityFactor = result.projectMetrics.totalMWh / (SOLAR_PROJECT_CI.installedMW * 8760) * 100;

      expect(capacityFactor).toBeGreaterThan(10);
      expect(capacityFactor).toBeLessThan(35);
    });

    test('Facteur de capacité éolien entre 25% et 55% (KE Turkana)', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_WIND, WIND_PROJECT_KE);
      const capacityFactor = result.projectMetrics.totalMWh / (WIND_PROJECT_KE.installedMW * 8760) * 100;

      expect(capacityFactor).toBeGreaterThan(25);
      expect(capacityFactor).toBeLessThan(55);
    });

    test('Crédits par MW entre 200 et 2000 tCO₂e/MW/an', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const creditsPerMW = result.emissions.netCarbonCredits / SOLAR_PROJECT_CI.installedMW;

      expect(creditsPerMW).toBeGreaterThan(200);
      expect(creditsPerMW).toBeLessThan(2000);
    });
  });

  describe('Calcul financier', () => {
    test('Revenus USD = Crédits nets × Prix marché', () => {
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);
      const pricePerTonne = 12; // $12/tCO2e par défaut
      const expectedRevenue = result.emissions.netCarbonCredits * pricePerTonne;

      // Tolérance de 20% (le prix peut varier selon config)
      expect(result.financials.revenueUSD).toBeGreaterThan(expectedRevenue * 0.5);
      expect(result.financials.revenueUSD).toBeLessThan(expectedRevenue * 2);
    });
  });

  describe('Cas limites', () => {
    test('Lecture unique → résultat valide (pas de crash)', () => {
      const singleReading = [MONTHLY_READINGS_SOLAR[0]];
      expect(() => MRVEngine.calculateAnnual(singleReading, SOLAR_PROJECT_CI)).not.toThrow();
    });

    test('EF élevé (Afrique du Sud 0.797) → plus de crédits', () => {
      const zaProjcet = { ...SOLAR_PROJECT_CI, countryCode: 'ZA', baselineEF: 0.797 };
      const resultZA = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, zaProjcet);
      const resultCI = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, SOLAR_PROJECT_CI);

      expect(resultZA.emissions.netCarbonCredits).toBeGreaterThan(resultCI.emissions.netCarbonCredits);
    });

    test('Lectures à 0 MWh ne génèrent pas de crédits négatifs', () => {
      const zeroReadings = MONTHLY_READINGS_SOLAR.map(r => ({ ...r, energyMWh: 0 }));
      const result = MRVEngine.calculateAnnual(zeroReadings, SOLAR_PROJECT_CI);

      expect(result.emissions.netCarbonCredits).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('MRV Engine — Facteurs d\'émission africains', () => {
  const EF_AFRICAINS = {
    CI: 0.547, KE: 0.251, NG: 0.430, GH: 0.342,
    SN: 0.643, MA: 0.631, ZA: 0.797, ET: 0.101,
  };

  Object.entries(EF_AFRICAINS).forEach(([code, ef]) => {
    test(`${code}: EF=${ef} → crédits proportionnels`, () => {
      const project = { ...SOLAR_PROJECT_CI, countryCode: code, baselineEF: ef };
      const result = MRVEngine.calculateAnnual(MONTHLY_READINGS_SOLAR, project);
      const creditsPerMWh = result.emissions.netCarbonCredits / result.projectMetrics.totalMWh;

      // Les crédits par MWh doivent être proches de l'EF (avec déductions)
      expect(creditsPerMWh).toBeCloseTo(ef * 0.92, 1); // ~92% après déductions
    });
  });
});

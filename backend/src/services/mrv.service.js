/**
 * PANGEA CARBON Africa - MRV Calculation Engine
 * Methodology: Verra ACM0002 v19.0
 * "Consolidated methodology for grid-connected electricity generation from renewable sources"
 */

// Facteurs d'émission des réseaux électriques africains (tCO2e/MWh)
// Source: UNFCCC, IEA, Verra country-specific grid emission factors
const AFRICAN_GRID_EMISSION_FACTORS = {
  'CI': { name: "Côte d'Ivoire", ef: 0.547, currency: 'XOF' },
  'KE': { name: 'Kenya',         ef: 0.251, currency: 'KES' },
  'NG': { name: 'Nigeria',       ef: 0.430, currency: 'NGN' },
  'GH': { name: 'Ghana',         ef: 0.342, currency: 'GHS' },
  'SN': { name: 'Sénégal',       ef: 0.643, currency: 'XOF' },
  'TZ': { name: 'Tanzanie',      ef: 0.320, currency: 'TZS' },
  'CM': { name: 'Cameroun',      ef: 0.209, currency: 'XAF' },
  'ET': { name: 'Éthiopie',      ef: 0.101, currency: 'ETB' },
  'ZA': { name: 'Afrique du Sud',ef: 0.797, currency: 'ZAR' },
  'MA': { name: 'Maroc',         ef: 0.631, currency: 'MAD' },
  'EG': { name: 'Égypte',        ef: 0.527, currency: 'EGP' },
  'MZ': { name: 'Mozambique',    ef: 0.119, currency: 'MZN' },
  'RW': { name: 'Rwanda',        ef: 0.329, currency: 'RWF' },
  'UG': { name: 'Ouganda',       ef: 0.191, currency: 'UGX' },
  'ZM': { name: 'Zambie',        ef: 0.284, currency: 'ZMW' },
  'TG': { name: 'Togo',          ef: 0.571, currency: 'XOF' },
  'BJ': { name: 'Bénin',         ef: 0.519, currency: 'XOF' },
  'ML': { name: 'Mali',          ef: 0.598, currency: 'XOF' },
};

// Paramètres ACM0002 par défaut
const ACM0002_PARAMS = {
  LEAKAGE_FACTOR: 0.03,       // 3% de déduction par défaut
  UNCERTAINTY_DEDUCTION: 0.05, // 5% pour incertitude de mesure
  TRANSACTION_COST_PCT: 0.08,  // 8% coûts de vérification
  DEFAULT_MARKET_PRICE_USD: 12.0, // $/tCO2e - prix marché volontaire 2024
};

class MRVEngine {
  /**
   * Calcule les réductions d'émissions selon ACM0002
   * @param {Object} params
   * @param {number} params.energyMWh - Production nette d'électricité (MWh)
   * @param {string} params.countryCode - Code pays ISO 2 lettres
   * @param {number} params.customEF - Facteur d'émission personnalisé (optionnel)
   * @param {number} params.leakagePct - % de fuite (0-1)
   * @param {number} params.marketPriceUSD - Prix carbone $/tCO2e
   * @returns {Object} Résultats MRV complets
   */
  static calculate({ energyMWh, countryCode, customEF, leakagePct, marketPriceUSD }) {
    const countryData = AFRICAN_GRID_EMISSION_FACTORS[countryCode];
    if (!countryData && !customEF) {
      throw new Error(`Facteur d'émission inconnu pour le pays: ${countryCode}`);
    }

    const ef = customEF || countryData.ef;
    const leakage = leakagePct || ACM0002_PARAMS.LEAKAGE_FACTOR;
    const price = marketPriceUSD || ACM0002_PARAMS.DEFAULT_MARKET_PRICE_USD;

    // Étape 1: Réductions d'émissions brutes
    // ER = EG_RE × EF_grid (ACM0002 §3.1)
    const grossEmissionReductions = energyMWh * ef;

    // Étape 2: Déduction fuites (leakage)
    const leakageDeduction = grossEmissionReductions * leakage;

    // Étape 3: Déduction incertitude de mesure
    const uncertaintyDeduction = grossEmissionReductions * ACM0002_PARAMS.UNCERTAINTY_DEDUCTION;

    // Étape 4: Crédits carbone nets (tCO2e)
    const netCarbonCredits = grossEmissionReductions - leakageDeduction - uncertaintyDeduction;

    // Étape 5: Revenus potentiels
    const grossRevenueUSD = netCarbonCredits * price;
    const transactionCosts = grossRevenueUSD * ACM0002_PARAMS.TRANSACTION_COST_PCT;
    const netRevenueUSD = grossRevenueUSD - transactionCosts;

    // Métriques additionnelles
    const equivalents = {
      carsOffRoad: Math.round(netCarbonCredits / 4.6),          // 4.6 tCO2/voiture/an
      treesPlanted: Math.round(netCarbonCredits * 40),           // 1 arbre = 25kg CO2/an
      homesElectrified: Math.round(energyMWh / 3.5),            // 3.5 MWh/foyer/an (Afrique)
      householdsForYear: Math.round(energyMWh / 3.5),
    };

    return {
      input: {
        energyMWh: parseFloat(energyMWh.toFixed(2)),
        countryCode,
        gridEmissionFactor: ef,
        countryName: countryData?.name || 'Personnalisé',
        methodology: 'Verra ACM0002 v19.0',
      },
      emissions: {
        grossReductions: parseFloat(grossEmissionReductions.toFixed(2)),
        leakageDeduction: parseFloat(leakageDeduction.toFixed(2)),
        uncertaintyDeduction: parseFloat(uncertaintyDeduction.toFixed(2)),
        netCarbonCredits: parseFloat(netCarbonCredits.toFixed(2)),
      },
      financials: {
        marketPriceUSD: price,
        grossRevenueUSD: parseFloat(grossRevenueUSD.toFixed(2)),
        transactionCostsUSD: parseFloat(transactionCosts.toFixed(2)),
        netRevenueUSD: parseFloat(netRevenueUSD.toFixed(2)),
        revenuePerMWh: parseFloat((netRevenueUSD / energyMWh).toFixed(2)),
      },
      equivalents,
      compliance: {
        standard: 'Verra Verified Carbon Standard (VCS)',
        methodology: 'ACM0002',
        reportingPeriod: 'Annual',
        verificationRequired: true,
      }
    };
  }

  /**
   * Calcule le MRV annuel d'un projet à partir de ses readings
   * @param {Array} readings - Lectures d'énergie sur l'année
   * @param {Object} project - Données du projet
   * @returns {Object} MRV annuel complet
   */
  static calculateAnnual(readings, project) {
    const totalMWh = readings.reduce((sum, r) => sum + r.energyMWh, 0);
    const avgAvailability = readings.reduce((sum, r) => sum + (r.availabilityPct || 85), 0) / readings.length;

    const result = this.calculate({
      energyMWh: totalMWh,
      countryCode: project.countryCode,
      customEF: project.baselineEF,
      marketPriceUSD: ACM0002_PARAMS.DEFAULT_MARKET_PRICE_USD,
    });

    // Métriques de performance projet
    const capacityFactor = (totalMWh / (project.installedMW * 8760)) * 100;
    const theoreticalMax = project.installedMW * 8760;

    return {
      ...result,
      projectMetrics: {
        installedMW: project.installedMW,
        totalMWh: parseFloat(totalMWh.toFixed(2)),
        capacityFactorPct: parseFloat(capacityFactor.toFixed(1)),
        availabilityPct: parseFloat(avgAvailability.toFixed(1)),
        readingsCount: readings.length,
      }
    };
  }

  /**
   * Retourne tous les pays supportés avec leurs facteurs
   */
  static getSupportedCountries() {
    return Object.entries(AFRICAN_GRID_EMISSION_FACTORS).map(([code, data]) => ({
      code,
      ...data,
    }));
  }

  /**
   * Projection de revenus sur N années
   */
  static projectRevenue({ energyMWh, countryCode, years, annualGrowthPct = 0, priceEscalationPct = 3 }) {
    const projections = [];
    let currentEnergy = energyMWh;
    let currentPrice = ACM0002_PARAMS.DEFAULT_MARKET_PRICE_USD;

    for (let year = 1; year <= years; year++) {
      const result = this.calculate({
        energyMWh: currentEnergy,
        countryCode,
        marketPriceUSD: currentPrice,
      });
      projections.push({
        year,
        energyMWh: parseFloat(currentEnergy.toFixed(2)),
        carbonCredits: result.emissions.netCarbonCredits,
        revenueUSD: result.financials.netRevenueUSD,
      });
      currentEnergy *= (1 + annualGrowthPct / 100);
      currentPrice *= (1 + priceEscalationPct / 100);
    }

    const totalRevenue = projections.reduce((s, p) => s + p.revenueUSD, 0);
    const totalCredits = projections.reduce((s, p) => s + p.carbonCredits, 0);

    return { projections, totalRevenue: parseFloat(totalRevenue.toFixed(2)), totalCredits: parseFloat(totalCredits.toFixed(2)) };
  }
}

module.exports = { MRVEngine, AFRICAN_GRID_EMISSION_FACTORS, ACM0002_PARAMS };

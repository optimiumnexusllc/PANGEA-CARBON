/**
 * PANGEA CARBON Africa - MRV Calculation Engine
 * Methodology: Verra ACM0002 v19.0
 * "Consolidated methodology for grid-connected electricity generation from renewable sources"
 */

// Facteurs d'émission des réseaux électriques africains (tCO2e/MWh)
// Source: UNFCCC, IEA Africa Energy Outlook 2024, Verra country-specific EF
// Mis à jour: Avril 2026 — Données IEA 2022-2024
const AFRICAN_GRID_EMISSION_FACTORS = {
  // ── AFRIQUE DE L'OUEST ────────────────────────────────────────────────────
  'CI': { name: "Côte d'Ivoire",     ef: 0.547, currency: 'XOF', region: 'WEST',   source: 'UNFCCC 2024' },
  'GH': { name: 'Ghana',             ef: 0.342, currency: 'GHS', region: 'WEST',   source: 'UNFCCC 2024' },
  'NG': { name: 'Nigeria',           ef: 0.430, currency: 'NGN', region: 'WEST',   source: 'IEA 2024' },
  'SN': { name: 'Sénégal',           ef: 0.643, currency: 'XOF', region: 'WEST',   source: 'UNFCCC 2024' },
  'ML': { name: 'Mali',              ef: 0.598, currency: 'XOF', region: 'WEST',   source: 'UNFCCC 2024' },
  'BF': { name: 'Burkina Faso',      ef: 0.674, currency: 'XOF', region: 'WEST',   source: 'IEA 2023' },
  'TG': { name: 'Togo',              ef: 0.571, currency: 'XOF', region: 'WEST',   source: 'UNFCCC 2024' },
  'BJ': { name: 'Bénin',             ef: 0.519, currency: 'XOF', region: 'WEST',   source: 'UNFCCC 2024' },
  'NE': { name: 'Niger',             ef: 0.712, currency: 'XOF', region: 'WEST',   source: 'IEA 2023' },
  'GN': { name: 'Guinée',            ef: 0.296, currency: 'GNF', region: 'WEST',   source: 'IEA 2023' },
  'GM': { name: 'Gambie',            ef: 0.672, currency: 'GMD', region: 'WEST',   source: 'IEA 2023' },
  'GW': { name: 'Guinée-Bissau',     ef: 0.641, currency: 'XOF', region: 'WEST',   source: 'IEA 2023' },
  'SL': { name: 'Sierra Leone',      ef: 0.263, currency: 'SLL', region: 'WEST',   source: 'IEA 2023' },
  'LR': { name: 'Liberia',           ef: 0.352, currency: 'LRD', region: 'WEST',   source: 'IEA 2023' },
  'MR': { name: 'Mauritanie',        ef: 0.558, currency: 'MRU', region: 'WEST',   source: 'IEA 2023' },
  'CV': { name: 'Cap-Vert',          ef: 0.614, currency: 'CVE', region: 'WEST',   source: 'IEA 2023' },

  // ── AFRIQUE CENTRALE ─────────────────────────────────────────────────────
  'CM': { name: 'Cameroun',          ef: 0.209, currency: 'XAF', region: 'CENTRAL', source: 'UNFCCC 2024' },
  'CD': { name: 'RD Congo',          ef: 0.030, currency: 'CDF', region: 'CENTRAL', source: 'IEA 2024' },
  'CG': { name: 'Congo',             ef: 0.281, currency: 'XAF', region: 'CENTRAL', source: 'IEA 2023' },
  'GA': { name: 'Gabon',             ef: 0.342, currency: 'XAF', region: 'CENTRAL', source: 'IEA 2023' },
  'GQ': { name: 'Guinée équatoriale',ef: 0.527, currency: 'XAF', region: 'CENTRAL', source: 'IEA 2023' },
  'CF': { name: 'Centrafrique',      ef: 0.187, currency: 'XAF', region: 'CENTRAL', source: 'IEA 2023' },
  'TD': { name: 'Tchad',             ef: 0.624, currency: 'XAF', region: 'CENTRAL', source: 'IEA 2023' },
  'ST': { name: 'São Tomé-et-Príncipe',ef:0.683, currency:'STN', region: 'CENTRAL', source: 'IEA 2023' },

  // ── AFRIQUE DE L'EST ──────────────────────────────────────────────────────
  'KE': { name: 'Kenya',             ef: 0.251, currency: 'KES', region: 'EAST',   source: 'UNFCCC 2024' },
  'TZ': { name: 'Tanzanie',          ef: 0.320, currency: 'TZS', region: 'EAST',   source: 'UNFCCC 2024' },
  'ET': { name: 'Éthiopie',          ef: 0.101, currency: 'ETB', region: 'EAST',   source: 'UNFCCC 2024' },
  'RW': { name: 'Rwanda',            ef: 0.329, currency: 'RWF', region: 'EAST',   source: 'UNFCCC 2024' },
  'UG': { name: 'Ouganda',           ef: 0.191, currency: 'UGX', region: 'EAST',   source: 'UNFCCC 2024' },
  'MZ': { name: 'Mozambique',        ef: 0.119, currency: 'MZN', region: 'EAST',   source: 'UNFCCC 2024' },
  'MG': { name: 'Madagascar',        ef: 0.517, currency: 'MGA', region: 'EAST',   source: 'IEA 2023' },
  'ZW': { name: 'Zimbabwe',          ef: 0.537, currency: 'ZWL', region: 'EAST',   source: 'IEA 2024' },
  'MW': { name: 'Malawi',            ef: 0.278, currency: 'MWK', region: 'EAST',   source: 'IEA 2023' },
  'BI': { name: 'Burundi',           ef: 0.182, currency: 'BIF', region: 'EAST',   source: 'IEA 2023' },
  'SO': { name: 'Somalie',           ef: 0.663, currency: 'SOS', region: 'EAST',   source: 'IEA 2023' },
  'DJ': { name: 'Djibouti',          ef: 0.577, currency: 'DJF', region: 'EAST',   source: 'IEA 2023' },
  'ER': { name: 'Érythrée',          ef: 0.728, currency: 'ERN', region: 'EAST',   source: 'IEA 2023' },
  'SS': { name: 'Soudan du Sud',     ef: 0.643, currency: 'SSP', region: 'EAST',   source: 'IEA 2023' },
  'SD': { name: 'Soudan',            ef: 0.352, currency: 'SDG', region: 'EAST',   source: 'IEA 2023' },
  'SC': { name: 'Seychelles',        ef: 0.621, currency: 'SCR', region: 'EAST',   source: 'IEA 2023' },
  'KM': { name: 'Comores',           ef: 0.712, currency: 'KMF', region: 'EAST',   source: 'IEA 2023' },
  'MU': { name: 'Maurice',           ef: 0.619, currency: 'MUR', region: 'EAST',   source: 'IEA 2023' },

  // ── AFRIQUE AUSTRALE ─────────────────────────────────────────────────────
  'ZA': { name: 'Afrique du Sud',    ef: 0.797, currency: 'ZAR', region: 'SOUTH',  source: 'UNFCCC 2024' },
  'ZM': { name: 'Zambie',            ef: 0.284, currency: 'ZMW', region: 'SOUTH',  source: 'UNFCCC 2024' },
  'NA': { name: 'Namibie',           ef: 0.348, currency: 'NAD', region: 'SOUTH',  source: 'IEA 2024' },
  'BW': { name: 'Botswana',          ef: 1.027, currency: 'BWP', region: 'SOUTH',  source: 'IEA 2024' },
  'SZ': { name: 'Eswatini',          ef: 0.129, currency: 'SZL', region: 'SOUTH',  source: 'IEA 2023' },
  'LS': { name: 'Lesotho',           ef: 0.021, currency: 'LSL', region: 'SOUTH',  source: 'IEA 2023' },
  'AO': { name: 'Angola',            ef: 0.350, currency: 'AOA', region: 'SOUTH',  source: 'IEA 2024' },
  'MV': { name: 'Maldives',          ef: 0.691, currency: 'MVR', region: 'SOUTH',  source: 'IEA 2023' },

  // ── AFRIQUE DU NORD ──────────────────────────────────────────────────────
  'MA': { name: 'Maroc',             ef: 0.631, currency: 'MAD', region: 'NORTH',  source: 'UNFCCC 2024' },
  'EG': { name: 'Égypte',            ef: 0.527, currency: 'EGP', region: 'NORTH',  source: 'UNFCCC 2024' },
  'DZ': { name: 'Algérie',           ef: 0.562, currency: 'DZD', region: 'NORTH',  source: 'IEA 2024' },
  'TN': { name: 'Tunisie',           ef: 0.490, currency: 'TND', region: 'NORTH',  source: 'IEA 2024' },
  'LY': { name: 'Libye',             ef: 0.643, currency: 'LYD', region: 'NORTH',  source: 'IEA 2023' },
  'SD': { name: 'Soudan',            ef: 0.352, currency: 'SDG', region: 'NORTH',  source: 'IEA 2023' },
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

/**
 * PANGEA CARBON — Carbon Credit Scoring Engine v1.0
 * Proprietary methodology — All rights reserved
 * 
 * Analogie: S&P/Moody's pour les crédits carbone africains
 * Score composite 0-100 → Grade AAA, AA, A, BBB, BB, B, CCC
 */

const VVB_SCORES = {
  'Bureau Veritas':    { score: 9.8, tier: 'PREMIUM' },
  'DNV AS':           { score: 9.7, tier: 'PREMIUM' },
  'SGS SA':           { score: 9.5, tier: 'PREMIUM' },
  'SCS Global':       { score: 9.2, tier: 'STANDARD' },
  'AENOR':            { score: 8.8, tier: 'STANDARD' },
  'RINA Services':    { score: 8.5, tier: 'STANDARD' },
  'default':          { score: 7.0, tier: 'BASIC' },
};

const REGISTRY_SCORES = {
  'VERRA_VCS':      10.0,
  'GOLD_STANDARD':  10.0,
  'ARTICLE6':        9.5,
  'CORSIA':          9.0,
};

const METHODOLOGY_SCORES = {
  'ACM0002':  10.0, // Grid electricity renewable
  'AMS-I.D':   9.5, // Small-scale renewable
  'VM0041':    9.5, // Soil carbon
  'VM0007':    9.0, // REDD+
  'default':   8.0,
};

function getVintageScore(vintage) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - vintage;
  if (age <= 1)  return 10.0;
  if (age <= 2)  return 9.5;
  if (age <= 3)  return 9.0;
  if (age <= 5)  return 8.0;
  if (age <= 7)  return 7.0;
  if (age <= 10) return 6.0;
  return 5.0;
}

function getAdditionalityScore(project) {
  let score = 7.0;
  // Pays à faible accès à l'électricité → additionnalité plus forte
  const highAdditionality = ['NG','CD','SS','CF','TD','MW','BI','MG'];
  if (highAdditionality.includes(project.countryCode)) score += 1.5;
  // Projet solaire dans pays dépendant du diesel → très additionnel
  if (project.type === 'SOLAR' || project.type === 'WIND') score += 0.5;
  // Hydro run-of-river → additionnalité modérée
  if (project.type === 'HYDRO') score += 0.3;
  // Taille: petits projets moins suspects
  if (project.installedMW < 50) score += 0.5;
  return Math.min(10, score);
}

function getPermanenceScore(standard, type) {
  let score = 8.0;
  if (standard === 'VERRA_VCS' || standard === 'GOLD_STANDARD') score = 9.5;
  if (type === 'SOLAR' || type === 'WIND') score = 10.0; // Pas de risque de réversion
  if (type === 'BIOMASS') score = 8.0;
  return score;
}

function getCoBenefitsScore(project) {
  let score = 6.0;
  // Accès énergie en zone rurale → SDG 7
  if (project.description?.toLowerCase().includes('rural')) score += 1.0;
  // Création emplois locaux
  if (project.description?.toLowerCase().includes('emploi') || 
      project.description?.toLowerCase().includes('job')) score += 0.5;
  // Biodiversité
  if (project.type === 'HYDRO') score += 0.5;
  // Gold Standard = toujours des co-bénéfices vérifiés
  if (project.standard === 'GOLD_STANDARD') score = Math.max(score, 8.5);
  return Math.min(10, score);
}

function gradeFromScore(score) {
  if (score >= 92) return 'AAA';
  if (score >= 85) return 'AA';
  if (score >= 78) return 'A';
  if (score >= 68) return 'BBB';
  if (score >= 58) return 'BB';
  if (score >= 45) return 'B';
  return 'CCC';
}

function premiumFromGrade(grade) {
  const premiums = { AAA: 35, AA: 25, A: 15, BBB: 8, BB: 3, B: 0, CCC: -5 };
  return premiums[grade] || 0;
}

function calculateScore({ project, pipeline, issuance }) {
  const vvbKey = Object.keys(VVB_SCORES).find(k => pipeline?.vvbName?.includes(k)) || 'default';
  const vvbScore = VVB_SCORES[vvbKey].score;
  const vintageScore = getVintageScore(issuance.vintage);
  const additionalityScore = getAdditionalityScore(project);
  const permanenceScore = getPermanenceScore(issuance.standard, project.type);
  const methodologyKey = Object.keys(METHODOLOGY_SCORES).find(k => pipeline?.methodology?.includes(k)) || 'default';
  const methodologyScore = METHODOLOGY_SCORES[methodologyKey];
  const registryScore = REGISTRY_SCORES[issuance.standard] || 8.0;
  const coBenefitsScore = getCoBenefitsScore(project);

  // Pondération PANGEA propriétaire
  const composite = (
    additionalityScore  * 0.22 +  // 22% — Additionality est le critère #1
    permanenceScore     * 0.18 +  // 18% — Durabilité du projet
    vvbScore            * 0.18 +  // 18% — Qualité du vérificateur
    registryScore       * 0.15 +  // 15% — Crédibilité du registre
    vintageScore        * 0.12 +  // 12% — Fraîcheur du vintage
    methodologyScore    * 0.10 +  // 10% — Robustesse méthodo
    coBenefitsScore     * 0.05    //  5% — Co-bénéfices
  ) * 10; // ramener sur 100

  const grade = gradeFromScore(composite);
  const premiumPct = premiumFromGrade(grade);

  return {
    score: Math.round(composite * 10) / 10,
    grade,
    premiumPct,
    additionalityScore,
    permanenceScore,
    vvbScore,
    vintageScore,
    methodologyScore,
    registryScore,
    coBenefitsScore,
    vvbTier: VVB_SCORES[vvbKey].tier,
    scoredBy: 'PANGEA_ENGINE_V2',
  };
}

module.exports = { calculateScore, gradeFromScore, premiumFromGrade };

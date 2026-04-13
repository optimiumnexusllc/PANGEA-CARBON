/**
 * PANGEA CARBON — Middleware de validation centralisé
 * Sprint 1 — Sécurité: input sanitization sur toutes les routes
 */
const { body, param, query, validationResult } = require('express-validator');

// Helper: retourner les erreurs en JSON
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Données invalides',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Règles réutilisables
const rules = {
  // Projets
  project: [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nom requis (2-100 caractères)'),
    body('type').isIn(['SOLAR', 'WIND', 'HYDRO', 'BIOMASS', 'HYBRID']).withMessage('Type invalide'),
    body('installedMW').isFloat({ min: 0.01, max: 50000 }).withMessage('Puissance invalide (0.01-50000 MW)'),
    body('countryCode').isLength({ min: 2, max: 3 }).matches(/^[A-Z]+$/).withMessage('Code pays invalide (ex: CI, KE)'),
    body('baselineEF').optional().isFloat({ min: 0.01, max: 2.0 }).withMessage('EF baseline invalide'),
    body('startDate').optional().isDate().withMessage('Date de début invalide'),
  ],

  // Lectures MRV
  reading: [
    body('energyMWh').isFloat({ min: 0, max: 1000000 }).withMessage('Production MWh invalide'),
    body('periodStart').isISO8601().withMessage('Date début invalide (ISO8601)'),
    body('periodEnd').isISO8601().withMessage('Date fin invalide (ISO8601)')
      .custom((end, { req }) => {
        if (new Date(end) <= new Date(req.body.periodStart)) throw new Error('Date fin doit être après date début');
        return true;
      }),
    body('availabilityPct').optional().isFloat({ min: 0, max: 100 }).withMessage('Disponibilité invalide (0-100%)'),
    body('peakPowerMW').optional().isFloat({ min: 0 }).withMessage('Puissance crête invalide'),
  ],

  // SDG scores
  sdgScore: [
    body('projectId').notEmpty().withMessage('projectId requis'),
    body('year').isInt({ min: 2000, max: 2050 }).withMessage('Année invalide'),
    body('jobsCreated').optional().isInt({ min: 0, max: 100000 }).withMessage('Emplois créés invalide'),
    body('householdsElectrified').optional().isInt({ min: 0, max: 10000000 }).withMessage('Foyers invalide'),
    // Valider les 17 SDG (0-10 chacun)
    ...Array.from({ length: 17 }, (_, i) =>
      body(`sdgInputs.sdg${i + 1}`).optional().isFloat({ min: 0, max: 10 }).withMessage(`SDG${i + 1} doit être entre 0 et 10`)
    ),
  ],

  // ITMO
  itmo: [
    body('projectId').notEmpty().withMessage('projectId requis'),
    body('year').isInt({ min: 2020, max: 2050 }).withMessage('Année invalide'),
    body('hostCountry').isLength({ min: 2, max: 3 }).withMessage('Pays hôte invalide'),
    body('buyingCountry').isLength({ min: 2, max: 3 }).withMessage('Pays acheteur invalide'),
    body('itmoQuantity').isFloat({ min: 1 }).withMessage('Quantité ITMO invalide (minimum 1 tCO₂e)'),
  ],

  // Equipment API
  equipmentReading: [
    body('energy_mwh').optional().isFloat({ min: 0, max: 1000000 }).withMessage('energy_mwh invalide'),
    body('energy_kwh').optional().isFloat({ min: 0, max: 1000000000 }).withMessage('energy_kwh invalide'),
    body('availability_pct').optional().isFloat({ min: 0, max: 100 }).withMessage('availability_pct invalide'),
    body('timestamp').optional().isISO8601().withMessage('timestamp invalide'),
  ],

  // Projection
  projection: [
    body('years').optional().isInt({ min: 1, max: 30 }).withMessage('Horizon invalide (1-30 ans)'),
    body('carbonPrice').optional().isFloat({ min: 1, max: 500 }).withMessage('Prix carbone invalide (1-500 $/t)'),
    body('additionalMW').optional().isFloat({ min: 0, max: 10000 }).withMessage('MW additionnels invalide'),
  ],

  // Blockchain emission
  creditIssuance: [
    body('projectId').notEmpty().withMessage('projectId requis'),
    body('vintage').isInt({ min: 2015, max: 2050 }).withMessage('Vintage invalide'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
    body('standard').isIn(['VERRA_VCS', 'GOLD_STANDARD', 'ARTICLE6', 'CORSIA']).withMessage('Standard invalide'),
  ],

  // ID param
  id: [
    param('projectId').optional().isLength({ min: 1, max: 50 }).matches(/^[a-zA-Z0-9_-]+$/).withMessage('ID invalide'),
  ],
};

module.exports = { validate, rules };

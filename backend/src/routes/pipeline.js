/**
 * PANGEA CARBON — Credit Issuance Pipeline Engine
 * Palantir god+++ — Workflow complet de création de crédits carbone
 *
 * LE VRAI WORKFLOW D'UN CRÉDIT CARBONE (Verra ACM0002):
 * ─────────────────────────────────────────────────────
 * ÉTAPE 1: MRV DATA          → Données de production collectées (API/CSV)
 * ÉTAPE 2: MRV CALCULATION   → Calcul ACM0002 (crédits estimés)
 * ÉTAPE 3: PDD               → Project Design Document rédigé
 * ÉTAPE 4: VVB VALIDATION    → Auditeur tiers valide la méthodologie
 * ÉTAPE 5: MONITORING PERIOD → Période de monitoring (1 an minimum)
 * ÉTAPE 6: MONITORING REPORT → Rapport annuel compilé
 * ÉTAPE 7: VVB VERIFICATION  → Auditeur vérifie les données réelles
 * ÉTAPE 8: REGISTRY SUBMIT   → Soumission à Verra/Gold Standard
 * ÉTAPE 9: REGISTRY REVIEW   → Verra examine et approuve (4-12 semaines)
 * ÉTAPE 10: CREDIT ISSUANCE  → VCUs/GS crédits émis sur le registre
 * ÉTAPE 11: MARKET LISTING   → Disponibles sur la marketplace PANGEA
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const prisma = new PrismaClient();
const { MRVEngine } = require('../services/mrv.service');

// ─── Définition des étapes du pipeline ───────────────────────────────────────
const PIPELINE_STEPS = [
  {
    key: 'MRV_DATA', number: 1, title: 'MRV Data Collection',
    titleFr: 'Collecte données MRV',
    description: 'Energy production data collected via API or CSV import. Minimum 12 months required.',
    icon: '📊', duration: '1-12 months', requirement: 'min 12 readings',
    autoComplete: true, // Complété automatiquement si données présentes
  },
  {
    key: 'MRV_CALCULATION', number: 2, title: 'MRV Calculation (ACM0002)',
    titleFr: 'Calcul MRV ACM0002',
    description: 'Gross emission reductions calculated per Verra ACM0002 v22.0. Leakage and uncertainty deducted.',
    icon: '🧮', duration: '1 day', requirement: 'MRV data complete',
    autoComplete: true,
  },
  {
    key: 'PDD', number: 3, title: 'Project Design Document',
    titleFr: 'Document de Conception de Projet',
    description: 'PDD describes the project activity, methodology, baseline, additionality demonstration, and monitoring plan.',
    icon: '📄', duration: '2-6 weeks', requirement: 'Technical team',
    autoComplete: false,
  },
  {
    key: 'VVB_VALIDATION', number: 4, title: 'VVB Validation',
    titleFr: 'Validation par le VVB',
    description: 'Accredited Validation & Verification Body (VVB) reviews and validates the PDD and methodology.',
    icon: '🏛️', duration: '4-16 weeks', requirement: 'Accredited VVB (Bureau Veritas, SGS, DNV, etc.)',
    autoComplete: false,
  },
  {
    key: 'MONITORING_PERIOD', number: 5, title: 'Monitoring Period',
    titleFr: 'Période de Monitoring',
    description: 'Continuous monitoring of energy production during the crediting period. IoT/SCADA data required.',
    icon: '📡', duration: '12 months minimum', requirement: 'Continuous IoT/SCADA',
    autoComplete: true,
  },
  {
    key: 'MONITORING_REPORT', number: 6, title: 'Monitoring Report',
    titleFr: 'Rapport de Monitoring',
    description: 'Annual monitoring report compiled with all production data, grid emission factors, and credit calculations.',
    icon: '📋', duration: '2-4 weeks', requirement: 'Monitoring data + QA/QC',
    autoComplete: false,
  },
  {
    key: 'VVB_VERIFICATION', number: 7, title: 'VVB Verification',
    titleFr: 'Vérification par le VVB',
    description: 'VVB independently verifies the monitoring report, spot-checks data, and issues verification statement.',
    icon: '✅', duration: '4-8 weeks', requirement: 'Same or different VVB',
    autoComplete: false,
  },
  {
    key: 'REGISTRY_SUBMISSION', number: 8, title: 'Registry Submission',
    titleFr: 'Soumission au Registre',
    description: 'All documents submitted to Verra/Gold Standard registry. Registry fee paid.',
    icon: '📤', duration: '1 week', requirement: 'Registry account + fees',
    autoComplete: false,
  },
  {
    key: 'REGISTRY_REVIEW', number: 9, title: 'Registry Review & Approval',
    titleFr: 'Examen Registre',
    description: 'Verra/GS reviews the submission. Public stakeholder consultation period (30 days). Final approval.',
    icon: '🔍', duration: '4-12 weeks', requirement: 'Registry process',
    autoComplete: false,
  },
  {
    key: 'CREDIT_ISSUANCE', number: 10, title: 'Credit Issuance',
    titleFr: 'Émission des Crédits',
    description: 'VCUs issued on the official registry and recorded on PANGEA CARBON blockchain. Serial numbers assigned.',
    icon: '🌿', duration: '1 day', requirement: 'Registry approval',
    autoComplete: false,
  },
  {
    key: 'MARKET_LISTING', number: 11, title: 'Marketplace Listing',
    titleFr: 'Listing Marketplace',
    description: 'Credits listed on PANGEA CARBON Exchange. Priced based on live CBL market reference.',
    icon: '🏪', duration: '1 day', requirement: 'Credits issued',
    autoComplete: true,
  },
];

const STEP_MAP = Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, s]));

// ─── Helper: créer les étapes d'un pipeline ──────────────────────────────────
async function createPipelineSteps(pipelineId) {
  for (const step of PIPELINE_STEPS) {
    await prisma.pipelineStep.create({
      data: {
        pipelineId, stepKey: step.key, stepNumber: step.number,
        title: step.title, status: step.number === 1 ? 'IN_PROGRESS' : 'PENDING',
        data: { description: step.description, icon: step.icon, duration: step.duration },
      }
    });
  }
}

// ─── Helper: avancer le pipeline ─────────────────────────────────────────────
async function advancePipeline(pipelineId, completedKey, data = {}, userId = 'system') {
  const step = await prisma.pipelineStep.findUnique({
    where: { pipelineId_stepKey: { pipelineId, stepKey: completedKey } }
  });
  if (!step || step.status === 'COMPLETED') return;

  // Marquer l'étape courante comme complète
  await prisma.pipelineStep.update({
    where: { id: step.id },
    data: { status: 'COMPLETED', completedAt: new Date(), completedBy: userId, data: { ...step.data, ...data } }
  });

  // Trouver et activer la prochaine étape
  const nextStepDef = PIPELINE_STEPS.find(s => s.number === step.stepNumber + 1);
  if (nextStepDef) {
    await prisma.pipelineStep.update({
      where: { pipelineId_stepKey: { pipelineId, stepKey: nextStepDef.key } },
      data: { status: 'IN_PROGRESS', startedAt: new Date() }
    });
    // Mettre à jour currentStep du pipeline
    await prisma.creditPipeline.update({
      where: { id: pipelineId },
      data: { currentStep: nextStepDef.key, updatedAt: new Date() }
    });
  }
}

// ─── POST /pipeline — Démarrer un nouveau pipeline ───────────────────────────
router.post('/', auth, async (req, res, next) => {
  try {
    const { projectId, vintage, standard } = req.body;
    if (!projectId || !vintage) return res.status(400).json({ error: 'projectId and vintage required' });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        energyReadings: { where: { periodStart: { gte: new Date(`${vintage}-01-01`), lte: new Date(`${vintage}-12-31`) } } },
        mRVRecords: { where: { year: parseInt(vintage) } },
      }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const orgId = project.organizationId || req.user.organizationId || 'default';

    // Calculer l'estimation initiale via MRV Engine
    let estimatedCredits = 0;
    if (project.energyReadings.length > 0) {
      const mrvResult = MRVEngine.calculateAnnual(project.energyReadings, project);
      estimatedCredits = mrvResult.emissions.netCarbonCredits;
    } else if (project.installedMW) {
      // Estimation sans données: CF moyen africain 25%
      estimatedCredits = project.installedMW * 8760 * 0.25 * 0.85 * (project.gridEmissionFactor || 0.4) * 0.92;
    }

    // Créer le pipeline
    const pipeline = await prisma.creditPipeline.create({
      data: {
        projectId, organizationId: orgId,
        vintage: parseInt(vintage),
        standard: standard || 'VERRA_VCS',
        estimatedCredits: Math.round(estimatedCredits),
        currentStep: 'MRV_DATA',
        status: 'ACTIVE',
      }
    });

    await createPipelineSteps(pipeline.id);

    // Auto-compléter MRV_DATA si données présentes
    if (project.energyReadings.length >= 12) {
      await advancePipeline(pipeline.id, 'MRV_DATA', {
        readingsCount: project.energyReadings.length,
        totalMWh: project.energyReadings.reduce((s, r) => s + r.energyMWh, 0),
      }, req.user.userId);
      // Auto-compléter MRV_CALCULATION
      await advancePipeline(pipeline.id, 'MRV_CALCULATION', {
        estimatedCredits,
        methodology: 'ACM0002 v22.0',
        gridEF: project.gridEmissionFactor,
      }, req.user.userId);
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'PIPELINE_CREATED',
        entity: 'CreditPipeline', entityId: pipeline.id,
        after: { projectId, vintage, standard, estimatedCredits }
      }
    });

    const full = await prisma.creditPipeline.findUnique({
      where: { id: pipeline.id },
      include: { steps: { orderBy: { stepNumber: 'asc' } }, project: { select: { name: true, countryCode: true, type: true } } }
    });

    res.status(201).json({ pipeline: full, steps: PIPELINE_STEPS, message: `Pipeline créé — ${estimatedCredits.toFixed(0)} tCO₂e estimés` });
  } catch(e) { next(e); }
});

// ─── GET /pipeline — Liste des pipelines ─────────────────────────────────────
router.get('/', auth, async (req, res, next) => {
  try {
    const pipelines = await prisma.creditPipeline.findMany({
      where: { organizationId: req.user.organizationId || undefined },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        project: { select: { name: true, countryCode: true, type: true, installedMW: true } },
        _count: { select: { documents: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ pipelines, total: pipelines.length, stepDefinitions: PIPELINE_STEPS });
  } catch(e) { next(e); }
});

// ─── GET /pipeline/:id — Détail d'un pipeline ────────────────────────────────
router.get('/:id', auth, async (req, res, next) => {
  try {
    const pipeline = await prisma.creditPipeline.findUnique({
      where: { id: req.params.id },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        project: { include: {
          energyReadings: { take: 5, orderBy: { periodStart: 'desc' } },
          mRVRecords: { take: 3, orderBy: { year: 'desc' } },
        }}
      }
    });
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

    const completedSteps = pipeline.steps.filter(s => s.status === 'COMPLETED').length;
    const progress = Math.round((completedSteps / PIPELINE_STEPS.length) * 100);

    res.json({ pipeline, progress, stepDefinitions: PIPELINE_STEPS });
  } catch(e) { next(e); }
});

// ─── POST /pipeline/:id/advance — Valider une étape ──────────────────────────
router.post('/:id/advance', auth, async (req, res, next) => {
  try {
    const { stepKey, data, notes } = req.body;
    if (!stepKey) return res.status(400).json({ error: 'stepKey required' });

    const pipeline = await prisma.creditPipeline.findUnique({ where: { id: req.params.id } });
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

    await advancePipeline(req.params.id, stepKey, { ...data, notes }, req.user.userId);

    // Logique spéciale pour l'émission finale
    if (stepKey === 'REGISTRY_REVIEW') {
      // Émettre les crédits sur la blockchain PANGEA CARBON
      const credits = await issueCarbonCredits(pipeline, req.user.userId);
      await prisma.creditPipeline.update({
        where: { id: req.params.id },
        data: { issuanceId: credits.id, approvedAt: new Date() }
      });
    }

    if (stepKey === 'CREDIT_ISSUANCE') {
      await prisma.creditPipeline.update({
        where: { id: req.params.id },
        data: { status: 'ACTIVE', issuedAt: new Date() }
      });
    }

    if (stepKey === 'MARKET_LISTING') {
      await prisma.creditPipeline.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED' }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId, action: 'PIPELINE_STEP_ADVANCED',
        entity: 'CreditPipeline', entityId: req.params.id,
        after: { stepKey, notes }
      }
    });

    const updated = await prisma.creditPipeline.findUnique({
      where: { id: req.params.id },
      include: { steps: { orderBy: { stepNumber: 'asc' } } }
    });
    res.json({ pipeline: updated });
  } catch(e) { next(e); }
});

// ─── POST /pipeline/:id/block — Bloquer une étape ────────────────────────────
router.post('/:id/block', auth, async (req, res, next) => {
  try {
    const { stepKey, reason } = req.body;
    await prisma.pipelineStep.update({
      where: { pipelineId_stepKey: { pipelineId: req.params.id, stepKey } },
      data: { status: 'BLOCKED', notes: reason }
    });
    await prisma.creditPipeline.update({ where: { id: req.params.id }, data: { status: 'BLOCKED' } });
    res.json({ blocked: true, stepKey, reason });
  } catch(e) { next(e); }
});

// ─── POST /pipeline/:id/documents — Uploader un document ─────────────────────
router.post('/:id/documents', auth, async (req, res, next) => {
  try {
    const { type, name, fileUrl } = req.body;
    const hash = crypto.createHash('sha256').update(fileUrl || name).digest('hex').slice(0, 16);
    const doc = await prisma.pipelineDocument.create({
      data: { pipelineId: req.params.id, type, name, fileUrl: fileUrl || null, hash, uploadedBy: req.user.userId }
    });
    res.status(201).json(doc);
  } catch(e) { next(e); }
});

// ─── POST /pipeline/:id/assign-vvb — Assigner un VVB ────────────────────────
router.post('/:id/assign-vvb', auth, async (req, res, next) => {
  try {
    const { vvbName, vvbContact } = req.body;
    const pipeline = await prisma.creditPipeline.update({
      where: { id: req.params.id },
      data: { vvbName, vvbContact }
    });
    // Démarrer VVB_VALIDATION si PDD complété
    const pdd = await prisma.pipelineStep.findUnique({
      where: { pipelineId_stepKey: { pipelineId: req.params.id, stepKey: 'PDD' } }
    });
    if (pdd?.status === 'COMPLETED') {
      await prisma.pipelineStep.update({
        where: { pipelineId_stepKey: { pipelineId: req.params.id, stepKey: 'VVB_VALIDATION' } },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), data: { vvbName, vvbContact } }
      });
    }
    res.json({ pipeline, vvbName, vvbContact });
  } catch(e) { next(e); }
});

// ─── GET /pipeline/project/:projectId — Pipelines d'un projet ───────────────
router.get('/project/:projectId', auth, async (req, res, next) => {
  try {
    const pipelines = await prisma.creditPipeline.findMany({
      where: { projectId: req.params.projectId },
      include: { steps: { orderBy: { stepNumber: 'asc' } }, _count: { select: { documents: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ pipelines, total: pipelines.length });
  } catch(e) { next(e); }
});

// ─── Helper: émettre les crédits sur la blockchain ───────────────────────────
async function issueCarbonCredits(pipeline, userId) {
  const lastBlock = await prisma.creditIssuance.findFirst({ orderBy: { blockNumber: 'desc' } });
  const blockNumber = (lastBlock?.blockNumber || 0) + 1;
  const previousHash = lastBlock?.blockHash || '0'.repeat(64);

  const credits = pipeline.confirmedCredits || pipeline.estimatedCredits;
  const prefix = `PGC-${pipeline.projectId.slice(-6).toUpperCase()}-${pipeline.vintage}`;
  const serialFrom = `${prefix}-${String(blockNumber * 10000 + 1).padStart(8, '0')}`;
  const serialTo   = `${prefix}-${String(blockNumber * 10000 + Math.ceil(credits)).padStart(8, '0')}`;

  const payload = JSON.stringify({
    previousHash, projectId: pipeline.projectId, vintage: pipeline.vintage,
    quantity: credits, standard: pipeline.standard, serialFrom, serialTo,
    pipelineId: pipeline.id, registryRef: pipeline.registryRef,
    timestamp: new Date().toISOString(),
  });
  const blockHash = crypto.createHash('sha256').update(payload).digest('hex');
  const merkleRoot = crypto.createHash('sha256').update(JSON.stringify({ pipeline: pipeline.id, credits, timestamp: Date.now() })).digest('hex');

  const issuance = await prisma.creditIssuance.create({
    data: {
      projectId: pipeline.projectId,
      vintage: pipeline.vintage,
      quantity: credits,
      standard: pipeline.standard,
      serialFrom, serialTo,
      status: 'ISSUED',
      previousHash, blockHash, blockNumber, merkleRoot,
      metadata: {
        pipelineId: pipeline.id,
        vvbName: pipeline.vvbName,
        registryRef: pipeline.registryRef,
        issuedViaWorkflow: true,
      }
    }
  });

  await prisma.creditPipeline.update({
    where: { id: pipeline.id },
    data: { issuanceId: issuance.id, confirmedCredits: credits, issuedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      userId, action: 'CREDITS_ISSUED_VIA_PIPELINE',
      entity: 'CreditIssuance', entityId: issuance.id,
      after: { blockHash, blockNumber, credits, standard: pipeline.standard, pipelineId: pipeline.id }
    }
  });

  return issuance;
}

// ─── GET /pipeline/stats/global — Stats globales ─────────────────────────────
router.get('/stats/global', auth, async (req, res, next) => {
  try {
    const [total, active, completed, blocked] = await Promise.all([
      prisma.creditPipeline.count(),
      prisma.creditPipeline.count({ where: { status: 'ACTIVE' } }),
      prisma.creditPipeline.count({ where: { status: 'COMPLETED' } }),
      prisma.creditPipeline.count({ where: { status: 'BLOCKED' } }),
    ]);
    const creditsInPipeline = await prisma.creditPipeline.aggregate({
      where: { status: { in: ['ACTIVE', 'BLOCKED'] } },
      _sum: { estimatedCredits: true }
    });
    const creditsIssued = await prisma.creditPipeline.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { confirmedCredits: true }
    });
    res.json({
      total, active, completed, blocked,
      creditsInPipeline: creditsInPipeline._sum.estimatedCredits || 0,
      creditsIssued: creditsIssued._sum.confirmedCredits || 0,
      stepDefinitions: PIPELINE_STEPS,
    });
  } catch(e) { next(e); }
});

module.exports = router;

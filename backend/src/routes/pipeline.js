/**
 * PANGEA CARBON — Credit Issuance Pipeline Engine
 * Verra ACM0002 · Gold Standard · Article 6 ITMO · CORSIA
 *
 * WORKFLOW 11 ÉTAPES (6-24 mois):
 *  1. MRV_DATA          → Collecte données production
 *  2. MRV_CALCULATION   → Calcul ACM0002 v22.0
 *  3. PDD               → Project Design Document
 *  4. VVB_VALIDATION    → Validation par auditeur tiers
 *  5. MONITORING_PERIOD → Période de monitoring (≥12 mois)
 *  6. MONITORING_REPORT → Rapport annuel compilé
 *  7. VVB_VERIFICATION  → Vérification indépendante
 *  8. REGISTRY_SUBMISSION → Soumission Verra/GS
 *  9. REGISTRY_REVIEW   → Examen + approbation Verra
 * 10. CREDIT_ISSUANCE   → VCUs émis + blockchain PANGEA
 * 11. MARKET_LISTING    → Listing marketplace
 */

const router  = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth    = require('../middleware/auth');
const crypto  = require('crypto');
const prisma  = new PrismaClient();
const { MRVEngine } = require('../services/mrv.service');
const { getAccreditedVVBs, searchVerraProjects, getVerraStats } = require('../services/registry.service');
const { uploadFile } = require('../storage/s3');

// ─── Isolation données par rôle ───────────────────────────────────────────────
function pipelineWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};           // voit tout
  if (['ADMIN'].includes(user.role) && user.organizationId) {
    return { organizationId: user.organizationId };    // voit son org
  }
  return { organizationId: user.organizationId || '__none__',
           project: { userId: user.userId } };        // voit seulement ses projets
}

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { key:'MRV_DATA',            n:1,  title:'MRV Data Collection',      icon:'📊', duration:'1-12 months',  auto:true,  requirement:'≥12 monthly readings' },
  { key:'MRV_CALCULATION',     n:2,  title:'MRV Calculation (ACM0002)',icon:'🧮', duration:'1 day',        auto:true,  requirement:'MRV data complete' },
  { key:'PDD',                 n:3,  title:'Project Design Document',  icon:'📄', duration:'2-6 weeks',    auto:false, requirement:'Technical team' },
  { key:'VVB_VALIDATION',      n:4,  title:'VVB Validation',           icon:'🏛️', duration:'4-16 weeks',   auto:false, requirement:'Accredited VVB' },
  { key:'MONITORING_PERIOD',   n:5,  title:'Monitoring Period',        icon:'📡', duration:'12 months min', auto:true,  requirement:'IoT/SCADA data' },
  { key:'MONITORING_REPORT',   n:6,  title:'Monitoring Report',        icon:'📋', duration:'2-4 weeks',    auto:false, requirement:'QA/QC complete' },
  { key:'VVB_VERIFICATION',    n:7,  title:'VVB Verification',         icon:'✅', duration:'4-8 weeks',    auto:false, requirement:'Verification statement' },
  { key:'REGISTRY_SUBMISSION', n:8,  title:'Registry Submission',      icon:'📤', duration:'1 week',       auto:false, requirement:'Registry account + fees' },
  { key:'REGISTRY_REVIEW',     n:9,  title:'Registry Review & Approval',icon:'🔍',duration:'4-12 weeks',  auto:false, requirement:'Registry process' },
  { key:'CREDIT_ISSUANCE',     n:10, title:'Credit Issuance',          icon:'🌿', duration:'1 day',        auto:false, requirement:'Registry approval' },
  { key:'MARKET_LISTING',      n:11, title:'Marketplace Listing',      icon:'🏪', duration:'1 day',        auto:true,  requirement:'Credits issued' },
];
const STEP_MAP = Object.fromEntries(STEPS.map(s => [s.key, s]));
const STD_DESC = { MRV_DATA:'Energy production data collected via IoT/SCADA or CSV import.', MRV_CALCULATION:'Gross reductions = EG_RE × EF_grid. Leakage (3%) and uncertainty (5%) deducted per ACM0002 §4.2 and §8.1.', PDD:'PDD describes methodology, baseline, additionality, monitoring plan. Template: Verra VCS v4.0 / Gold Standard v1.2.', VVB_VALIDATION:'Accredited VVB verifies PDD against Verra/GS methodology. Validates additionality, baseline, monitoring plan.', MONITORING_PERIOD:'Continuous IoT/SCADA monitoring. Minimum 1 year. Data collected and archived with SHA-256 integrity.', MONITORING_REPORT:'Annual compilation of production data, emission calculations, quality assurance.', VVB_VERIFICATION:'Independent spot-checks, data verification, uncertainty assessment. Issues verification statement.', REGISTRY_SUBMISSION:'Package: PDD + Monitoring Report + VVB Statements + Supporting Docs submitted to Verra/GS.', REGISTRY_REVIEW:'Verra/GS technical review + 30-day public stakeholder consultation. Final approval or requests for clarification.', CREDIT_ISSUANCE:'VCUs/GS Credits issued on official registry + PANGEA blockchain. Serial numbers assigned per UNFCCC protocol.', MARKET_LISTING:'Credits listed on PANGEA CARBON Exchange at live CBL market price.' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function initSteps(pipelineId) {
  for (const s of STEPS) {
    await prisma.pipelineStep.create({
      data: {
        pipelineId, stepKey: s.key, stepNumber: s.n,
        title: s.title, status: s.n === 1 ? 'IN_PROGRESS' : 'PENDING',
        data: { description: STD_DESC[s.key] || '', icon: s.icon, duration: s.duration, requirement: s.requirement },
      }
    });
  }
}

async function advanceStep(pipelineId, completedKey, extraData = {}, userId = 'system') {
  const current = await prisma.pipelineStep.findUnique({
    where: { pipelineId_stepKey: { pipelineId, stepKey: completedKey } }
  });
  if (!current) throw new Error(`Step ${completedKey} not found`);
  if (current.status === 'COMPLETED') return { alreadyDone: true };

  // Complete current step
  await prisma.pipelineStep.update({
    where: { id: current.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      completedBy: userId,
      data: { ...(current.data || {}), ...extraData }
    }
  });

  // Activate next step
  const nextDef = STEPS.find(s => s.n === current.stepNumber + 1);
  if (nextDef) {
    await prisma.pipelineStep.update({
      where: { pipelineId_stepKey: { pipelineId, stepKey: nextDef.key } },
      data: { status: 'IN_PROGRESS', startedAt: new Date() }
    });
    await prisma.creditPipeline.update({
      where: { id: pipelineId },
      data: { currentStep: nextDef.key }
    });
  }
  return { advanced: true, nextStep: nextDef?.key || null };
}

async function issueCarbonCredits(pipeline, confirmedQty, userId) {
  const qty = confirmedQty || pipeline.estimatedCredits || 0;
  if (!qty || qty <= 0) throw new Error('Invalid credit quantity');

  const lastBlock = await prisma.creditIssuance.findFirst({ orderBy: { blockNumber: 'desc' } }).catch(() => null);
  const blockNumber  = (lastBlock?.blockNumber || 0) + 1;
  const previousHash = lastBlock?.blockHash || '0'.repeat(64);

  const prefix     = `PGC-${pipeline.projectId.slice(-6).toUpperCase()}-${pipeline.vintage}`;
  const serialFrom = `${prefix}-${String(blockNumber * 10000 + 1).padStart(8, '0')}`;
  const serialTo   = `${prefix}-${String(blockNumber * 10000 + Math.ceil(qty)).padStart(8, '0')}`;

  const payload   = JSON.stringify({ previousHash, projectId: pipeline.projectId, vintage: pipeline.vintage, quantity: qty, standard: pipeline.standard, serialFrom, serialTo, pipelineId: pipeline.id, timestamp: new Date().toISOString() });
  const blockHash  = crypto.createHash('sha256').update(payload).digest('hex');
  const merkleRoot = crypto.createHash('sha256').update(JSON.stringify({ pipelineId: pipeline.id, qty, ts: Date.now() })).digest('hex');

  const issuance = await prisma.creditIssuance.create({
    data: {
      projectId: pipeline.projectId,
      vintage:   pipeline.vintage,
      quantity:  qty,
      standard:  pipeline.standard,
      serialFrom, serialTo,
      status:    'ISSUED',
      previousHash, blockHash, blockNumber, merkleRoot,
      metadata: { pipelineId: pipeline.id, vvbName: pipeline.vvbName, registryRef: pipeline.registryRef, issuedViaWorkflow: true }
    }
  });

  await prisma.creditPipeline.update({
    where: { id: pipeline.id },
    data: { issuanceId: issuance.id, confirmedCredits: qty, issuedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: { userId, action: 'CREDITS_ISSUED_VIA_PIPELINE', entity: 'CreditIssuance', entityId: issuance.id,
      after: { blockHash: blockHash.slice(0,16)+'...', blockNumber, qty, standard: pipeline.standard, pipelineId: pipeline.id } }
  }).catch(() => {});

  return issuance;
}

async function loadFullPipeline(id) {
  const pipeline = await prisma.creditPipeline.findUnique({
    where: { id },
    include: {
      steps:     { orderBy: { stepNumber: 'asc' } },
      documents: { orderBy: { uploadedAt: 'desc' } },
      project:   { select: { name:true, countryCode:true, type:true, installedMW:true, baselineEF:true } }
    }
  });
  if (!pipeline) return null;
  const completedSteps = pipeline.steps.filter(s => s.status === 'COMPLETED').length;
  const progress = Math.round((completedSteps / STEPS.length) * 100);
  return { pipeline, progress, stepDefinitions: STEPS };
}

// ─── ROUTES (ordre critique: spécifiques AVANT /:id) ─────────────────────────

// GET /pipeline/stats/global — DOIT être avant /:id
router.get('/stats/global', auth, async (req, res, next) => {
  try {
    let stats = { total:0, active:0, completed:0, blocked:0, creditsInPipeline:0, creditsIssued:0 };
    try {
      const [total, active, completed, blocked, inPipe, issued] = await Promise.all([
        prisma.creditPipeline.count({ where:pipelineWhere(req.user) }),
        prisma.creditPipeline.count({ where:{ ...pipelineWhere(req.user), status:'ACTIVE' } }),
        prisma.creditPipeline.count({ where:{ ...pipelineWhere(req.user), status:'COMPLETED' } }),
        prisma.creditPipeline.count({ where:{ ...pipelineWhere(req.user), status:'BLOCKED' } }),
        prisma.creditPipeline.aggregate({ where:{ status:{ in:['ACTIVE','BLOCKED'] } }, _sum:{ estimatedCredits:true } }),
        prisma.creditPipeline.aggregate({ where:{ status:'COMPLETED' }, _sum:{ confirmedCredits:true } }),
      ]);
      stats = { total, active, completed, blocked,
        creditsInPipeline: inPipe._sum.estimatedCredits || 0,
        creditsIssued:      issued._sum.confirmedCredits || 0 };
    } catch(_e) {}
    res.json({ ...stats, stepDefinitions: STEPS });
  } catch(e) { next(e); }
});

// GET /pipeline/vvbs — DOIT être avant /:id
router.get('/vvbs', auth, (req, res, next) => {
  try {
    const { country, standard, speciality } = req.query;
    res.json(getAccreditedVVBs({ country, standard, speciality }));
  } catch(e) { next(e); }
});

// GET /pipeline/verra-projects — DOIT être avant /:id
router.get('/verra-projects', auth, async (req, res, next) => {
  try {
    const { country, methodology } = req.query;
    const [projects, stats] = await Promise.all([
      searchVerraProjects({ country, methodology }).catch(() => ({ projects:[], total:0, source:'error' })),
      getVerraStats().catch(() => ({})),
    ]);
    res.json({ ...projects, globalStats: stats });
  } catch(e) { next(e); }
});

// GET /pipeline/project/:projectId — DOIT être avant /:id
router.get('/project/:projectId', auth, async (req, res, next) => {
  try {
    const pipelines = await prisma.creditPipeline.findMany({
      where:   { projectId: req.params.projectId },
      include: { steps:{ orderBy:{ stepNumber:'asc' } }, _count:{ select:{ documents:true } } },
      orderBy: { createdAt:'desc' }
    });
    res.json({ pipelines, total: pipelines.length, stepDefinitions: STEPS });
  } catch(e) { next(e); }
});

// POST /pipeline — Créer un pipeline
router.post('/', auth, async (req, res, next) => {
  try {
    const { projectId, vintage, standard } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    if (!vintage)   return res.status(400).json({ error: 'vintage required' });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        readings: { where:{ periodStart:{ gte:new Date(`${vintage}-01-01`) }, periodEnd:{ lte:new Date(`${vintage}-12-31`) } } },
        mrvRecords:     { where:{ year:parseInt(vintage) }, take:1 }
      }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Vérifier pas de pipeline dupliqué
    const existing = await prisma.creditPipeline.findFirst({
      where: { projectId, vintage:parseInt(vintage), standard: standard||'VERRA_VCS', status:{ not:'CANCELLED' } }
    });
    if (existing) return res.status(409).json({ error:`Pipeline already exists for ${project.name} vintage ${vintage}`, pipelineId: existing.id });

    // Estimer les crédits
    let estimatedCredits = 0;
    let mrvData = null;
    if (project.readings.length > 0) {
      try {
        const mrv = MRVEngine.calculateAnnual(project.readings, project);
        estimatedCredits = mrv.emissions.netCarbonCredits;
        mrvData = { grossReductions:mrv.emissions.grossReductions, leakage:mrv.emissions.leakageDeduction, netCredits:mrv.emissions.netCarbonCredits, gridEF:mrv.input.gridEmissionFactor || project.baselineEF, methodology:'ACM0002 v22.0' };
      } catch(_e) {}
    }
    if (!estimatedCredits && project.installedMW) {
      // Estimation: MW * 8760h * 25% CF * EF * 0.92 (leakage+uncertainty)
      const ef = project.baselineEF || 0.4;
      estimatedCredits = Math.round(project.installedMW * 8760 * 0.25 * ef * 0.92);
    }

    const orgId = project.organizationId || req.user.organizationId || 'system';
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

    await initSteps(pipeline.id);

    // Auto-avancer si données MRV présentes
    const readingCount = project.readings.length;
    if (readingCount >= 12 || project.mrvRecords.length > 0) {
      await advanceStep(pipeline.id, 'MRV_DATA', { readingsCount:readingCount, totalMWh: project.readings.reduce((s,r)=>s+r.energyMWh,0), autoCompleted:true }, req.user.userId);
      if (mrvData) {
        await advanceStep(pipeline.id, 'MRV_CALCULATION', { ...mrvData, autoCompleted:true }, req.user.userId);
      }
    }

    await prisma.auditLog.create({
      data: { userId:req.user.userId, action:'PIPELINE_CREATED', entity:'CreditPipeline', entityId:pipeline.id,
        after:{ projectId, vintage, standard, estimatedCredits, readingCount } }
    }).catch(()=>{});

    const full = await loadFullPipeline(pipeline.id);
    res.status(201).json({ ...full, message:`Pipeline created — ${Math.round(estimatedCredits).toLocaleString()} tCO₂e estimated` });
  } catch(e) { next(e); }
});

// GET /pipeline — Liste
router.get('/', auth, async (req, res, next) => {
  try {
    let pipelines = [];
    try {
      pipelines = await prisma.creditPipeline.findMany({
        where:   pipelineWhere(req.user),
        include: {
          steps:   { orderBy:{ stepNumber:'asc' } },
          project: { select:{ name:true, countryCode:true, type:true, installedMW:true } },
          _count:  { select:{ documents:true } }
        },
        orderBy: { createdAt:'desc' }
      });
    } catch(_e) {}
    res.json({ pipelines, total:pipelines.length, stepDefinitions:STEPS });
  } catch(e) { next(e); }
});

// GET /pipeline/:id — Détail (APRÈS les routes statiques)
router.get('/:id', auth, async (req, res, next) => {
  try {
    const full = await loadFullPipeline(req.params.id);
    if (!full) return res.status(404).json({ error:'Pipeline not found' });
    // Vérifier accès
    const p = full.pipeline;
    if (req.user.role !== 'SUPER_ADMIN') {
      if (req.user.role === 'ADMIN' && p.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error:'Access denied' });
      }
      if (!['ADMIN','SUPER_ADMIN'].includes(req.user.role)) {
        if (p.organizationId !== req.user.organizationId) {
          return res.status(403).json({ error:'Access denied' });
        }
      }
    }
    res.json(full);
  } catch(e) { next(e); }
});

// POST /pipeline/:id/advance — Valider une étape
router.post('/:id/advance', auth, async (req, res, next) => {
  try {
    const { stepKey, notes, confirmedCredits } = req.body;
    if (!stepKey) return res.status(400).json({ error:'stepKey required' });

    const pipeline = await prisma.creditPipeline.findUnique({ where:{ id:req.params.id } });
    if (!pipeline) return res.status(404).json({ error:'Pipeline not found' });
    if (pipeline.currentStep !== stepKey) {
      return res.status(400).json({ error:`Cannot advance ${stepKey} — current step is ${pipeline.currentStep}` });
    }

    // Avancer l'étape
    await advanceStep(req.params.id, stepKey, { notes, completedBy:req.user.userId }, req.user.userId);

    // Logique spéciale par étape
    if (stepKey === 'REGISTRY_REVIEW') {
      // Émettre les crédits sur la blockchain
      const fresh = await prisma.creditPipeline.findUnique({ where:{ id:req.params.id } });
      const qty = confirmedCredits || fresh.confirmedCredits || fresh.estimatedCredits;
      try {
        await issueCarbonCredits(fresh, qty, req.user.userId);
      } catch(issueErr) {
        console.error('[pipeline] issueCarbonCredits failed:', issueErr.message);
        // Ne pas bloquer l'avancement — log l'erreur
      }
      await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ approvedAt:new Date() } });
    }

    if (stepKey === 'CREDIT_ISSUANCE') {
      if (confirmedCredits) {
        await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ confirmedCredits:parseFloat(confirmedCredits), issuedAt:new Date() } });
      }
    }

    if (stepKey === 'MARKET_LISTING') {
      await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ status:'COMPLETED' } });
    }

    await prisma.auditLog.create({
      data: { userId:req.user.userId, action:'PIPELINE_STEP_ADVANCED', entity:'CreditPipeline', entityId:req.params.id,
        after:{ stepKey, notes, confirmedCredits } }
    }).catch(()=>{});

    const full = await loadFullPipeline(req.params.id);
    res.json({ ...full, message:`Step ${stepKey} completed` });
  } catch(e) { next(e); }
});

// POST /pipeline/:id/block — Bloquer une étape
router.post('/:id/block', auth, async (req, res, next) => {
  try {
    const { stepKey, reason } = req.body;
    if (!stepKey) return res.status(400).json({ error:'stepKey required' });
    await prisma.pipelineStep.update({
      where: { pipelineId_stepKey:{ pipelineId:req.params.id, stepKey } },
      data:  { status:'BLOCKED', notes:reason }
    });
    await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ status:'BLOCKED' } });
    const full = await loadFullPipeline(req.params.id);
    res.json({ ...full, message:`Step ${stepKey} blocked: ${reason}` });
  } catch(e) { next(e); }
});

// POST /pipeline/:id/unblock — Débloquer
router.post('/:id/unblock', auth, async (req, res, next) => {
  try {
    const { stepKey } = req.body;
    await prisma.pipelineStep.update({
      where: { pipelineId_stepKey:{ pipelineId:req.params.id, stepKey } },
      data:  { status:'IN_PROGRESS', notes:null }
    });
    await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ status:'ACTIVE' } });
    const full = await loadFullPipeline(req.params.id);
    res.json({ ...full, message:`Step ${stepKey} unblocked` });
  } catch(e) { next(e); }
});

// POST /pipeline/:id/assign-vvb — Assigner un VVB
router.post('/:id/assign-vvb', auth, async (req, res, next) => {
  try {
    const { vvbName, vvbContact } = req.body;
    if (!vvbName) return res.status(400).json({ error:'vvbName required' });
    await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ vvbName, vvbContact } });
    // Si le PDD est terminé, activer VVB_VALIDATION
    const pddStep = await prisma.pipelineStep.findUnique({
      where: { pipelineId_stepKey:{ pipelineId:req.params.id, stepKey:'PDD' } }
    });
    if (pddStep?.status === 'COMPLETED') {
      await prisma.pipelineStep.update({
        where: { pipelineId_stepKey:{ pipelineId:req.params.id, stepKey:'VVB_VALIDATION' } },
        data:  { data:{ vvbName, vvbContact }, notes:`Assigned: ${vvbName}` }
      });
    }
    const full = await loadFullPipeline(req.params.id);
    res.json({ ...full, message:`VVB assigned: ${vvbName}` });
  } catch(e) { next(e); }
});

// POST /pipeline/:id/documents — Ajouter un document
router.post('/:id/documents', auth, async (req, res, next) => {
  try {
    const { type, name, fileUrl, notes } = req.body;
    if (!name) return res.status(400).json({ error:'name required' });
    const hash = crypto.createHash('sha256').update((fileUrl||'') + name + Date.now()).digest('hex').slice(0, 24);
    const doc = await prisma.pipelineDocument.create({
      data: { pipelineId:req.params.id, type:type||'OTHER', name, fileUrl:fileUrl||null, hash, uploadedBy:req.user.userId }
    });
    res.status(201).json(doc);
  } catch(e) { next(e); }
});

// DELETE /pipeline/:id/documents/:docId
router.delete('/:id/documents/:docId', auth, async (req, res, next) => {
  try {
    await prisma.pipelineDocument.delete({ where:{ id:req.params.docId } });
    res.json({ deleted:true });
  } catch(e) { next(e); }
});


// POST /pipeline/:id/upload — Upload fichier via multipart/form-data (busboy natif)
router.post('/:id/upload', auth, async (req, res, next) => {
  try {
    // Parser multipart sans multer (busboy natif Node.js)
    const Busboy = (() => {
      try { return require('busboy'); } catch(_e) { return null; }
    })();

    if (!Busboy) {
      // Fallback: accepter JSON avec base64
      const { name, type, base64, size } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });
      const hash = crypto.createHash('sha256').update(name + Date.now()).digest('hex').slice(0, 24);
      const doc  = await prisma.pipelineDocument.create({
        data: { pipelineId:req.params.id, type:type||'OTHER', name, fileUrl:null, hash, uploadedBy:req.user.userId }
      });
      return res.status(201).json({ ...doc, storage:'name_only' });
    }

    const bb = Busboy({ headers: req.headers, limits: { fileSize: 50*1024*1024 } });
    let fileBuffer = null, filename = '', mimetype = '', docType = 'OTHER';

    bb.on('field', (name, val) => { if (name === 'type') docType = val; });
    bb.on('file', (field, stream, info) => {
      filename = info.filename;
      mimetype = info.mimeType;
      const chunks = [];
      stream.on('data', d => chunks.push(d));
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    bb.on('finish', async () => {
      try {
        if (!fileBuffer || !filename) {
          return res.status(400).json({ error: 'No file received' });
        }
        const key  = `pipelines/${req.params.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').slice(0, 24);
        const result = await uploadFile(key, fileBuffer, mimetype);
        const fileUrl = result.location || null;
        const doc = await prisma.pipelineDocument.create({
          data: { pipelineId:req.params.id, type:docType, name:filename, fileUrl, hash, uploadedBy:req.user.userId }
        });
        res.status(201).json({ ...doc, size:fileBuffer.length, storage: result.s3?'minio':'local' });
      } catch(e) { next(e); }
    });
    bb.on('error', next);
    req.pipe(bb);
  } catch(e) { next(e); }
});

// DELETE /pipeline/:id — Annuler un pipeline
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const p = await prisma.creditPipeline.findUnique({ where:{ id:req.params.id } });
    if (!p) return res.status(404).json({ error:'Not found' });
    if (['COMPLETED'].includes(p.status)) return res.status(400).json({ error:'Cannot delete a completed pipeline' });
    await prisma.creditPipeline.update({ where:{ id:req.params.id }, data:{ status:'CANCELLED' } });
    await prisma.auditLog.create({ data:{ userId:req.user.userId, action:'PIPELINE_CANCELLED', entity:'CreditPipeline', entityId:req.params.id, after:{} } }).catch(()=>{});
    res.json({ cancelled:true });
  } catch(e) { next(e); }
});

module.exports = router;

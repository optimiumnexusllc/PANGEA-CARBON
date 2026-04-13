/**
 * PANGEA CARBON — Blockchain Credit Registry
 * SHA-256 hash chain — immuable, trustless verification
 * Inspiré de: Verra Registry, Gold Standard Registry, Puro.earth
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const prisma = new PrismaClient();

function generateBlockHash(data, previousHash) {
  const payload = JSON.stringify({
    previousHash, projectId: data.projectId, vintage: data.vintage,
    quantity: data.quantity, standard: data.standard,
    serialFrom: data.serialFrom, serialTo: data.serialTo,
    timestamp: new Date().toISOString(),
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function generateSerials(projectId, vintage, quantity, blockNumber) {
  const prefix = `PGC-${projectId.slice(-6).toUpperCase()}-${vintage}`;
  const from = `${prefix}-${String(blockNumber * 10000 + 1).padStart(8, '0')}`;
  const to = `${prefix}-${String(blockNumber * 10000 + Math.ceil(quantity)).padStart(8, '0')}`;
  return { serialFrom: from, serialTo: to };
}

// POST /api/registry/issue — Émettre des crédits carbone
router.post('/issue', auth, async (req, res, next) => {
  try {
    const { projectId, vintage, quantity, standard, buyerEntity } = req.body;

    // Récupérer dernier bloc (pour le hash précédent)
    const lastBlock = await prisma.creditIssuance.findFirst({ orderBy: { blockNumber: 'desc' } });
    const blockNumber = (lastBlock?.blockNumber || 0) + 1;
    const previousHash = lastBlock?.blockHash || '0'.repeat(64); // Genesis block

    const serials = generateSerials(projectId, vintage, quantity, blockNumber);
    const blockHash = generateBlockHash({ projectId, vintage, quantity, standard, ...serials }, previousHash);

    const merkleRoot = crypto.createHash('sha256')
      .update(JSON.stringify({ projectId, vintage, quantity, serials, timestamp: Date.now() }))
      .digest('hex');

    const issuance = await prisma.creditIssuance.create({
      data: {
        projectId, vintage: parseInt(vintage), quantity: parseFloat(quantity),
        standard: standard || 'VERRA_VCS',
        ...serials, status: 'ISSUED', previousHash, blockHash,
        blockNumber, merkleRoot, buyerEntity,
      }
    });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'ISSUE_CREDITS', entity: 'CreditIssuance', entityId: issuance.id,
        after: { quantity, vintage, standard, blockHash: blockHash.slice(0, 16) + '...' } }
    });

    res.status(201).json({
      issuance, blockHash, blockNumber,
      verification: `https://pangea-carbon.com/registry/verify/${blockHash}`,
      message: `${quantity} crédits émis · Bloc #${blockNumber} inscrit dans le registre`,
    });
  } catch (e) { next(e); }
});

// POST /api/registry/retire/:id — Retirer des crédits (usage final)
router.post('/retire/:id', auth, async (req, res, next) => {
  try {
    const { retiredFor, buyerEntity } = req.body;
    const issuance = await prisma.creditIssuance.findUnique({ where: { id: req.params.id } });
    if (!issuance) return res.status(404).json({ error: 'Crédit introuvable' });
    if (issuance.status === 'RETIRED') return res.status(400).json({ error: 'Déjà retiré' });

    const retired = await prisma.creditIssuance.update({
      where: { id: req.params.id },
      data: { status: 'RETIRED', retiredAt: new Date(), retiredFor, buyerEntity }
    });

    res.json({ retired, retirementCertificate: `PGC-RET-${retired.blockHash.slice(0, 12).toUpperCase()}` });
  } catch (e) { next(e); }
});

// GET /api/registry/project/:projectId — Registre d'un projet
router.get('/project/:projectId', auth, async (req, res, next) => {
  try {
    const issuances = await prisma.creditIssuance.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { blockNumber: 'asc' }
    });

    // Vérifier l'intégrité de la chaîne
    let chainIntact = true;
    for (let i = 1; i < issuances.length; i++) {
      if (issuances[i].previousHash !== issuances[i-1].blockHash) {
        chainIntact = false; break;
      }
    }

    const totalIssued = issuances.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + i.quantity, 0);
    const totalRetired = issuances.filter(i => i.status === 'RETIRED').reduce((s, i) => s + i.quantity, 0);

    res.json({
      issuances, chainIntact,
      summary: {
        totalIssued: parseFloat(totalIssued.toFixed(2)),
        totalRetired: parseFloat(totalRetired.toFixed(2)),
        available: parseFloat((totalIssued - totalRetired).toFixed(2)),
        blockCount: issuances.length,
        latestBlock: issuances[issuances.length - 1]?.blockNumber || 0,
      }
    });
  } catch (e) { next(e); }
});

// GET /api/registry/verify/:hash — Vérification publique d'un bloc
router.get('/verify/:hash', async (req, res, next) => {
  try {
    const issuance = await prisma.creditIssuance.findUnique({
      where: { blockHash: req.params.hash },
      include: { project: { select: { name: true, type: true, countryCode: true, installedMW: true } } }
    });

    if (!issuance) return res.status(404).json({ valid: false, error: 'Bloc introuvable' });

    res.json({
      valid: true, issuance,
      verification: { blockHash: issuance.blockHash, blockNumber: issuance.blockNumber, standard: issuance.standard, status: issuance.status },
      message: 'Crédit carbone vérifié sur le registre PANGEA CARBON'
    });
  } catch (e) { next(e); }
});

// GET /api/registry/chain — Chaîne complète (derniers 50 blocs)
router.get('/chain', auth, async (req, res, next) => {
  try {
    const blocks = await prisma.creditIssuance.findMany({
      orderBy: { blockNumber: 'desc' }, take: 50,
      include: { project: { select: { name: true, countryCode: true, type: true } } }
    });

    const totalSupply = await prisma.creditIssuance.aggregate({
      where: { status: { not: 'CANCELLED' } }, _sum: { quantity: true }
    });

    res.json({
      blocks, totalBlocks: await prisma.creditIssuance.count(),
      totalSupply: totalSupply._sum.quantity || 0,
      genesisHash: '0'.repeat(64),
    });
  } catch (e) { next(e); }
});

module.exports = router;

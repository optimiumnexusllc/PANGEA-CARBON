/**
 * PANGEA CARBON — Carbon Asset Token Generator
 * Generates unique, traceable tokens + QR codes for:
 * - VVB (Validation & Verification Body)
 * - PDD (Project Design Document)
 * - VCU (Verified Carbon Unit)
 * - Broker / Direct sale
 * - ITMO (Article 6)
 * - /verify/[hash] public page
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const crypto = require('crypto');
const QRCode = require('qrcode');
const prisma = new PrismaClient();

const VERIFY_BASE = process.env.NEXT_PUBLIC_URL || 'https://pangea-carbon.com';

// ─── Token generation ─────────────────────────────────────────────────────

function generateToken(type, data) {
  const payload = {
    type,
    ...data,
    generatedAt: new Date().toISOString(),
    issuer: 'PANGEA_CARBON',
  };
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(payload) + process.env.JWT_SECRET)
    .digest('hex');
  return {
    token: `PGC-${type.slice(0,3).toUpperCase()}-${hash.slice(0, 24).toUpperCase()}`,
    hash,
    verifyUrl: `${VERIFY_BASE}/verify/${hash}`,
    payload,
  };
}

async function generateQR(text, opts = {}) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    width: opts.width || 256,
    ...opts,
  });
}

// ─── VVB Token ────────────────────────────────────────────────────────────
// POST /api/tokens/vvb
router.post('/vvb', auth, requirePermission('pipeline.issue_credits'), async (req, res, next) => {
  try {
    const { projectId, vvbName, vvbCountry, auditDate, auditType, auditReport } = req.body;
    if (!projectId || !vvbName) return res.status(400).json({ error: 'projectId and vvbName required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { token, hash, verifyUrl, payload } = generateToken('VVB', {
      projectId, projectName: project.name,
      vvbName, vvbCountry: vvbCountry || 'International',
      auditDate: auditDate || new Date().toISOString().split('T')[0],
      auditType: auditType || 'VALIDATION',
    });

    const qrData = await generateQR(verifyUrl);
    const metadata = { token, hash, verifyUrl, qrCode: qrData, vvbName, vvbCountry, auditDate, auditType, auditReport };

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'VVB_TOKEN_GENERATED',
        entity: 'Project', entityId: projectId,
        after: { token, hash, vvbName, auditType },
      }
    });

    res.json({
      type: 'VVB',
      label: 'Validation & Verification Body Token',
      token, hash, verifyUrl, qrCode: qrData,
      projectId, projectName: project.name,
      vvbName, auditDate, auditType,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── PDD Token ────────────────────────────────────────────────────────────
// POST /api/tokens/pdd
router.post('/pdd', auth, requirePermission('pipeline.advance'), async (req, res, next) => {
  try {
    const { projectId, methodology, baselineEF, creditingPeriod, additionality, leakage } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { token, hash, verifyUrl } = generateToken('PDD', {
      projectId, projectName: project.name,
      methodology: methodology || 'ACM0002 v22.0',
      baselineEF, creditingPeriod: creditingPeriod || 10,
      additionality: additionality || 'INVESTMENT_BARRIER',
      country: project.countryCode,
      installedMW: project.installedMW,
    });

    const qrData = await generateQR(verifyUrl);

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'PDD_TOKEN_GENERATED',
        entity: 'Project', entityId: projectId,
        after: { token, hash, methodology },
      }
    });

    res.json({
      type: 'PDD',
      label: 'Project Design Document Token',
      token, hash, verifyUrl, qrCode: qrData,
      projectId, projectName: project.name,
      methodology, baselineEF, creditingPeriod,
      country: project.countryCode,
      installedMW: project.installedMW,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── VCU Token ────────────────────────────────────────────────────────────
// POST /api/tokens/vcu
router.post('/vcu', auth, requirePermission('pipeline.issue_credits'), async (req, res, next) => {
  try {
    const { issuanceId } = req.body;
    if (!issuanceId) return res.status(400).json({ error: 'issuanceId required' });

    const issuance = await prisma.creditIssuance.findUnique({
      where: { id: issuanceId },
      include: { project: true }
    });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });

    const { token, hash, verifyUrl } = generateToken('VCU', {
      issuanceId,
      projectId: issuance.projectId,
      projectName: issuance.project.name,
      vintage: issuance.vintage,
      quantity: issuance.quantity,
      standard: issuance.standard,
      serialFrom: issuance.serialFrom,
      serialTo: issuance.serialTo,
      blockHash: issuance.blockHash,
      status: issuance.status,
    });

    const qrData = await generateQR(verifyUrl);

    res.json({
      type: 'VCU',
      label: 'Verified Carbon Unit Token',
      token, hash, verifyUrl, qrCode: qrData,
      issuanceId,
      projectId: issuance.projectId,
      projectName: issuance.project.name,
      vintage: issuance.vintage,
      quantity: issuance.quantity,
      standard: issuance.standard,
      serialFrom: issuance.serialFrom,
      serialTo: issuance.serialTo,
      status: issuance.status,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── Broker Sale Token ────────────────────────────────────────────────────
// POST /api/tokens/broker-sale
router.post('/broker-sale', auth, requirePermission('marketplace.sell'), async (req, res, next) => {
  try {
    const { issuanceId, brokerName, brokerEntity, pricePerTonne, totalVolume, commission } = req.body;
    if (!issuanceId || !brokerName) return res.status(400).json({ error: 'issuanceId and brokerName required' });

    const issuance = await prisma.creditIssuance.findUnique({
      where: { id: issuanceId }, include: { project: true }
    });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });

    const vol = totalVolume || issuance.quantity;
    const price = pricePerTonne || 12;
    const gross = vol * price;
    const commissionAmt = gross * ((commission || 2.5) / 100);

    const { token, hash, verifyUrl } = generateToken('BROKER', {
      issuanceId, projectId: issuance.projectId,
      projectName: issuance.project.name,
      brokerName, brokerEntity,
      pricePerTonne: price, totalVolume: vol,
      grossAmount: gross, commission: commission || 2.5,
      commissionAmount: commissionAmt,
      netAmount: gross - commissionAmt,
      standard: issuance.standard, vintage: issuance.vintage,
      saleType: 'BROKERED',
    });

    const qrData = await generateQR(verifyUrl);

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'BROKER_SALE_TOKEN_GENERATED',
        entity: 'CreditIssuance', entityId: issuanceId,
        after: { token, hash, brokerName, gross },
      }
    });

    res.json({
      type: 'BROKER_SALE',
      label: 'Brokered Carbon Sale Token',
      token, hash, verifyUrl, qrCode: qrData,
      brokerName, brokerEntity,
      pricePerTonne: price, totalVolume: vol,
      grossAmount: gross, commission: commission || 2.5,
      commissionAmount: commissionAmt, netAmount: gross - commissionAmt,
      projectName: issuance.project.name,
      standard: issuance.standard, vintage: issuance.vintage,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── Direct Corporate Sale Token ─────────────────────────────────────────
// POST /api/tokens/direct-sale
router.post('/direct-sale', auth, requirePermission('marketplace.sell'), async (req, res, next) => {
  try {
    const { issuanceId, buyerEntity, buyerCountry, pricePerTonne, quantity, retirementReason } = req.body;
    if (!issuanceId || !buyerEntity) return res.status(400).json({ error: 'issuanceId and buyerEntity required' });

    const issuance = await prisma.creditIssuance.findUnique({
      where: { id: issuanceId }, include: { project: true }
    });
    if (!issuance) return res.status(404).json({ error: 'Issuance not found' });

    const vol = quantity || issuance.quantity;
    const price = pricePerTonne || issuance.project.installedMW * 0.5;
    const total = vol * price;

    const { token, hash, verifyUrl } = generateToken('DIRECT', {
      issuanceId, projectId: issuance.projectId,
      projectName: issuance.project.name,
      buyerEntity, buyerCountry,
      pricePerTonne: price, quantity: vol, totalAmount: total,
      retirementReason: retirementReason || 'CARBON_NEUTRALITY_CLAIM',
      standard: issuance.standard, vintage: issuance.vintage,
      saleType: 'DIRECT_CORPORATE',
    });

    const qrData = await generateQR(verifyUrl);

    // Update issuance to mark as in process of retirement
    await prisma.creditIssuance.update({
      where: { id: issuanceId },
      data: { buyerEntity, retiredFor: retirementReason },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'DIRECT_SALE_TOKEN_GENERATED',
        entity: 'CreditIssuance', entityId: issuanceId,
        after: { token, hash, buyerEntity, total },
      }
    });

    res.json({
      type: 'DIRECT_SALE',
      label: 'Direct Corporate Sale Token',
      token, hash, verifyUrl, qrCode: qrData,
      buyerEntity, buyerCountry,
      pricePerTonne: price, quantity: vol, totalAmount: total,
      retirementReason, projectName: issuance.project.name,
      standard: issuance.standard, vintage: issuance.vintage,
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── ITMO / Article 6 Token ───────────────────────────────────────────────
// POST /api/tokens/itmo
router.post('/itmo', auth, requirePermission('projects.create'), async (req, res, next) => {
  try {
    const { projectId, hostCountry, acquiringCountry, quantity, pricePerTonne, authorizationRef, correspondingAdjustment } = req.body;
    if (!projectId || !hostCountry || !acquiringCountry) {
      return res.status(400).json({ error: 'projectId, hostCountry, acquiringCountry required' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const qty = quantity || 0;
    const price = pricePerTonne || 45; // Article 6 premium pricing
    const total = qty * price;
    const premiumVsVerra = ((price - 12) / 12 * 100).toFixed(1);

    const { token, hash, verifyUrl } = generateToken('ITMO', {
      projectId, projectName: project.name,
      hostCountry, acquiringCountry,
      quantity: qty, pricePerTonne: price, totalAmount: total,
      authorizationRef: authorizationRef || `AUTH-${hostCountry}-${new Date().getFullYear()}`,
      correspondingAdjustment: correspondingAdjustment !== false,
      premiumVsVerraPct: premiumVsVerra,
      type: 'ARTICLE_6_4_ITMO',
      framework: 'Paris Agreement Article 6.4',
    });

    const qrData = await generateQR(verifyUrl);

    // Créer ou mettre à jour l'ITMORecord
    const itmoRecord = await prisma.iTMORecord.upsert({
      where: { projectId },
      create: {
        projectId,
        hostCountryCode: hostCountry,
        acquiringCountryCode: acquiringCountry,
        authorizedQuantity: qty,
        issuedQuantity: 0,
        transferredQuantity: 0,
        pricePerTonne: price,
        authorizationRef: authorizationRef || `AUTH-${hostCountry}-${new Date().getFullYear()}`,
        status: 'AUTHORIZED',
        authorizedAt: new Date(),
      },
      update: {
        pricePerTonne: price,
        authorizationRef: authorizationRef || `AUTH-${hostCountry}-${new Date().getFullYear()}`,
        updatedAt: new Date(),
      }
    }).catch(() => null); // ITMORecord model may not have upsert

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'ITMO_TOKEN_GENERATED',
        entity: 'Project', entityId: projectId,
        after: { token, hash, hostCountry, acquiringCountry, qty, price },
      }
    });

    res.json({
      type: 'ITMO',
      label: 'Internationally Transferred Mitigation Outcome Token',
      token, hash, verifyUrl, qrCode: qrData,
      projectId, projectName: project.name,
      hostCountry, acquiringCountry,
      quantity: qty, pricePerTonne: price, totalAmount: total,
      authorizationRef, correspondingAdjustment: correspondingAdjustment !== false,
      premiumVsVerraPct: premiumVsVerra,
      framework: 'Paris Agreement Article 6.4',
      createdAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── Verify Token (public) ────────────────────────────────────────────────
// GET /api/tokens/verify/:hash — NO AUTH REQUIRED
router.get('/verify/:hash', async (req, res, next) => {
  try {
    const { hash } = req.params;
    if (!hash || hash.length < 16) return res.status(400).json({ error: 'Invalid hash' });

    // Search across all token-bearing entities
    const [cert, issuance, auditLogs] = await Promise.all([
      prisma.projectCertification.findFirst({
        where: { hash: { contains: hash.toLowerCase().slice(0, 32) } },
        include: { project: true }
      }),
      prisma.creditIssuance.findFirst({
        where: { blockHash: { contains: hash.toLowerCase().slice(0, 32) } },
        include: { project: true }
      }),
      prisma.auditLog.findMany({
        where: { after: { path: ['hash'], equals: hash.toLowerCase() } },
        orderBy: { createdAt: 'desc' }, take: 5,
      }).catch(() => []),
    ]);

    if (!cert && !issuance && auditLogs.length === 0) {
      return res.status(404).json({ error: 'Token not found', hash, verified: false });
    }

    const qrData = await generateQR(`${VERIFY_BASE}/verify/${hash}`);

    res.json({
      verified: true,
      hash,
      verifyUrl: `${VERIFY_BASE}/verify/${hash}`,
      qrCode: qrData,
      certification: cert ? {
        id: cert.id, tier: cert.tier, projectId: cert.projectId,
        projectName: cert.project?.name, standards: cert.standards,
        issuedAt: cert.issuedAt, expiresAt: cert.expiresAt,
        status: cert.revokedAt ? 'REVOKED' : 'ACTIVE',
      } : null,
      creditIssuance: issuance ? {
        id: issuance.id, vintage: issuance.vintage,
        quantity: issuance.quantity, standard: issuance.standard,
        serialFrom: issuance.serialFrom, serialTo: issuance.serialTo,
        status: issuance.status, projectName: issuance.project?.name,
        issuedAt: issuance.issuedAt, retiredAt: issuance.retiredAt,
        buyerEntity: issuance.buyerEntity,
      } : null,
      auditTrail: auditLogs.map(l => ({
        action: l.action, entityType: l.entity,
        timestamp: l.createdAt,
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (e) { next(e); }
});

// ─── List all tokens for a project ───────────────────────────────────────
// GET /api/tokens/project/:projectId
router.get('/project/:projectId', auth, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const [cert, issuances, itmo, auditLogs] = await Promise.all([
      prisma.projectCertification.findUnique({ where: { projectId } }),
      prisma.creditIssuance.findMany({ where: { projectId }, orderBy: { issuedAt: 'desc' } }),
      prisma.iTMORecord.findUnique({ where: { projectId } }).catch(() => null),
      prisma.auditLog.findMany({
        where: { entity: 'Project', entityId: projectId, action: { contains: 'TOKEN' } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
    ]);

    const tokens = [];

    if (cert) tokens.push({
      type: 'CERTIFICATION', token: `PGC-CERT-${cert.hash.slice(0,24).toUpperCase()}`,
      hash: cert.hash, verifyUrl: `${VERIFY_BASE}/verify/${cert.hash}`,
      tier: cert.tier, issuedAt: cert.issuedAt,
    });

    issuances.forEach(iss => {
      tokens.push({
        type: 'VCU', token: `PGC-VCU-${iss.blockHash.slice(0,24).toUpperCase()}`,
        hash: iss.blockHash, verifyUrl: `${VERIFY_BASE}/verify/${iss.blockHash}`,
        quantity: iss.quantity, standard: issuance?.standard || iss.standard,
        vintage: iss.vintage, status: iss.status, issuedAt: iss.issuedAt,
      });
    });

    if (itmo) tokens.push({
      type: 'ITMO', token: `PGC-ITMO-${projectId.slice(-8).toUpperCase()}`,
      hostCountry: itmo.hostCountryCode, acquiringCountry: itmo.acquiringCountryCode,
      authorizedQuantity: itmo.authorizedQuantity, status: itmo.status,
    });

    auditLogs.forEach(log => {
      if (log.after?.token) tokens.push({
        type: log.action.replace('_TOKEN_GENERATED', ''),
        token: log.after.token, hash: log.after.hash,
        verifyUrl: `${VERIFY_BASE}/verify/${log.after.hash}`,
        createdAt: log.createdAt,
      });
    });

    res.json({ projectId, tokens, total: tokens.length });
  } catch (e) { next(e); }
});

module.exports = router;

/**
 * PANGEA CARBON — Seller Profile & Payout Routes
 * Chaque vendeur configure sa gateway de réception de fonds
 */
const router = require('express').Router();
const { dispatchPayout } = require('../services/payout.service');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/seller/profile — Profil vendeur de l'org courante
router.get('/profile', auth, async (req, res, next) => {
  try {
    let profile = await prisma.sellerProfile.findUnique({
      where: { organizationId: req.user.organizationId || '__none__' },
    });
    if (!profile) {
      // Auto-créer un profil vide
      if (!req.user.organizationId) return res.json({ exists: false });
      profile = await prisma.sellerProfile.create({
        data: { organizationId: req.user.organizationId, preferredGateway: 'WIRE', verificationStatus: 'PENDING' }
      });
    }
    // Masquer les données sensibles partiellement
    const safe = { ...profile };
    if (safe.bankIBAN) safe.bankIBAN = safe.bankIBAN.slice(0,4) + '****' + safe.bankIBAN.slice(-4);
    if (safe.cinetpayApiKey) safe.cinetpayApiKey = '****';
    res.json(safe);
  } catch(e) { next(e); }
});

// PUT /api/seller/profile — Mettre à jour la gateway
router.put('/profile', auth, requirePermission('seller.configure_gateway'), async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.status(400).json({ error: 'Organization required to set up seller profile' });
    
    const body = req.body;
    const preferredGateway = body.preferredGateway || 'WIRE';

    // Champs dynamiques — stocker tout dans metadata JSON + champs Prisma connus
    const profileData = {
      // MTN MoMo
      mtnMomoNumber:        body.mtnMomoNumber        || null,
      mtnMomoCountry:       body.mtnMomoCountry       || null,
      // Orange Money  
      orangeMoneyNumber:    body.orangeMoneyNumber     || null,
      orangeMoneyCountry:   body.orangeMoneyCountry    || null,
      // Wave
      waveNumber:           body.waveNumber            || null,
      waveCountry:          body.waveCountry           || null,
      // Flutterwave
      flutterwaveAcct:      body.flutterwaveSubaccountId || body.flutterwaveAcct || null,
      // Paystack
      paystackAcct:         body.paystackRecipientCode || body.paystackAcct || null,
      // Wire/SWIFT
      bankName:             body.bankName              || null,
      bankIBAN:             body.bankIBAN || body.bankAccountNumber || null,
      bankSwift:            body.bankSwift             || null,
      bankBeneficiary:      body.bankBeneficiary       || null,
      bankCurrency:         body.bankCurrency          || 'USD',
      // Tous les champs étendus dans metadata
      metadata: JSON.stringify({
        // MTN
        mtnMomoName:         body.mtnMomoName,
        mtnMomoMerchantId:   body.mtnMomoMerchantId,
        // Orange Money
        orangeMoneyName:     body.orangeMoneyName,
        orangeMoneyApiKey:   body.orangeMoneyApiKey,
        orangeMoneyMerchantCode: body.orangeMoneyMerchantCode,
        // Wave
        waveName:            body.waveName,
        waveBusinessId:      body.waveBusinessId,
        // Flutterwave
        flutterwaveSecretKey:   body.flutterwaveSecretKey,
        flutterwavePublicKey:   body.flutterwavePublicKey,
        flutterwaveBankAccount: body.flutterwaveBankAccount,
        flutterwaveBankCode:    body.flutterwaveBankCode,
        flutterwaveCurrency:    body.flutterwaveCurrency,
        flutterwaveBusinessName: body.flutterwaveBusinessName,
        // Paystack
        paystackSecretKey:   body.paystackSecretKey,
        paystackPublicKey:   body.paystackPublicKey,
        paystackBankCode:    body.paystackBankCode,
        paystackAccountNumber: body.paystackAccountNumber,
        paystackCurrency:    body.paystackCurrency,
        paystackBusinessName: body.paystackBusinessName,
        // Wire extended
        bankAccountNumber:   body.bankAccountNumber,
        bankRoutingNumber:   body.bankRoutingNumber,
        bankCountry:         body.bankCountry,
        bankCity:            body.bankCity,
        bankAddress:         body.bankAddress,
        bankIntermediarySwift: body.bankIntermediarySwift,
      }),
      preferredGateway,
    };

    const profile = await prisma.sellerProfile.upsert({
      where: { organizationId: req.user.organizationId },
      update: { ...profileData, updatedAt: new Date() },
      create: { organizationId: req.user.organizationId, ...profileData, verificationStatus: 'PENDING' }
    });

    await prisma.auditLog.create({ data: {
      userId: req.user.userId, action: 'SELLER_PROFILE_UPDATED',
      entity: 'SellerProfile', entityId: profile.id,
      after: { preferredGateway, hasBank: !!bankIBAN, hasMoMo: !!mtnMomoNumber }
    }}).catch(() => {});

    res.json({ success: true, profile: { ...profile, bankIBAN: profile.bankIBAN ? '****' : null } });
  } catch(e) { next(e); }
});

// GET /api/seller/payouts — Historique des paiements reçus
router.get('/payouts', auth, async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.json({ payouts: [], total: 0 });
    const payouts = await prisma.sellerPayout.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const totalPaid = payouts.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
    const totalPending = payouts.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
    res.json({ payouts, totalPaid, totalPending });
  } catch(e) { next(e); }
});

// GET /api/seller/dashboard — Stats vendeur complètes
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) return res.json({ revenue: 0, pending: 0, orders: [], listings: [] });

    // Listings actifs de cette org
    const listings = await prisma.creditIssuance.findMany({
      where: { project: { organizationId: orgId }, forSale: true },
      include: {
        project: { select: { name: true, countryCode: true, type: true } },
        carbonScore: true,
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    // Ordres où cette org est vendeur
    const orders = await prisma.marketplaceOrder.findMany({
      where: { sellerOrgId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).catch(() => []);

    const revenue = orders
      .filter(o => o.status === 'SETTLED' || o.status === 'PAID')
      .reduce((s, o) => s + (o.sellerAmount || 0), 0);

    const pending = orders
      .filter(o => ['PENDING', 'PAYMENT_PENDING'].includes(o.status))
      .reduce((s, o) => s + (o.sellerAmount || 0), 0);

    const payouts = await prisma.sellerPayout.findMany({
      where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 20
    }).catch(() => []);

    const profile = await prisma.sellerProfile.findUnique({
      where: { organizationId: orgId }
    }).catch(() => null);

    res.json({
      revenue, pending,
      ordersCount: orders.length,
      settledCount: orders.filter(o => o.status === 'SETTLED').length,
      listings,
      recentOrders: orders.slice(0, 10),
      payouts,
      profile,
      hasGateway: !!(profile?.preferredGateway && profile?.preferredGateway !== 'WIRE' ? 
        profile.mtnMomoNumber || profile.orangeMoneyNumber || profile.flutterwaveAcct :
        profile?.bankIBAN),
    });
  } catch(e) { next(e); }
});

// POST /api/seller/request-payout — Demander un virement
router.post('/request-payout', auth, requirePermission('seller.request_payout'), async (req, res, next) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount) return res.status(400).json({ error: 'orderId and amount required' });

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: orderId, sellerOrgId: req.user.organizationId, status: { in: ['PAID','SETTLED'] }, sellerPaidAt: null }
    });
    if (!order) return res.status(404).json({ error: 'Order not found or already paid' });

    const profile = await prisma.sellerProfile.findUnique({
      where: { organizationId: req.user.organizationId }
    });
    if (!profile) return res.status(400).json({ error: 'Please configure your seller payment gateway first' });

    const payout = await prisma.sellerPayout.create({ data: {
      organizationId: req.user.organizationId,
      orderId, amount,
      gateway: profile.preferredGateway || 'WIRE',
      status: 'PENDING',
    }});

    // Déclencher le payout automatiquement
    dispatchPayout(payout.id).then(result => {
      console.log('[SellerPayout] Auto-dispatched:', payout.id, result.status);
    }).catch(err => {
      console.error('[SellerPayout] Auto-dispatch error:', err.message);
    });

    res.json({ success: true, payout, message: 'Payout initiated — funds will be transferred to your configured gateway' });
  } catch(e) { next(e); }
});

module.exports = router;

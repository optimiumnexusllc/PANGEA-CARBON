/**
 * PANGEA CARBON — Payout Automation Service v2.0
 * Distribue automatiquement les fonds au vendeur après confirmation du paiement acheteur
 * Gateways: MTN MoMo · Orange Money · Wave · Flutterwave · CinetPay · Wire/SWIFT
 */
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => n.toFixed(2);

// Lire les clés API depuis DB (Admin → Secrets & Config) ou ENV
async function getSecret(key) {
  try {
    const { decrypt } = require('./crypto.service');
    const s = await prisma.systemSetting.findUnique({ where: { key } });
    if (s?.value) return s.encrypted ? decrypt(s.value) : s.value;
  } catch(_) {}
  return process.env[key.toUpperCase().replace(/-/g,'_')] || null;
}

// Parser le metadata JSON du SellerProfile
function parseMeta(profile) {
  try { return JSON.parse(profile.metadata || '{}'); } catch { return {}; }
}

// ─── Logging Payout ──────────────────────────────────────────────────────────
async function logPayout(payoutId, event, data = {}) {
  console.log(`[Payout] ${payoutId} | ${event}`, JSON.stringify(data));
  // Audit trail en DB
  await prisma.auditLog.create({
    data: {
      userId: 'SYSTEM',
      action: `PAYOUT_${event.toUpperCase()}`,
      entity: 'SellerPayout',
      entityId: payoutId,
      after: data,
    }
  }).catch(() => {});
}

// ─── GATEWAY 1: MTN Mobile Money (via Flutterwave Transfers API) ─────────────
async function payoutMTN({ amount, profile, orderId, payoutId }) {
  const meta = parseMeta(profile);
  const fwKey = await getSecret('flutterwave_secret_key') || meta.flutterwaveSecretKey;
  if (!fwKey) throw new Error('MTN MoMo: Flutterwave API key not configured. Set it in Seller Portal or Admin → Secrets');

  const phone = profile.mtnMomoNumber?.replace(/[^0-9+]/g, '');
  const country = profile.mtnMomoCountry || 'CI';

  // Map country → Flutterwave currency + bank code
  const COUNTRY_MAP = {
    CI: { currency: 'XOF', bank: 'MTN' },
    GH: { currency: 'GHS', bank: 'MTN' },
    NG: { currency: 'NGN', bank: 'MTN' },
    UG: { currency: 'UGX', bank: 'MTN' },
    RW: { currency: 'RWF', bank: 'MTN' },
    CM: { currency: 'XAF', bank: 'MTN' },
    ZM: { currency: 'ZMW', bank: 'MTN' },
    BJ: { currency: 'XOF', bank: 'MTN' },
  };
  const cfg = COUNTRY_MAP[country] || { currency: 'USD', bank: 'MTN' };

  // Convertir USD → devise locale (taux fixe si pas d'API FX)
  const USD_RATES = { XOF: 600, GHS: 15, NGN: 1600, UGX: 3800, RWF: 1350, XAF: 600, ZMW: 26 };
  const localAmount = cfg.currency === 'USD' ? amount : Math.round(amount * (USD_RATES[cfg.currency] || 600));

  const ref = `PANGEA-MTN-${payoutId}-${Date.now()}`;
  const res = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fwKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_bank: cfg.bank,
      account_number: phone,
      amount: localAmount,
      currency: cfg.currency,
      narration: `PANGEA CARBON carbon credit sale payout — Order ${orderId}`,
      reference: ref,
      debit_currency: cfg.currency,
      meta: [{ mobile_number: phone, mobile_operator: 'MTN', country }],
      callback_url: `${process.env.BACKEND_URL || 'https://pangea-carbon.com'}/api/marketplace/webhook/flutterwave`,
    }),
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(`MTN MoMo failed: ${data.message}`);

  return {
    gateway: 'MTN_MOMO',
    ref: data.data?.id || ref,
    gatewayRef: String(data.data?.id || ref),
    status: data.data?.status === 'SUCCESSFUL' ? 'PAID' : 'PROCESSING',
    localAmount,
    localCurrency: cfg.currency,
    recipient: phone,
    meta: data.data,
  };
}

// ─── GATEWAY 2: Orange Money (via Orange Money API ou Flutterwave) ────────────
async function payoutOrangeMoney({ amount, profile, orderId, payoutId }) {
  const meta = parseMeta(profile);
  const phone = profile.orangeMoneyNumber?.replace(/[^0-9+]/g, '');
  const country = profile.orangeMoneyCountry || 'CI';

  // Essayer d'abord Orange Money Direct API
  const omKey = meta.orangeMoneyApiKey;
  const omMerchant = meta.orangeMoneyMerchantCode;

  if (omKey && omMerchant) {
    // Orange Money Business API (CI, SN, ML, GN, BF, CM)
    // Obtenir un token OAuth2 d'abord
    const COUNTRY_MAP = { CI: 'civ', SN: 'sen', ML: 'mli', GN: 'gin', BF: 'bfa', CM: 'cmr', NE: 'ner', MG: 'mdg' };
    const countryCode = COUNTRY_MAP[country] || 'civ';
    const USD_RATES = { XOF: 600, XAF: 600 };
    const currency = ['CI','SN','ML','GN','BF','NE'].includes(country) ? 'XOF' : 'XAF';
    const localAmount = Math.round(amount * (USD_RATES[currency] || 600));
    const ref = `PANGEA-OM-${payoutId}-${Date.now()}`;

    // Orange Money API B2C (payout marchand → client)
    const tokenRes = await fetch(`https://api.orange.com/oauth/v3/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${omKey}`,
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) throw new Error('Orange Money: Failed to get OAuth token');

    const res = await fetch(`https://api.orange.com/orange-money-webpay/${countryCode}/v1/webpayment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_key: omMerchant,
        currency,
        order_id: ref,
        amount: localAmount,
        return_url: 'https://pangea-carbon.com/dashboard/seller',
        cancel_url: 'https://pangea-carbon.com/dashboard/seller',
        notif_url: `${process.env.BACKEND_URL || 'https://pangea-carbon.com'}/api/marketplace/webhook/orange`,
        lang: 'fr',
        reference: ref,
        receiver_number: phone,
      }),
    });
    const data = await res.json();
    if (data.payment_url || data.status === 'SUCCESS') {
      return {
        gateway: 'ORANGE_MONEY',
        ref,
        gatewayRef: ref,
        status: 'PROCESSING',
        localAmount,
        localCurrency: currency,
        recipient: phone,
        meta: data,
      };
    }
    throw new Error(`Orange Money direct: ${data.message || JSON.stringify(data)}`);
  }

  // Fallback: Orange Money via Flutterwave
  const fwKey = await getSecret('flutterwave_secret_key') || meta.flutterwaveSecretKey;
  if (!fwKey) throw new Error('Orange Money: Configurez Orange Money API key ou Flutterwave dans Seller Portal');

  const USD_RATES = { XOF: 600, XAF: 600 };
  const currency = ['CI','SN','ML','GN','BF','NE'].includes(country) ? 'XOF' : 'XAF';
  const localAmount = Math.round(amount * (USD_RATES[currency] || 600));
  const ref = `PANGEA-OM-${payoutId}-${Date.now()}`;

  const res = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fwKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_bank: 'ORANGE',
      account_number: phone,
      amount: localAmount,
      currency,
      narration: `PANGEA CARBON carbon credit payout — Order ${orderId}`,
      reference: ref,
      debit_currency: currency,
    }),
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(`Orange Money via FW: ${data.message}`);

  return {
    gateway: 'ORANGE_MONEY',
    ref: String(data.data?.id || ref),
    gatewayRef: String(data.data?.id || ref),
    status: 'PROCESSING',
    localAmount,
    localCurrency: currency,
    recipient: phone,
    meta: data.data,
  };
}

// ─── GATEWAY 3: Wave (Sénégal, Côte d'Ivoire, Mali) ──────────────────────────
async function payoutWave({ amount, profile, orderId, payoutId }) {
  const meta = parseMeta(profile);
  const phone = profile.waveNumber?.replace(/[^0-9+]/g, '');
  const country = profile.waveCountry || 'SN';
  const waveKey = await getSecret('wave_api_key') || meta.waveApiKey;

  // Wave Business API (B2C payout)
  if (!waveKey) {
    // Sans API Key: créer une tâche manuelle Wave Business
    return {
      gateway: 'WAVE',
      ref: `PANGEA-WAVE-${payoutId}`,
      gatewayRef: `PANGEA-WAVE-${payoutId}`,
      status: 'PENDING_MANUAL',
      localAmount: Math.round(amount * 600),
      localCurrency: 'XOF',
      recipient: phone,
      meta: { note: 'Wave Business API key not configured — manual payout required via business.wave.com' },
    };
  }

  const localAmount = Math.round(amount * 600); // USD → XOF
  const ref = `PANGEA-WAVE-${payoutId}-${Date.now()}`;

  const res = await fetch('https://api.wave.com/v1/payout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${waveKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currency: 'XOF',
      amount: localAmount,
      receive_amount: localAmount,
      mobile: phone,
      national_id: meta.waveNationalId || null,
      name: meta.waveName || null,
      client_reference: ref,
      payment_reason: `PANGEA CARBON carbon credit payout — Order ${orderId}`,
    }),
  });
  const data = await res.json();
  if (data.id || data.status === 'processing') {
    return {
      gateway: 'WAVE',
      ref: data.id || ref,
      gatewayRef: data.id || ref,
      status: data.status === 'succeeded' ? 'PAID' : 'PROCESSING',
      localAmount,
      localCurrency: 'XOF',
      recipient: phone,
      meta: data,
    };
  }
  throw new Error(`Wave payout failed: ${data.error || JSON.stringify(data)}`);
}

// ─── GATEWAY 4: CinetPay (CI, SN, CM, ML, BF, TG, BJ) ───────────────────────
async function payoutCinetPay({ amount, profile, orderId, payoutId }) {
  const meta = parseMeta(profile);
  const apiKey = await getSecret('cinetpay_api_key') || meta.cinetpayApiKey || profile.cinetpayApiKey;
  const siteId = meta.cinetpaySiteId || await getSecret('cinetpay_site_id');
  const phone = meta.cinetpayPhone || profile.mtnMomoNumber || profile.orangeMoneyNumber;
  const country = meta.cinetpayCountry || profile.mtnMomoCountry || 'CI';
  if (!apiKey) throw new Error('CinetPay: API key not configured. Set it in Seller Portal or Admin → Secrets');
  if (!phone) throw new Error('CinetPay: Phone number not configured in seller profile');

  // CinetPay Transfer API (Mobile Money B2C)
  const COUNTRY_CURRENCIES = { CI:'XOF', SN:'XOF', ML:'XOF', BF:'XOF', TG:'XOF', BJ:'XOF', CM:'XAF', GN:'GNF', NE:'XOF' };
  const currency = COUNTRY_CURRENCIES[country] || 'XOF';
  const USD_RATES = { XOF: 600, XAF: 600, GNF: 8700 };
  const localAmount = Math.round(amount * (USD_RATES[currency] || 600));
  const ref = `PANGEA-CP-${payoutId}-${Date.now()}`;

  const res = await fetch('https://client.cinetpay.com/v1/transfer/money/send/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        amount: localAmount,
        currency,
        client_transaction_id: ref,
        prefixe: phone.startsWith('+') ? phone.slice(1, phone.length - 8) : '225',
        phone: phone.replace(/[^0-9]/g, '').slice(-8),
        notify_url: `${process.env.BACKEND_URL || 'https://pangea-carbon.com'}/api/marketplace/webhook/cinetpay`,
      }],
      apikey: apiKey,
      site_id: siteId,
    }),
  });
  const data = await res.json();
  if (data.code === '0' || data.message === 'SUCCESS') {
    return {
      gateway: 'CINETPAY',
      ref,
      gatewayRef: data.data?.lot || ref,
      status: 'PROCESSING',
      localAmount,
      localCurrency: currency,
      recipient: phone,
      meta: data,
    };
  }
  throw new Error(`CinetPay: ${data.message || JSON.stringify(data)}`);
}

// ─── GATEWAY 5: Flutterwave (Bank Transfer Afrique) ──────────────────────────
async function payoutFlutterwave({ amount, profile, orderId, payoutId }) {
  const meta = parseMeta(profile);
  const fwKey = await getSecret('flutterwave_secret_key') || meta.flutterwaveSecretKey;
  if (!fwKey) throw new Error('Flutterwave: Secret key not configured. Set it in Seller Portal');

  const subaccountId = profile.flutterwaveAcct || meta.flutterwaveSubaccountId;
  const bankAccount = meta.flutterwaveBankAccount;
  const bankCode = meta.flutterwaveBankCode || '044';
  const currency = meta.flutterwaveCurrency || 'NGN';
  if (!bankAccount) throw new Error('Flutterwave: Bank account number not configured in seller profile');

  const USD_RATES = { NGN: 1600, GHS: 15, KES: 130, ZAR: 19, UGX: 3800, XOF: 600, XAF: 600 };
  const localAmount = currency === 'USD' ? amount : Math.round(amount * (USD_RATES[currency] || 1));
  const ref = `PANGEA-FW-${payoutId}-${Date.now()}`;

  const res = await fetch('https://api.flutterwave.com/v3/transfers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fwKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account_bank: bankCode,
      account_number: bankAccount,
      amount: localAmount,
      currency,
      narration: `PANGEA CARBON carbon credit payout — Order ${orderId}`,
      reference: ref,
      callback_url: `${process.env.BACKEND_URL || 'https://pangea-carbon.com'}/api/marketplace/webhook/flutterwave`,
      meta: { order_id: orderId, payout_id: payoutId, subaccount: subaccountId },
    }),
  });
  const data = await res.json();
  if (data.status !== 'success') throw new Error(`Flutterwave transfer: ${data.message}`);

  return {
    gateway: 'FLUTTERWAVE',
    ref: String(data.data?.id || ref),
    gatewayRef: String(data.data?.id || ref),
    status: data.data?.status === 'SUCCESSFUL' ? 'PAID' : 'PROCESSING',
    localAmount,
    localCurrency: currency,
    recipient: bankAccount,
    meta: data.data,
  };
}

// ─── GATEWAY 6: Wire Transfer / SWIFT (Virement International) ───────────────
async function payoutWire({ amount, profile, orderId, payoutId }) {
  const meta = parseMeta(profile);

  // Virement international = créer une instruction manuelle + email
  const iban = profile.bankIBAN || meta.bankAccountNumber;
  const swift = profile.bankSwift;
  const bankName = profile.bankName;
  const beneficiary = profile.bankBeneficiary || meta.beneficiaryName;
  const currency = profile.bankCurrency || 'USD';
  const correspondent = meta.correspondentSwift;

  if (!swift && !iban) throw new Error('Wire Transfer: IBAN/SWIFT not configured in seller profile');

  const ref = `PANGEA-WIRE-${payoutId}`;

  // Notifier par email (si SMTP configuré)
  try {
    const { sendEmail } = require('./email.service');
    await sendEmail({
      to: process.env.PANGEA_OPS_EMAIL || 'ops@pangea-carbon.com',
      subject: `[ACTION REQUISE] Virement SWIFT — ${fmt(amount)} USD — Ordre ${orderId}`,
      html: `
        <h2>Instruction de virement SWIFT</h2>
        <p><strong>Référence:</strong> ${ref}</p>
        <p><strong>Montant:</strong> ${fmt(amount)} ${currency}</p>
        <p><strong>Bénéficiaire:</strong> ${beneficiary || 'N/A'}</p>
        <p><strong>Banque:</strong> ${bankName || 'N/A'}</p>
        <p><strong>IBAN:</strong> ${iban || 'N/A'}</p>
        <p><strong>SWIFT/BIC:</strong> ${swift || 'N/A'}</p>
        ${correspondent ? `<p><strong>Banque correspondante:</strong> ${correspondent}</p>` : ''}
        <p><strong>Ordre:</strong> ${orderId}</p>
        <p>Payout ID: ${payoutId}</p>
      `,
    });
  } catch(_) {}

  return {
    gateway: 'WIRE',
    ref,
    gatewayRef: ref,
    status: 'PENDING_MANUAL',
    localAmount: amount,
    localCurrency: currency,
    recipient: iban || swift,
    meta: { beneficiary, bankName, iban, swift, correspondent, note: 'Wire transfer instruction created — 1-3 business days' },
  };
}

// ─── MOTEUR PRINCIPAL ─────────────────────────────────────────────────────────
/**
 * Déclenche le payout au vendeur après confirmation de paiement acheteur
 * @param {string} orderId - ID de l'ordre MarketplaceOrder
 * @param {object} opts - { force: bool, retryGateway: string }
 */
async function executePayout(orderId, opts = {}) {
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (!['PAID', 'SETTLED'].includes(order.status) && !opts.force) {
    throw new Error(`Order ${orderId} not paid yet (status: ${order.status})`);
  }
  if (order.sellerPaidAt && !opts.force) {
    throw new Error(`Order ${orderId} already paid to seller at ${order.sellerPaidAt}`);
  }

  // Récupérer l'organisation vendeuse
  const listing = await prisma.creditIssuance.findUnique({
    where: { id: order.listingId },
    include: { project: { include: { organization: true } } },
  }).catch(() => null);

  const sellerOrgId = order.sellerOrgId || listing?.project?.organization?.id;
  if (!sellerOrgId) {
    console.warn(`[Payout] Order ${orderId}: No seller org found, creating manual payout record`);
  }

  // Récupérer le profil vendeur
  let profile = null;
  if (sellerOrgId) {
    profile = await prisma.sellerProfile.findUnique({ where: { organizationId: sellerOrgId } });
  }

  const gateway = opts.retryGateway || order.sellerGateway || profile?.preferredGateway || 'WIRE';
  const sellerAmount = order.sellerAmount || (order.total - order.pangeaFee);

  // Créer ou récupérer le record payout
  let payout = await prisma.sellerPayout.findFirst({
    where: { orderId, status: { not: 'FAILED' } },
  });

  if (!payout || opts.force) {
    payout = await prisma.sellerPayout.create({
      data: {
        organizationId: sellerOrgId || 'UNKNOWN',
        orderId,
        amount: sellerAmount,
        currency: 'USD',
        gateway,
        status: 'PROCESSING',
        initiatedAt: new Date(),
      }
    });
  }

  await logPayout(payout.id, 'INITIATED', { orderId, gateway, amount: sellerAmount, sellerOrgId });

  // Mettre à jour l'ordre
  await prisma.marketplaceOrder.update({
    where: { id: orderId },
    data: { sellerOrgId, sellerGateway: gateway, sellerAmount, payoutId: payout.id }
  }).catch(() => {});

  // ─── Router vers la bonne gateway ────────────────────────────────────────
  let result;
  const params = { amount: sellerAmount, profile: profile || {}, orderId, payoutId: payout.id };

  try {
    switch (gateway) {
      case 'MTN_MOMO':      result = await payoutMTN(params);         break;
      case 'ORANGE_MONEY':  result = await payoutOrangeMoney(params);  break;
      case 'WAVE':          result = await payoutWave(params);         break;
      case 'CINETPAY':      result = await payoutCinetPay(params);     break;
      case 'FLUTTERWAVE':   result = await payoutFlutterwave(params);  break;
      case 'WIRE':
      default:              result = await payoutWire(params);         break;
    }

    // ─── Succès ────────────────────────────────────────────────────────────
    const finalStatus = result.status === 'PAID' ? 'PAID' :
                        result.status === 'PENDING_MANUAL' ? 'PENDING' : 'PROCESSING';

    await prisma.sellerPayout.update({
      where: { id: payout.id },
      data: {
        status: finalStatus,
        gatewayRef: result.gatewayRef || result.ref,
        paidAt: finalStatus === 'PAID' ? new Date() : null,
        notes: JSON.stringify({ ...result.meta, localAmount: result.localAmount, localCurrency: result.localCurrency }),
        updatedAt: new Date(),
      }
    });

    await prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        sellerPaidAt: finalStatus === 'PAID' ? new Date() : null,
        status: 'SETTLED',
        settledAt: new Date(),
      }
    });

    await logPayout(payout.id, 'SUCCESS', {
      gateway: result.gateway,
      ref: result.gatewayRef,
      status: finalStatus,
      amount: sellerAmount,
      localAmount: result.localAmount,
      localCurrency: result.localCurrency,
    });

    return { success: true, payoutId: payout.id, ...result };

  } catch (error) {
    // ─── Échec — enregistrer et retry eligible ─────────────────────────────
    await prisma.sellerPayout.update({
      where: { id: payout.id },
      data: {
        status: 'FAILED',
        notes: JSON.stringify({ error: error.message, gateway, timestamp: new Date() }),
        updatedAt: new Date(),
      }
    });

    await logPayout(payout.id, 'FAILED', { error: error.message, gateway });

    // Retry automatique avec gateway de fallback après 5 minutes
    const FALLBACK_ORDER = ['FLUTTERWAVE', 'CINETPAY', 'WIRE'];
    const nextGateway = FALLBACK_ORDER.find(g => g !== gateway);

    if (nextGateway && !opts.noFallback) {
      console.log(`[Payout] ${payout.id} — Retrying with fallback gateway: ${nextGateway} in 5min`);
      setTimeout(async () => {
        try {
          await executePayout(orderId, { force: true, retryGateway: nextGateway, noFallback: true });
        } catch(e) {
          console.error(`[Payout] Fallback ${nextGateway} also failed:`, e.message);
        }
      }, 5 * 60 * 1000);
    }

    throw error;
  }
}

/**
 * Webhook confirmation — appelé par Flutterwave/Orange/Wave quand paiement confirmé côté gateway
 */
async function confirmPayoutWebhook(gatewayRef, status, gateway) {
  const payout = await prisma.sellerPayout.findFirst({
    where: { OR: [{ gatewayRef }, { notes: { contains: gatewayRef } }] }
  });
  if (!payout) return null;

  const finalStatus = ['SUCCESSFUL', 'SUCCESS', 'PAID', 'COMPLETED'].includes(status?.toUpperCase()) ? 'PAID' : 'FAILED';

  await prisma.sellerPayout.update({
    where: { id: payout.id },
    data: { status: finalStatus, paidAt: finalStatus === 'PAID' ? new Date() : null }
  });

  if (finalStatus === 'PAID') {
    await prisma.marketplaceOrder.updateMany({
      where: { payoutId: payout.id },
      data: { sellerPaidAt: new Date(), status: 'SETTLED' }
    });
  }

  await logPayout(payout.id, `WEBHOOK_${finalStatus}`, { gateway, gatewayRef, status });
  return payout;
}

/**
 * Retry de tous les payouts FAILED ou PENDING de plus de 30min
 * Appelé par le job scheduler (cron)
 */
async function retryStalePayouts() {
  const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
  const stale = await prisma.sellerPayout.findMany({
    where: {
      status: { in: ['FAILED', 'PENDING'] },
      createdAt: { lt: threshold },
    },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[Payout] Retry sweep: ${stale.length} stale payouts found`);
  let retried = 0;

  for (const payout of stale) {
    try {
      await executePayout(payout.orderId, { force: true });
      retried++;
      await sleep(2000); // Rate limiting inter-payouts
    } catch(e) {
      console.warn(`[Payout] Retry failed for ${payout.id}:`, e.message);
    }
  }

  return { swept: stale.length, retried };
}

/**
 * Statut d'un payout
 */
async function getPayoutStatus(orderId) {
  const payout = await prisma.sellerPayout.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
  const order = await prisma.marketplaceOrder.findUnique({
    where: { id: orderId },
    select: { status: true, sellerPaidAt: true, sellerAmount: true, sellerGateway: true }
  });
  return { payout, order };
}

module.exports = {
  executePayout,
  confirmPayoutWebhook,
  retryStalePayouts,
  getPayoutStatus,
};

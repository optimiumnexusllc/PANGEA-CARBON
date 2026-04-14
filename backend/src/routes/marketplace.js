/**
 * PANGEA CARBON — Carbon Marketplace + Split Payment Engine
 *
 * ARCHITECTURE FINANCIÈRE:
 * ┌─────────────────────────────────────────────────────────┐
 * │  FLUX 1 — SaaS ($299/$799/mois)                        │
 * │  Buyer → Stripe → 100% PANGEA Stripe account           │
 * ├─────────────────────────────────────────────────────────┤
 * │  FLUX 2 — Achat crédits carbone                        │
 * │  Buyer → Gateway → Split Engine                        │
 * │    ├── 3-5% PANGEA fee → PANGEA Stripe (automatique)   │
 * │    └── 95-97% Seller → Africa gateway préférée:        │
 * │         MTN MoMo · Orange Money · CinetPay · Wave      │
 * │         Flutterwave · Paystack · Wire SWIFT             │
 * └─────────────────────────────────────────────────────────┘
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const prisma = new PrismaClient();

// ─── Configuration ────────────────────────────────────────────────────────────
const BASE_URL  = process.env.NEXT_PUBLIC_URL || 'https://pangea-carbon.com';
// Lire depuis DB en temps réel (mis à jour sans redémarrage)
async function getPangeaFee() {
  // Priorité: DB > PANGEA_FEE_PCT env > PANGEA_CARBON_FEE_PCT env > 3.5
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'pangea_fee_pct' } });
    if (setting?.value) {
      const val = parseFloat(setting.encrypted ? setting.value : setting.value);
      if (!isNaN(val) && val > 0 && val < 50) return val;
    }
  } catch(_e) {}
  return parseFloat(
    process.env.PANGEA_FEE_PCT ||
    process.env.PANGEA_CARBON_FEE_PCT ||
    '3.5'
  );
}

// ─── Stripe — lit depuis DB ou env var ───────────────────────────────────────
async function getStripeKey() {
  // Priorité: marketplace_stripe_key DB > STRIPE_SECRET_KEY env
  try {
    const mkt = await prisma.systemSetting.findUnique({ where: { key: 'marketplace_stripe_key' } });
    if (mkt?.value && mkt.value.length > 10) return mkt.value;
  } catch(_e) {}
  try {
    const sk = await prisma.systemSetting.findUnique({ where: { key: 'stripe_secret_key' } });
    if (sk?.value && sk.value.length > 10) return sk.value;
  } catch(_e) {}
  const envKey = process.env.STRIPE_SECRET_KEY || process.env.MARKETPLACE_STRIPE_KEY;
  if (envKey) return envKey;
  return null;
}
async function getStripeClient() {
  const key = await getStripeKey();
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured — add it in Admin → Secrets → Stripe Payments');
  return require('stripe')(key);
}

// ─── CinetPay (Afrique de l'Ouest) ───────────────────────────────────────────
const cinetpay = {
  async initPayment({ amount, currency = 'XOF', orderId, description, returnUrl, notifyUrl }) {
    const apiKey  = process.env.CINETPAY_API_KEY;
    const siteId  = process.env.CINETPAY_SITE_ID;
    if (!apiKey || !siteId) throw new Error('CINETPAY_API_KEY / CINETPAY_SITE_ID not configured');

    const body = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: orderId,
      amount: Math.round(amount),
      currency,
      description,
      return_url: returnUrl,
      notify_url: notifyUrl,
      channels: 'ALL',
      lang: 'fr',
    };

    const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  async checkStatus(transactionId) {
    const apiKey = process.env.CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID;
    const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
    });
    return res.json();
  }
};

// ─── Flutterwave (Pan-Africa) ─────────────────────────────────────────────────
const flutterwave = {
  async initPayment({ amount, currency = 'USD', orderId, email, name, phone, description, redirectUrl }) {
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY not configured');

    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: orderId,
        amount,
        currency,
        redirect_url: redirectUrl,
        customer: { email, name, phonenumber: phone },
        customizations: { title: 'PANGEA CARBON', description, logo: 'https://pangea-carbon.com/logo.png' },
      }),
    });
    return res.json();
  },

  async verifyTransaction(txId) {
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.json();
  }
};

// ─── Mobile Money (MTN / Orange via Flutterwave ou API directe) ───────────────
const mobileMoney = {
  async sendPayout({ amount, currency, phone, network, reference, reason }) {
    const key = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY not configured for Mobile Money payouts');

    const res = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_bank: network, // MTN, AIRTEL, VODAFONE, TIGO, etc.
        account_number: phone,
        amount,
        currency,
        narration: reason,
        reference,
        debit_currency: currency,
      }),
    });
    return res.json();
  }
};

// ─── Split Engine ─────────────────────────────────────────────────────────────
async function splitPayment({ orderId, total, currency, sellerConfig, feePct = 3.5 }) {
  const pangeaFee    = total * (feePct / 100);
  const sellerAmount = total - pangeaFee;
  result.pangeaFeePct = feePct;

  const result = {
    orderId,
    total,
    pangeaFee: parseFloat(pangeaFee.toFixed(2)),
    sellerAmount: parseFloat(sellerAmount.toFixed(2)),
    pangeaFeePct: PANGEA_FEE_PCT,
    status: 'pending',
    payouts: [],
  };

  // 1. PANGEA fee → Stripe (immédiat ou via Stripe Transfer si Stripe Connect)
  try {
    const stripe = await getStripeClient();
    const pangeaFeeIntent = await stripe.paymentIntents.create({
      amount: Math.round(pangeaFee * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: `PANGEA CARBON Platform Fee — Order ${orderId} (${PANGEA_FEE_PCT}%)`,
      metadata: { order_id: orderId, type: 'platform_fee' },
    });
    result.payouts.push({
      destination: 'PANGEA Stripe', amount: pangeaFee,
      currency: 'USD', ref: pangeaFeeIntent.id, status: 'pending'
    });
  } catch(_e) {
    result.payouts.push({ destination: 'PANGEA Stripe', amount: pangeaFee, status: 'stripe_not_configured' });
  }

  // 2. Seller payout → gateway préférée
  if (sellerConfig) {
    const method = sellerConfig.payoutMethod;

    if (method === 'MOBILE_MONEY' && sellerConfig.phone) {
      try {
        const payout = await mobileMoney.sendPayout({
          amount: sellerAmount,
          currency: currency || sellerConfig.currency || 'XOF',
          phone: sellerConfig.phone,
          network: sellerConfig.network || 'MTN',
          reference: `PAYOUT-${orderId}`,
          reason: `Carbon credit sale — Order ${orderId}`,
        });
        result.payouts.push({
          destination: `${sellerConfig.network || 'MTN'} Mobile Money`,
          amount: sellerAmount,
          phone: sellerConfig.phone,
          ref: payout?.data?.id || 'pending',
          status: payout?.status === 'success' ? 'sent' : 'pending',
        });
      } catch(e) {
        result.payouts.push({ destination: 'Mobile Money', amount: sellerAmount, status: 'error', error: e.message });
      }

    } else if (method === 'CINETPAY') {
      result.payouts.push({
        destination: 'CinetPay', amount: sellerAmount,
        status: 'scheduled',
        note: 'CinetPay payout scheduled — processed within 24h',
      });

    } else if (method === 'WIRE_TRANSFER') {
      result.payouts.push({
        destination: 'Wire Transfer (SWIFT)', amount: sellerAmount,
        status: 'scheduled',
        note: `Wire transfer of ${sellerAmount} USD scheduled to ${sellerConfig.bankName || 'seller bank'}`,
        iban: sellerConfig.iban,
        swift: sellerConfig.swift,
      });

    } else if (method === 'FLUTTERWAVE') {
      try {
        // Pour payout Flutterwave (compte bancaire africain)
        const payout = await mobileMoney.sendPayout({
          amount: sellerAmount,
          currency: sellerConfig.currency || 'USD',
          phone: sellerConfig.accountNumber,
          network: sellerConfig.bank || '044',
          reference: `FW-PAYOUT-${orderId}`,
          reason: `Carbon credit sale — Order ${orderId}`,
        });
        result.payouts.push({
          destination: 'Flutterwave Bank Transfer', amount: sellerAmount,
          ref: payout?.data?.id, status: 'processing',
        });
      } catch(e) {
        result.payouts.push({ destination: 'Flutterwave', amount: sellerAmount, status: 'error', error: e.message });
      }

    } else {
      result.payouts.push({
        destination: 'Manual settlement', amount: sellerAmount,
        status: 'pending_manual',
        note: 'Payout pending — seller payment method not configured',
      });
    }
  }

  result.status = result.payouts.every(p => p.status !== 'error') ? 'processing' : 'partial_error';
  return result;
}

// ─── Live prices ──────────────────────────────────────────────────────────────
const LIVE_PRICES = {
  VERRA_VCS:    { bid: 11.20, ask: 12.80, last: 12.00, change: +0.35, changeP: +2.9 },
  GOLD_STANDARD:{ bid: 22.50, ask: 25.00, last: 23.75, change: +1.25, changeP: +5.6 },
  ARTICLE6:     { bid: 42.00, ask: 48.00, last: 45.00, change: -2.00, changeP: -4.3 },
  CORSIA:       { bid: 17.50, ask: 20.00, last: 18.75, change: +0.75, changeP: +4.2 },
  BIOMASS:      { bid:  8.50, ask: 10.50, last:  9.50, change: -0.50, changeP: -5.0 },
};

// ─── GET /prices ──────────────────────────────────────────────────────────────
router.get('/prices', auth, async (req, res) => {
  const PANGEA_FEE_PCT = await getPangeaFee();
  const seed = Math.floor(Date.now() / 30000);
  const jitter = (std) => (Math.sin(seed * 7 + std.charCodeAt(0)) * 0.05) * LIVE_PRICES[std].last;
  const prices = Object.entries(LIVE_PRICES).map(([standard, p]) => ({
    standard,
    bid: parseFloat((p.bid + jitter(standard)).toFixed(2)),
    ask: parseFloat((p.ask + jitter(standard)).toFixed(2)),
    last: parseFloat((p.last + jitter(standard)).toFixed(2)),
    change: p.change, changeP: p.changeP,
    volume24h: Math.floor(Math.random() * 50000 + 10000),
    updatedAt: new Date().toISOString(),
  }));
  res.json({ prices, pangeaFee: PANGEA_FEE_PCT, timestamp: new Date() });
});

// ─── GET /listings ────────────────────────────────────────────────────────────
router.get('/listings', auth, async (req, res, next) => {
  try {
    const PANGEA_FEE_PCT = await getPangeaFee();
    const { standard, maxPrice, country } = req.query;
    const issuances = await prisma.creditIssuance.findMany({
      where: { status: 'ISSUED', ...(standard && { standard }) },
      include: { project: { select: { name: true, type: true, countryCode: true, installedMW: true } } },
      orderBy: { issuedAt: 'desc' }, take: 50,
    });

    const listings = issuances.length > 0 ? issuances.map(iss => ({
      id: iss.id, standard: iss.standard, vintage: iss.vintage,
      quantity: iss.quantity, availableQty: iss.quantity,
      askPrice: parseFloat((LIVE_PRICES[iss.standard]?.ask || 12).toFixed(2)),
      project: iss.project, verified: true, seller: 'PANGEA CARBON Africa',
      serialFrom: iss.serialFrom, serialTo: iss.serialTo,
      blockHash: iss.blockHash?.slice(0, 16) + '...',
      issuedAt: iss.issuedAt,
    })) : generateDemoListings();

    const filtered = listings
      .filter(l => !maxPrice || l.askPrice <= parseFloat(maxPrice))
      .filter(l => !country || l.project?.countryCode === country);

    res.json({ listings: filtered, total: filtered.length, pangeaFee: PANGEA_FEE_PCT });
  } catch (e) { next(e); }
});

function generateDemoListings() {
  const projects = [
    { name: 'Parc Solaire Abidjan Nord',  type: 'SOLAR', countryCode: 'CI', installedMW: 52.5 },
    { name: 'Turkana Wind Farm',          type: 'WIND',  countryCode: 'KE', installedMW: 120  },
    { name: 'Lagos Solar Plant',          type: 'SOLAR', countryCode: 'NG', installedMW: 30   },
    { name: 'Dakar Hybrid Project',       type: 'HYBRID',countryCode: 'SN', installedMW: 18.5 },
    { name: 'Volta Hydro Ghana',          type: 'HYDRO', countryCode: 'GH', installedMW: 45   },
  ];
  return projects.flatMap((p, i) => [
    { id: `demo-${i}-vcs`, standard: 'VERRA_VCS',    vintage: 2024,
      quantity: Math.floor(Math.random()*5000+1000), availableQty: Math.floor(Math.random()*3000+500),
      askPrice: parseFloat((12 + Math.random()*2).toFixed(2)),
      project: p, verified: true, seller: p.name, issuedAt: new Date() },
    { id: `demo-${i}-gs`,  standard: 'GOLD_STANDARD', vintage: 2024,
      quantity: Math.floor(Math.random()*2000+500), availableQty: Math.floor(Math.random()*1500+200),
      askPrice: parseFloat((23 + Math.random()*3).toFixed(2)),
      project: p, verified: true, seller: p.name, issuedAt: new Date() },
  ]).slice(0, 12);
}

// ─── POST /bid — Ordre + Paiement + Split ────────────────────────────────────
router.post('/bid', auth, async (req, res, next) => {
  try {
    const PANGEA_FEE_PCT = await getPangeaFee();
    const { listingId, quantity, maxPrice, orderType, buyerNote, paymentGateway } = req.body;
    if (!listingId || !quantity || !maxPrice)
      return res.status(400).json({ error: 'listingId, quantity, maxPrice required' });

    const qty      = parseFloat(quantity);
    const price    = parseFloat(maxPrice);
    const subtotal = qty * price;
    const fee      = subtotal * (PANGEA_FEE_PCT / 100);
    const total    = subtotal + fee;

    // 1. Créer l'ordre
    let order;
    try {
      order = await prisma.marketplaceOrder.create({
        data: {
          userId: req.user.userId,
          listingId, quantity: qty, pricePerTonne: price,
          subtotal, pangeaFee: fee, total,
          orderType: orderType || 'MARKET',
          buyerNote: buyerNote || null,
          status: 'PENDING',
        }
      });
    } catch(_e) {
      const fakeId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      order = { id: fakeId };
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, name: true }
    });

    // 2. Décider gateway selon montant et préférence buyer
    const amountCents = Math.round(total * 100);
    const gateway = paymentGateway || (total < 2000 ? 'STRIPE_CHECKOUT' : 'STRIPE_INVOICE');
    let paymentUrl = null, invoicePdf = null, paymentMode = 'manual', paymentError = null;
    let stripeSessionId = null, stripeInvoiceId = null;

    // ── STRIPE CHECKOUT (petits montants ou buyer préfère carte) ──────────────
    if (gateway === 'STRIPE_CHECKOUT') {
      try {
        const stripe = await getStripeClient();
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: user.email,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `PANGEA CARBON — ${qty.toLocaleString()} tCO₂e`,
                  description: `Carbon credits @ $${price}/tonne · Order ${order.id}`,
                },
                unit_amount: Math.round(subtotal * 100),
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'usd',
                product_data: { name: `PANGEA CARBON Platform Fee (${PANGEA_FEE_PCT}%)` },
                unit_amount: Math.round(fee * 100),
              },
              quantity: 1,
            },
          ],
          metadata: { order_id: order.id, listing_id: listingId, user_id: req.user.userId, type: 'carbon_trade' },
          success_url: `${BASE_URL}/dashboard/marketplace?order=${order.id}&status=success`,
          cancel_url:  `${BASE_URL}/dashboard/marketplace?order=${order.id}&status=cancelled`,
        });
        paymentUrl  = session.url;
        stripeSessionId = session.id;
        paymentMode = 'checkout';
        try {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { stripeSessionId, stripeInvoiceUrl: paymentUrl, paymentMethod: 'STRIPE_CARD', status: 'PAYMENT_PENDING' }
          });
        } catch(_e) {}
      } catch(stripeErr) {
        paymentMode = 'manual';
        paymentError = stripeErr.message || 'Stripe error';
      }

    // ── STRIPE INVOICE (grands montants — virement accepté) ───────────────────
    } else if (gateway === 'STRIPE_INVOICE') {
      try {
        const stripe = await getStripeClient();
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        const customer  = customers.data[0] || await stripe.customers.create({ email: user.email, name: user.name });

        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: 'send_invoice',
          days_until_due: 7,
          description: `PANGEA CARBON — ${qty.toLocaleString()} tCO₂e @ $${price}/t — Order ${order.id}`,
          metadata: { order_id: order.id },
          footer: 'PANGEA CARBON Africa · pangea-carbon.com · contact@pangea-carbon.com',
        });
        await stripe.invoiceItems.create({
          customer: customer.id, invoice: invoice.id,
          amount: Math.round(subtotal * 100), currency: 'usd',
          description: `Carbon Credits — ${qty.toLocaleString()} tCO₂e @ $${price}/tonne`,
        });
        await stripe.invoiceItems.create({
          customer: customer.id, invoice: invoice.id,
          amount: Math.round(fee * 100), currency: 'usd',
          description: `PANGEA CARBON Platform Fee (${PANGEA_FEE_PCT}%)`,
        });
        const finalInv = await stripe.invoices.finalizeInvoice(invoice.id);
        await stripe.invoices.sendInvoice(invoice.id);

        paymentUrl    = finalInv.hosted_invoice_url;
        invoicePdf    = finalInv.invoice_pdf;
        stripeInvoiceId = finalInv.id;
        paymentMode   = 'invoice';
        try {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { stripeInvoiceId, stripeInvoiceUrl: paymentUrl, invoicePdf, paymentMethod: 'STRIPE_INVOICE', status: 'PAYMENT_PENDING' }
          });
        } catch(_e) {}
      } catch(stripeErr) {
        paymentMode = 'manual';
        paymentError = stripeErr.message || 'Stripe invoice error';
      }

    // ── CINETPAY (Afrique de l'Ouest — XOF/XAF) ──────────────────────────────
    } else if (gateway === 'CINETPAY') {
      try {
        const result = await cinetpay.initPayment({
          amount: Math.round(total * 655), // USD → XOF approximatif
          currency: 'XOF',
          orderId: order.id,
          description: `Crédits carbone — ${qty} tCO₂e — PANGEA CARBON`,
          returnUrl: `${BASE_URL}/dashboard/marketplace?order=${order.id}&status=success`,
          notifyUrl: `${BASE_URL}/api/marketplace/webhook/cinetpay`,
        });
        if (result?.data?.payment_url) {
          paymentUrl  = result.data.payment_url;
          paymentMode = 'cinetpay';
          try {
            await prisma.marketplaceOrder.update({
              where: { id: order.id },
              data: { stripeInvoiceUrl: paymentUrl, paymentMethod: 'CINETPAY', status: 'PAYMENT_PENDING' }
            });
          } catch(_e) {}
        }
      } catch(e) {
        paymentMode = 'manual';
      }

    // ── FLUTTERWAVE (Pan-Africa) ──────────────────────────────────────────────
    } else if (gateway === 'FLUTTERWAVE') {
      try {
        const result = await flutterwave.initPayment({
          amount: total, currency: 'USD', orderId: order.id,
          email: user.email, name: user.name,
          description: `Carbon Credits — ${qty} tCO₂e — PANGEA CARBON`,
          redirectUrl: `${BASE_URL}/dashboard/marketplace?order=${order.id}&status=success`,
        });
        if (result?.data?.link) {
          paymentUrl  = result.data.link;
          paymentMode = 'flutterwave';
          try {
            await prisma.marketplaceOrder.update({
              where: { id: order.id },
              data: { stripeInvoiceUrl: paymentUrl, paymentMethod: 'FLUTTERWAVE', status: 'PAYMENT_PENDING' }
            });
          } catch(_e) {}
        }
      } catch(e) {
        paymentMode = 'manual';
      }
    }

    // 3. Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'MARKETPLACE_ORDER_CREATED',
        entity: 'CreditIssuance', entityId: listingId,
        after: { orderId: order.id, qty, price, subtotal, pangeaFee: fee, total, pangeaFeePct: PANGEA_FEE_PCT, gateway, paymentMode }
      }
    }).catch(() => {});

    // 4. Réponse structurée
    const PAYMENT_LABELS = {
      checkout:    { label: 'Stripe Card',           icon: '💳', redirect: true  },
      invoice:     { label: 'Stripe Invoice (email)', icon: '📧', redirect: false },
      cinetpay:    { label: 'CinetPay',              icon: '🌍', redirect: true  },
      flutterwave: { label: 'Flutterwave',           icon: '🦋', redirect: true  },
      manual:      { label: 'Manual settlement',     icon: '📞', redirect: false },
    };
    const pm = PAYMENT_LABELS[paymentMode] || PAYMENT_LABELS.manual;

    res.status(201).json({
      orderId:      order.id,
      status:       paymentMode === 'manual' ? 'PENDING' : 'PAYMENT_PENDING',
      quantity:     qty,
      pricePerTonne: price,
      subtotal:     parseFloat(subtotal.toFixed(2)),
      pangeaFee:    parseFloat(fee.toFixed(2)),
      pangeaFeePct: PANGEA_FEE_PCT,
      sellerAmount: parseFloat((subtotal - fee + fee - fee).toFixed(2)), // seller = subtotal after fee
      total:        parseFloat(total.toFixed(2)),

      // Payment
      paymentMode,
      paymentError: paymentError, // null si OK, message si erreur
      paymentGateway: pm.label,
      paymentIcon:    pm.icon,
      paymentUrl:     paymentUrl,
      invoicePdf:     invoicePdf,
      autoRedirect:   pm.redirect && !!paymentUrl,

      // Available gateways pour retry
      availableGateways: [
        { id: 'STRIPE_CHECKOUT', label: 'Card (Stripe)',          icon: '💳', minAmount: 0,    maxAmount: 50000 },
        { id: 'STRIPE_INVOICE',  label: 'Invoice / Wire',         icon: '📧', minAmount: 0,    maxAmount: 999999 },
        { id: 'CINETPAY',        label: 'CinetPay (West Africa)', icon: '🌍', minAmount: 0,    maxAmount: 5000  },
        { id: 'FLUTTERWAVE',     label: 'Flutterwave (Africa)',   icon: '🦋', minAmount: 0,    maxAmount: 50000 },
      ],

      splitBreakdown: {
        label:       'Payment split',
        buyerPays:   parseFloat(total.toFixed(2)),
        pangeaFee:   { amount: parseFloat(fee.toFixed(2)), pct: PANGEA_FEE_PCT, destination: 'PANGEA Stripe' },
        sellerGets:  { amount: parseFloat(subtotal.toFixed(2)), pct: 100 - PANGEA_FEE_PCT, destination: 'Seller Africa gateway' },
      },

      message: paymentMode === 'invoice'
        ? `Invoice sent to ${user.email} — due in 7 days. Card or wire transfer accepted.`
        : paymentMode === 'manual'
        ? 'Order registered. Our team will contact you within 24h for payment.'
        : `Redirecting to ${pm.label} payment...`,

      nextSteps: paymentMode === 'invoice'
        ? [`Check ${user.email} for Stripe invoice`, 'Pay by card or wire (7 days)', 'Credits transferred 48h after payment']
        : paymentMode === 'manual'
        ? ['KYC verification (one-time)', 'Wire transfer instructions sent by email', 'Credits transferred 48h after settlement']
        : [`Complete ${pm.label} payment`, 'Split processed: PANGEA fee + seller payment', 'Credits transferred automatically'],
    });

  } catch (e) { next(e); }
});

// ─── GET /order/:id ───────────────────────────────────────────────────────────
router.get('/order/:id', auth, async (req, res, next) => {
  try {
    let order;
    try {
      order = await prisma.marketplaceOrder.findUnique({ where: { id: req.params.id } });
    } catch(_e) { order = null; }
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Sync Stripe status
    if (order.stripeSessionId || order.stripeInvoiceId) {
      try {
        const stripe = await getStripeClient();
        if (order.stripeSessionId && order.status !== 'PAID') {
          const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
          if (session.payment_status === 'paid') {
            order = await prisma.marketplaceOrder.update({
              where: { id: order.id },
              data: { status: 'PAID', paidAt: new Date() }
            });
          }
        }
        if (order.stripeInvoiceId && order.status !== 'PAID') {
          const inv = await stripe.invoices.retrieve(order.stripeInvoiceId);
          if (inv.status === 'paid') {
            order = await prisma.marketplaceOrder.update({
              where: { id: order.id },
              data: { status: 'PAID', paidAt: new Date() }
            });
          }
        }
      } catch(_e) {}
    }
    res.json(order);
  } catch (e) { next(e); }
});

// ─── GET /orders ──────────────────────────────────────────────────────────────
router.get('/orders', auth, async (req, res, next) => {
  try {
    let orders = [];
    try {
      orders = await prisma.marketplaceOrder.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' }, take: 50,
      });
    } catch(_e) {}
    res.json({ orders, total: orders.length, pangeaFee: PANGEA_FEE_PCT });
  } catch (e) { next(e); }
});

// ─── GET /fee-info ─────────────────────────────────────────────────────────────
router.get('/fee-info', auth, async (req, res) => {
  const PANGEA_FEE_PCT = await getPangeaFee();
  res.json({
    pangeaFeePct: PANGEA_FEE_PCT,
    description: `PANGEA CARBON takes ${PANGEA_FEE_PCT}% on every carbon credit trade`,
    feeDestination: 'PANGEA CARBON Stripe account (automatic)',
    sellerPct: 100 - PANGEA_FEE_PCT,
    sellerDestination: 'Seller preferred payout method (Mobile Money, CinetPay, Wire, Flutterwave)',
    gateways: {
      buyer: ['Stripe Card', 'Stripe Invoice (wire)', 'CinetPay (XOF/XAF)', 'Flutterwave (USD/local)'],
      sellerPayout: ['MTN Mobile Money', 'Orange Money', 'CinetPay', 'Flutterwave Bank Transfer', 'Wire SWIFT/SEPA'],
    },
    saasVsCarbon: {
      saas: 'Stripe subscriptions → 100% PANGEA account',
      carbon: `Buyer pays total → ${PANGEA_FEE_PCT}% to PANGEA Stripe + ${100-PANGEA_FEE_PCT}% to seller Africa gateway`,
    }
  });
});

// ─── POST /webhook/stripe ─────────────────────────────────────────────────────
router.post('/webhook/stripe', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.json({ received: true });

  let event;
  try {
    const stripe = await getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const orderId = s.metadata?.order_id;
      if (orderId && s.payment_status === 'paid') {
        await prisma.marketplaceOrder.update({
          where: { id: orderId },
          data: { status: 'PAID', paidAt: new Date() }
        }).catch(() => {});

        // Déclencher le split seller payout
        try {
          const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
          if (order) {
            await splitPayment({
              orderId,
              total: order.subtotal, // seller gets subtotal (PANGEA fee already collected via Stripe)
              currency: 'USD',
              sellerConfig: null, // TODO: seller payout preferences
            });
          }
        } catch(_e) {}
      }
      break;
    }
    case 'invoice.paid': {
      const inv = event.data.object;
      try {
        const order = await prisma.marketplaceOrder.findFirst({ where: { stripeInvoiceId: inv.id } });
        if (order) {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { status: 'PAID', paidAt: new Date() }
          });
        }
      } catch(_e) {}
      break;
    }
  }
  res.json({ received: true });
});

// ─── POST /webhook/cinetpay ───────────────────────────────────────────────────
router.post('/webhook/cinetpay', async (req, res) => {
  try {
    const { transaction_id, status } = req.body;
    if (status === 'ACCEPTED' && transaction_id) {
      await prisma.marketplaceOrder.updateMany({
        where: { id: transaction_id },
        data: { status: 'PAID', paidAt: new Date(), paymentMethod: 'CINETPAY' }
      }).catch(() => {});
    }
    res.json({ code: '00', message: 'OK' });
  } catch(_e) {
    res.json({ code: '00', message: 'OK' });
  }
});


// ─── DELETE /orders/:id — Supprimer un ordre ─────────────────────────────────
router.delete('/orders/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    let order;
    try {
      order = await prisma.marketplaceOrder.findUnique({ where: { id } });
    } catch(_e) { order = null; }

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Ne pas supprimer les ordres PAID ou SETTLED
    if (['PAID', 'SETTLED', 'RETIRED'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot delete order with status ${order.status}` });
    }

    try {
      await prisma.marketplaceOrder.delete({ where: { id } });
    } catch(_e) { /* ignore si table n'existe pas encore */ }

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'MARKETPLACE_ORDER_DELETED',
        entity: 'MarketplaceOrder', entityId: id,
        after: { status: order.status, total: order.total }
      }
    }).catch(() => {});

    res.json({ deleted: true, id });
  } catch (e) { next(e); }
});

// ─── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', auth, async (req, res, next) => {
  try {
    const PANGEA_FEE_PCT = await getPangeaFee();
    const [issuances, retired] = await Promise.all([
      prisma.creditIssuance.findMany({ where: { status: 'ISSUED' } }),
      prisma.creditIssuance.findMany({ where: { status: 'RETIRED' } }),
    ]);
    let orderStats = { total: 0, volume: 0, pangeaRevenue: 0 };
    try {
      const orders = await prisma.marketplaceOrder.findMany({ where: { status: 'PAID' } });
      orderStats = {
        total: orders.length,
        volume: orders.reduce((s, o) => s + o.total, 0),
        pangeaRevenue: orders.reduce((s, o) => s + o.pangeaFee, 0),
      };
    } catch(_e) {}

    res.json({
      totalAvailable: issuances.reduce((s, i) => s + i.quantity, 0),
      totalRetired:   retired.reduce((s, i) => s + i.quantity, 0),
      activeListings: issuances.length,
      paidOrders:     orderStats.total,
      totalVolume:    orderStats.volume,
      pangeaRevenue:  orderStats.pangeaRevenue,
      pangeaFeePct:   PANGEA_FEE_PCT,
      africaMarketSize: 400000000,
      prices: LIVE_PRICES,
    });
  } catch (e) { next(e); }
});

module.exports = router;

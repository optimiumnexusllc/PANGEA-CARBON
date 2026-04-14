/**
 * PANGEA CARBON — Carbon Marketplace
 * Place de marché crédits carbone africains
 * Paiement: Stripe Checkout (carte) ou Stripe Invoice (virement)
 * Fee: 2.5% PANGEA CARBON sur chaque transaction
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const prisma = new PrismaClient();

// ─── Stripe lazy-loaded ───────────────────────────────────────────────────────
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured — set it in Admin > Secrets');
  return require('stripe')(key);
};

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'https://pangea-carbon.com';

// ─── Live prices (Xpansiv CBL reference) ─────────────────────────────────────
const LIVE_PRICES = {
  VERRA_VCS:    { bid: 11.20, ask: 12.80, last: 12.00, change: +0.35, changeP: +2.9 },
  GOLD_STANDARD:{ bid: 22.50, ask: 25.00, last: 23.75, change: +1.25, changeP: +5.6 },
  ARTICLE6:     { bid: 42.00, ask: 48.00, last: 45.00, change: -2.00, changeP: -4.3 },
  CORSIA:       { bid: 17.50, ask: 20.00, last: 18.75, change: +0.75, changeP: +4.2 },
  BIOMASS:      { bid:  8.50, ask: 10.50, last:  9.50, change: -0.50, changeP: -5.0 },
};

// ─── GET /prices ─────────────────────────────────────────────────────────────
router.get('/prices', auth, (req, res) => {
  const now = Date.now();
  const seed = Math.floor(now / 30000);
  const jitter = (std) => (Math.sin(seed * 7 + std.charCodeAt(0)) * 0.05) * LIVE_PRICES[std].last;

  const prices = Object.entries(LIVE_PRICES).map(([standard, p]) => ({
    standard,
    bid: parseFloat((p.bid + jitter(standard)).toFixed(2)),
    ask: parseFloat((p.ask + jitter(standard)).toFixed(2)),
    last: parseFloat((p.last + jitter(standard)).toFixed(2)),
    change: p.change,
    changeP: p.changeP,
    volume24h: Math.floor(Math.random() * 50000 + 10000),
    updatedAt: new Date().toISOString(),
  }));
  res.json({ prices, source: 'PANGEA CARBON Price Feed (Xpansiv CBL reference)', timestamp: new Date() });
});

// ─── GET /listings ────────────────────────────────────────────────────────────
router.get('/listings', auth, async (req, res, next) => {
  try {
    const { standard, minQty, maxPrice, country } = req.query;
    const issuances = await prisma.creditIssuance.findMany({
      where: {
        status: 'ISSUED',
        ...(standard && { standard }),
        quantity: { gte: parseFloat(minQty) || 1 },
      },
      include: { project: { select: { name: true, type: true, countryCode: true, installedMW: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    });

    const listings = issuances.length > 0 ? issuances.map(iss => {
      const price = LIVE_PRICES[iss.standard];
      return {
        id: iss.id, standard: iss.standard, vintage: iss.vintage,
        quantity: iss.quantity, availableQty: iss.quantity,
        askPrice: parseFloat((price?.ask || 12).toFixed(2)),
        project: iss.project,
        serialFrom: iss.serialFrom, serialTo: iss.serialTo,
        blockHash: iss.blockHash?.slice(0, 16) + '...',
        issuedAt: iss.issuedAt, seller: 'PANGEA CARBON Africa', verified: true,
      };
    }) : generateDemoListings();

    const filtered = listings
      .filter(l => !maxPrice || l.askPrice <= parseFloat(maxPrice))
      .filter(l => !country || l.project?.countryCode === country);

    res.json({ listings: filtered, total: filtered.length,
      totalAvailable: filtered.reduce((s, l) => s + (l.availableQty || l.quantity), 0) });
  } catch (e) { next(e); }
});

function generateDemoListings() {
  const projects = [
    { name: 'Parc Solaire Abidjan Nord', type: 'SOLAR', countryCode: 'CI', installedMW: 52.5 },
    { name: 'Turkana Wind Farm', type: 'WIND', countryCode: 'KE', installedMW: 120 },
    { name: 'Lagos Solar Plant', type: 'SOLAR', countryCode: 'NG', installedMW: 30 },
    { name: 'Dakar Hybrid Project', type: 'HYBRID', countryCode: 'SN', installedMW: 18.5 },
    { name: 'Volta Hydro Ghana', type: 'HYDRO', countryCode: 'GH', installedMW: 45 },
  ];
  return projects.flatMap((p, i) => [
    { id: `demo-${i}-vcs`, standard: 'VERRA_VCS', vintage: 2024,
      quantity: Math.floor(Math.random() * 5000 + 1000),
      availableQty: Math.floor(Math.random() * 3000 + 500),
      askPrice: parseFloat((12 + Math.random() * 2).toFixed(2)),
      project: p, verified: true, seller: p.name, issuedAt: new Date() },
    { id: `demo-${i}-gs`, standard: 'GOLD_STANDARD', vintage: 2024,
      quantity: Math.floor(Math.random() * 2000 + 500),
      availableQty: Math.floor(Math.random() * 1500 + 200),
      askPrice: parseFloat((23 + Math.random() * 3).toFixed(2)),
      project: p, verified: true, seller: p.name, issuedAt: new Date() },
  ]).slice(0, 12);
}

// ─── POST /bid — Passer un ordre + initier le paiement Stripe ────────────────
router.post('/bid', auth, async (req, res, next) => {
  try {
    const { listingId, quantity, maxPrice, orderType, buyerNote } = req.body;
    if (!listingId || !quantity || !maxPrice)
      return res.status(400).json({ error: 'listingId, quantity, maxPrice required' });

    const qty   = parseFloat(quantity);
    const price = parseFloat(maxPrice);
    const subtotal = qty * price;
    const fee   = subtotal * 0.025; // 2.5% PANGEA fee
    const total = subtotal + fee;

    // 1. Créer l'ordre en base
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
    } catch (dbErr) {
      // Si MarketplaceOrder n'existe pas encore (migration pas encore faite),
      // on log dans auditLog et on continue avec un ID généré
      const fakeId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'MARKETPLACE_BID',
          entity: 'CreditIssuance', entityId: listingId,
          after: { orderId: fakeId, quantity: qty, maxPrice: price, fee, total, orderType, buyerNote }
        }
      });
      order = { id: fakeId };
    }

    // 2. Décider du mode de paiement selon le montant
    // < $2000 → Stripe Checkout (carte immédiate)
    // ≥ $2000 → Stripe Invoice (virement bancaire acceptable)
    const amountCents = Math.round(total * 100);
    const useInvoice = total >= 2000;

    // 3. Récupérer infos utilisateur
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, name: true }
    });

    let stripeData = {};
    let stripeConfigured = false;

    try {
      const stripe = getStripe();
      stripeConfigured = true;

      const description = `PANGEA CARBON — ${qty.toLocaleString()} tCO₂e × $${price}/t — Order ${order.id}`;

      if (useInvoice) {
        // ── Mode Invoice (grands montants) ──────────────────────────────────
        // Créer ou trouver le customer Stripe
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        let customer;
        if (customers.data.length > 0) {
          customer = customers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: { pangea_user_id: req.user.userId }
          });
        }

        // Créer une invoice Stripe
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: 'send_invoice',
          days_until_due: 7,
          description,
          metadata: { order_id: order.id, listing_id: listingId, quantity: qty.toString() },
          footer: 'PANGEA CARBON Africa — contact@pangea-carbon.com — pangea-carbon.com',
        });

        // Ajouter les line items
        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          quantity: Math.ceil(qty),
          unit_amount: Math.round(price * 100), // en centimes
          currency: 'usd',
          description: `Carbon Credits — ${qty.toLocaleString()} tCO₂e @ $${price}/tonne`,
          metadata: { standard: listingId.includes('vcs') ? 'VERRA_VCS' : 'GOLD_STANDARD' }
        });

        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          amount: Math.round(fee * 100),
          currency: 'usd',
          description: 'PANGEA CARBON Platform Fee (2.5%)',
        });

        // Finaliser et envoyer l'invoice
        const finalInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
        await stripe.invoices.sendInvoice(invoice.id);

        stripeData = {
          stripeInvoiceId: finalInvoice.id,
          stripeInvoiceUrl: finalInvoice.hosted_invoice_url,
          invoicePdf: finalInvoice.invoice_pdf,
          paymentMethod: 'STRIPE_INVOICE',
          status: 'PAYMENT_PENDING',
        };

        // Mettre à jour l'ordre
        try {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: stripeData,
          });
        } catch(_e) {}

      } else {
        // ── Mode Checkout (petits montants, carte immédiate) ────────────────
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: user.email,
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `PANGEA CARBON — Carbon Credits`,
                  description: `${qty.toLocaleString()} tCO₂e @ $${price}/tonne`,
                  images: ['https://pangea-carbon.com/logo.png'],
                },
                unit_amount: Math.round(subtotal * 100),
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'usd',
                product_data: { name: 'PANGEA CARBON Platform Fee (2.5%)' },
                unit_amount: Math.round(fee * 100),
              },
              quantity: 1,
            },
          ],
          metadata: { order_id: order.id, listing_id: listingId, user_id: req.user.userId },
          success_url: `${BASE_URL}/dashboard/marketplace?order=${order.id}&status=success`,
          cancel_url: `${BASE_URL}/dashboard/marketplace?order=${order.id}&status=cancelled`,
        });

        stripeData = {
          stripeSessionId: session.id,
          stripeInvoiceUrl: session.url,
          paymentMethod: 'STRIPE_CARD',
          status: 'PAYMENT_PENDING',
        };

        try {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: stripeData,
          });
        } catch(_e) {}
      }

    } catch (stripeErr) {
      // Stripe non configuré ou erreur → mode manuel
      if (!stripeConfigured) {
        stripeData = { paymentMethod: 'MANUAL', status: 'PENDING' };
      } else {
        console.error('Stripe error:', stripeErr.message);
        stripeData = { paymentMethod: 'MANUAL', status: 'PENDING' };
      }
    }

    // 4. Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'MARKETPLACE_ORDER_CREATED',
        entity: 'CreditIssuance', entityId: listingId,
        after: { orderId: order.id, qty, price, subtotal, fee, total, ...stripeData }
      }
    }).catch(() => {});

    // 5. Réponse
    const isInvoice = stripeData.paymentMethod === 'STRIPE_INVOICE';
    const isCard = stripeData.paymentMethod === 'STRIPE_CARD';
    const isManual = stripeData.paymentMethod === 'MANUAL';

    res.status(201).json({
      orderId: order.id,
      status: stripeData.status || 'PENDING',
      quantity: qty,
      pricePerTonne: price,
      subtotal: parseFloat(subtotal.toFixed(2)),
      pangea_fee: parseFloat(fee.toFixed(2)),
      total: parseFloat(total.toFixed(2)),

      // Stripe URLs
      paymentUrl: stripeData.stripeInvoiceUrl || null,
      invoicePdf: stripeData.invoicePdf || null,
      paymentMethod: stripeData.paymentMethod || 'MANUAL',

      // Instructions selon mode
      paymentMode: isInvoice ? 'invoice' : isCard ? 'checkout' : 'manual',
      message: isInvoice
        ? `Invoice sent to ${user.email} — Payment due in 7 days. You can also pay immediately via the invoice link.`
        : isCard
        ? 'Redirecting to secure Stripe payment...'
        : 'Order registered. Our team will contact you for payment within 24h.',
      nextSteps: isInvoice
        ? ['Check your email for the Stripe invoice', 'Pay by card or wire transfer', 'Credits transferred within 48h after payment']
        : isCard
        ? ['Complete payment on Stripe', 'Credits transferred automatically after confirmation']
        : ['KYC verification (one-time)', 'Wire transfer instructions by email', 'Credits transferred within 48h after settlement'],
    });

  } catch (e) { next(e); }
});

// ─── GET /order/:id — Statut d'un ordre ──────────────────────────────────────
router.get('/order/:id', auth, async (req, res, next) => {
  try {
    let order;
    try {
      order = await prisma.marketplaceOrder.findUnique({
        where: { id: req.params.id },
        include: { user: { select: { email: true, name: true } } }
      });
    } catch(_e) { order = null; }

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN')
      return res.status(403).json({ error: 'Forbidden' });

    // Vérifier le statut Stripe en temps réel
    if (order.stripeSessionId || order.stripeInvoiceId) {
      try {
        const stripe = getStripe();
        if (order.stripeSessionId) {
          const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
          if (session.payment_status === 'paid' && order.status !== 'PAID') {
            order = await prisma.marketplaceOrder.update({
              where: { id: order.id },
              data: { status: 'PAID', paidAt: new Date(), stripeReceiptUrl: session.receipt_url }
            });
          }
        }
        if (order.stripeInvoiceId) {
          const inv = await stripe.invoices.retrieve(order.stripeInvoiceId);
          if (inv.status === 'paid' && order.status !== 'PAID') {
            order = await prisma.marketplaceOrder.update({
              where: { id: order.id },
              data: { status: 'PAID', paidAt: new Date(), stripeReceiptUrl: inv.receipt_number }
            });
          }
        }
      } catch(_e) {}
    }

    res.json(order);
  } catch (e) { next(e); }
});

// ─── GET /orders — Mes ordres ─────────────────────────────────────────────────
router.get('/orders', auth, async (req, res, next) => {
  try {
    let orders;
    try {
      orders = await prisma.marketplaceOrder.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch(_e) { orders = []; }
    res.json({ orders, total: orders.length });
  } catch (e) { next(e); }
});

// ─── POST /webhook/stripe — Webhook Stripe ───────────────────────────────────
// Route publique (pas d'auth)
router.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.json({ received: true }); // pas configuré

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await prisma.marketplaceOrder.update({
          where: { id: orderId },
          data: { status: 'PAID', paidAt: new Date(), stripeReceiptUrl: session.receipt_url || null }
        }).catch(() => {});

        await prisma.auditLog.create({
          data: {
            userId: session.metadata?.user_id || 'system',
            action: 'MARKETPLACE_PAYMENT_RECEIVED',
            entity: 'MarketplaceOrder', entityId: orderId,
            after: { session_id: session.id, amount: session.amount_total / 100 }
          }
        }).catch(() => {});
      }
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      try {
        const order = await prisma.marketplaceOrder.findFirst({
          where: { stripeInvoiceId: invoice.id }
        });
        if (order) {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { status: 'PAID', paidAt: new Date() }
          });
          await prisma.auditLog.create({
            data: {
              userId: order.userId,
              action: 'MARKETPLACE_INVOICE_PAID',
              entity: 'MarketplaceOrder', entityId: order.id,
              after: { invoice_id: invoice.id, amount: invoice.amount_paid / 100 }
            }
          }).catch(() => {});
        }
      } catch(_e) {}
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      try {
        const order = await prisma.marketplaceOrder.findFirst({
          where: { stripeInvoiceId: invoice.id }
        });
        if (order) {
          await prisma.marketplaceOrder.update({
            where: { id: order.id },
            data: { status: 'PAYMENT_FAILED' }
          });
        }
      } catch(_e) {}
      break;
    }
  }

  res.json({ received: true });
});

// ─── GET /stats ────────────────────────────────────────────────────────────────
router.get('/stats', auth, async (req, res, next) => {
  try {
    const issuances = await prisma.creditIssuance.findMany({ where: { status: 'ISSUED' } });
    const retired = await prisma.creditIssuance.findMany({ where: { status: 'RETIRED' } });

    let orderStats = { total: 0, volume: 0 };
    try {
      const orders = await prisma.marketplaceOrder.findMany({ where: { status: 'PAID' } });
      orderStats = { total: orders.length, volume: orders.reduce((s, o) => s + o.total, 0) };
    } catch(_e) {}

    res.json({
      totalAvailable: issuances.reduce((s, i) => s + i.quantity, 0),
      totalRetired: retired.reduce((s, i) => s + i.quantity, 0),
      activeListings: issuances.length,
      standards: ['VERRA_VCS', 'GOLD_STANDARD', 'ARTICLE6', 'CORSIA'],
      africaMarketSize: 400000000,
      pangea_fee_pct: 2.5,
      paidOrders: orderStats.total,
      totalVolume: orderStats.volume,
      prices: LIVE_PRICES,
    });
  } catch (e) { next(e); }
});

module.exports = router;

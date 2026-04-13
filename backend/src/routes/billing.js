const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Stripe lazy-loaded (optionnel si STRIPE_SECRET_KEY pas défini)
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configuré');
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

const PLANS = {
  starter: {
    name: 'Starter',
    price: 29900, // centimes
    interval: 'month',
    features: ['5 projets', '50 MW max', 'Calcul ACM0002', 'Dashboard', '2 users'],
  },
  pro: {
    name: 'Pro',
    price: 79900,
    interval: 'month',
    features: ['Projets illimités', 'MW illimités', 'PDF certifiables', 'API access', '10 users'],
  },
  enterprise: {
    name: 'Enterprise',
    price: null,
    interval: 'month',
    features: ['Tout Pro', 'White-label', 'SSO', 'Support dédié', 'SLA 99.9%'],
  },
};

// GET /api/billing/plans
router.get('/plans', (req, res) => res.json(PLANS));

// POST /api/billing/checkout — Créer session Stripe Checkout
router.post('/checkout', auth, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan] || !PLANS[plan].price) {
      return res.status(400).json({ error: 'Plan invalide ou sur devis' });
    }

    const stripe = getStripe();
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { email: true, name: true }
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `PANGEA CARBON — ${PLANS[plan].name}`,
            description: PLANS[plan].features.join(' · '),
            images: ['https://pangea-carbon.com/logo.png'],
          },
          unit_amount: PLANS[plan].price,
          recurring: { interval: PLANS[plan].interval },
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/dashboard/settings?success=true&plan=${plan}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/settings?canceled=true`,
      metadata: { userId: req.user.userId, plan },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) { next(e); }
});

// POST /api/billing/portal — Portail client Stripe
router.post('/portal', auth, async (req, res, next) => {
  try {
    const stripe = getStripe();
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    // Trouver le customerId Stripe depuis les metadata
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) {
      return res.status(404).json({ error: 'Aucun abonnement actif' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${process.env.FRONTEND_URL}/dashboard/settings`,
    });

    res.json({ url: session.url });
  } catch (e) { next(e); }
});

// POST /api/billing/webhook — Stripe webhook events
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Stripe webhook error:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata;
      console.log(`[Stripe] ✓ Subscription ${plan} activée pour userId ${userId}`);
      // TODO: mettre à jour le plan utilisateur en DB
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_ACTIVATED',
          entity: 'User',
          entityId: userId,
          after: { plan, sessionId: session.id },
        }
      }).catch(console.error);
      break;
    }
    case 'customer.subscription.deleted': {
      console.log('[Stripe] Subscription annulée');
      break;
    }
  }

  res.json({ received: true });
});

// GET /api/billing/status — Statut abonnement actuel
router.get('/status', auth, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ plan: 'trial', status: 'active', message: 'Mode démo — Stripe non configuré' });
  }
  try {
    const stripe = getStripe();
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (!customers.data.length) return res.json({ plan: 'free', status: 'none' });

    const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'active', limit: 1 });
    if (!subs.data.length) return res.json({ plan: 'free', status: 'expired' });

    res.json({ plan: subs.data[0].metadata?.plan || 'pro', status: 'active', renewsAt: new Date(subs.data[0].current_period_end * 1000) });
  } catch (e) {
    res.json({ plan: 'trial', status: 'error' });
  }
});

module.exports = router;

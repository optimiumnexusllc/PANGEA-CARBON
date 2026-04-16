/**
 * PANGEA CARBON — Webhooks Outbound Engine v1.0
 * Événements: credit.issued, audit.validated, project.certified,
 *             pipeline.advanced, marketplace.sold, payment.received
 * Delivery: HTTPS POST avec HMAC-SHA256 signature
 * Retry: 3 tentatives avec backoff exponentiel
 */
const crypto = require('crypto');

let _prisma = null;
function getPrisma() {
  if (!_prisma) {
    const { PrismaClient } = require('@prisma/client');
    _prisma = new PrismaClient();
  }
  return _prisma;
}

// ─── ÉVÉNEMENTS DISPONIBLES ───────────────────────────────────────────────────
const WEBHOOK_EVENTS = {
  'credit.issued':         'Crédits carbone émis (VCUs)',
  'audit.validated':       'Audit GHG validé par VVB',
  'project.certified':     'Projet certifié (Verra/GS/CORSIA)',
  'pipeline.advanced':     'Pipeline: étape avancée',
  'marketplace.sold':      'Vente marketplace complétée',
  'payment.received':      'Paiement reçu',
  'mrv.submitted':         'Rapport MRV soumis',
  'report.generated':      'Rapport PDF généré',
  'esg.report.generated':  'Rapport ESG généré',
  'user.invited':          'Utilisateur invité',
  'project.created':       'Nouveau projet créé',
};

// ─── SIGNATURE HMAC-SHA256 ────────────────────────────────────────────────────
function sign(payload, secret) {
  const ts = Date.now();
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret)
    .update(ts + '.' + body)
    .digest('hex');
  return { ts, sig, body };
}

function verifySignature(payload, ts, sig, secret) {
  const expected = crypto.createHmac('sha256', secret)
    .update(ts + '.' + JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// ─── DELIVERY ────────────────────────────────────────────────────────────────
async function deliverWebhook(endpoint, event, payload, attempt = 1) {
  const { ts, sig, body } = sign(payload, endpoint.secret);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-PangeaCarbon-Event': event,
        'X-PangeaCarbon-Timestamp': ts.toString(),
        'X-PangeaCarbon-Signature': 'sha256=' + sig,
        'X-PangeaCarbon-Delivery': crypto.randomUUID(),
        'User-Agent': 'PangeaCarbon-Webhooks/1.0',
      },
      body,
    });
    
    clearTimeout(timeout);
    
    const success = res.status >= 200 && res.status < 300;
    
    // Logger la livraison
    await getPrisma().webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: JSON.stringify(payload),
        statusCode: res.status,
        success,
        attempt,
        responseBody: (await res.text().catch(() => '')).slice(0, 500),
      }
    }).catch(() => {});
    
    return success;
  } catch(e) {
    clearTimeout(timeout);
    
    await getPrisma().webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        event,
        payload: JSON.stringify(payload),
        statusCode: 0,
        success: false,
        attempt,
        responseBody: e.message.slice(0, 500),
      }
    }).catch(() => {});
    
    // Retry avec backoff: 1min, 5min, 30min
    if (attempt < 3) {
      const delay = [60000, 300000, 1800000][attempt - 1];
      setTimeout(() => deliverWebhook(endpoint, event, payload, attempt + 1), delay);
    }
    
    return false;
  }
}

// ─── DISPATCH ─────────────────────────────────────────────────────────────────
async function dispatch(event, payload, orgId = null) {
  if (!WEBHOOK_EVENTS[event]) {
    console.warn('[Webhooks] Unknown event:', event);
    return;
  }
  
  try {
    const prisma = getPrisma();
    
    // Trouver tous les endpoints qui écoutent cet événement
    const where = { active: true };
    if (orgId) where.organizationId = orgId;
    
    const endpoints = await prisma.webhookEndpoint.findMany({ where });
    
    for (const endpoint of endpoints) {
      // events: "*" (tous) ou JSON array ["credit.issued","audit.validated"]
      let events;
      try { events = JSON.parse(endpoint.events); } catch(e) { events = endpoint.events || '*'; }
      const matchesAll = events === '*' || events === ['*'] || (Array.isArray(events) && events.includes('*'));
      const matchesEvent = Array.isArray(events) && events.includes(event);
      if (matchesAll || matchesEvent) {
        // Async non-bloquant
        deliverWebhook(endpoint, event, {
          event,
          timestamp: new Date().toISOString(),
          data: payload,
          orgId,
        }).catch(e => console.error('[Webhooks] Delivery error:', e.message));
      }
    }
  } catch(e) {
    console.error('[Webhooks] Dispatch error:', e.message);
  }
}

module.exports = { dispatch, WEBHOOK_EVENTS, sign, verifySignature };

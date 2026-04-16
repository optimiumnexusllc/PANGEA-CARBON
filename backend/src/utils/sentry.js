/**
 * PANGEA CARBON — Sentry Error Monitoring
 * Sprint 3 — Ops visibility
 * Configure via: Admin → Secrets → sentry_dsn
 */
const Sentry = require('@sentry/node');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let initialized = false;

async function initSentry() {
  try {
    // Lire le DSN depuis la DB ou l'env
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'sentry_dsn' } });
    const dsn = setting?.value || process.env.SENTRY_DSN;

    if (!dsn) {
      console.log('[Sentry] Non configuré — ajouter sentry_dsn dans Admin → Secrets');
      return;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      release: `pangea-carbon@1.0.0`,
      tracesSampleRate: 0.1, // 10% des transactions
      profilesSampleRate: 0.05,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
      beforeSend(event) {
        // Ne pas envoyer les erreurs de validation (400) — trop de bruit
        if (event.tags?.statusCode === '400') return null;
        return event;
      },
    });

    initialized = true;
    console.log('[Sentry] ✓ Monitoring activé');
  } catch (e) {
    console.log('[Sentry] Init ignorée:', e.message);
  }
}

// Enrichir le contexte avec l'utilisateur JWT
function setUserContext(req) {
  if (!initialized || !req.user) return;
  Sentry.setUser({
    id: req.user.userId,
    email: req.user.email,
    role: req.user.role,
    orgId: req.user.organizationId,
  });
}

// Middleware: capture user context sur chaque requête
function userContextMiddleware(req, res, next) {
  if (req.user) setUserContext(req);
  next();
}

// Alerter sur les erreurs critiques PANGEA
function captureEvent(name, data = {}, level = 'info') {
  if (!initialized) return;
  Sentry.captureMessage(name, { level, extra: data, tags: { app: 'pangea-carbon' } });
}

// Middleware de capture des erreurs Express
function sentryErrorHandler() {
  if (!initialized) return (err, req, res, next) => next(err);
  return Sentry.expressErrorHandler();
}

// Capturer une erreur manuellement
function captureException(error, context = {}) {
  if (!initialized) return;
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([k, v]) => scope.setTag(k, v));
    Sentry.captureException(error);
  });
}

// Middleware de tracking des requêtes
function requestHandler() {
  if (!initialized) return (req, res, next) => next();
  return Sentry.expressIntegration();
}

module.exports = { initSentry, sentryErrorHandler, captureException, requestHandler, setUserContext, userContextMiddleware, captureEvent };

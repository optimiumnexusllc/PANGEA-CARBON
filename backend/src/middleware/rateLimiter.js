/**
 * PANGEA CARBON - Rate Limiting Elite v1.0
 * Protection DDoS + Brute Force
 */
const rateLimit = require('express-rate-limit');

function createLimiter({ windowMs, max, message_en, message_fr }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    handler: (req, res) => {
      const isFr = (req.headers['accept-language'] || '').includes('fr');
      const mins = Math.ceil(windowMs / 1000 / 60);
      res.status(429).json({
        error: isFr ? message_fr : message_en,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterMinutes: mins,
      });
    },
  });
}

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, max: 10,
  message_en: 'Too many auth attempts. Retry in 15 minutes.',
  message_fr: 'Trop de tentatives. Reessayez dans 15 minutes.',
});

const mfaLimiter = createLimiter({
  windowMs: 10 * 60 * 1000, max: 5,
  message_en: 'Too many MFA attempts. Retry in 10 minutes.',
  message_fr: 'Trop de tentatives MFA. Reessayez dans 10 minutes.',
});

const apiLimiter = createLimiter({
  windowMs: 60 * 1000, max: 200,
  message_en: 'API rate limit exceeded. Max 200 requests/minute.',
  message_fr: 'Limite API depassee. Max 200 requetes/minute.',
});

const uploadLimiter = createLimiter({
  windowMs: 5 * 60 * 1000, max: 10,
  message_en: 'Too many uploads. Retry in 5 minutes.',
  message_fr: 'Trop de fichiers. Reessayez dans 5 minutes.',
});

const marketplaceLimiter = createLimiter({
  windowMs: 60 * 1000, max: 30,
  message_en: 'Too many marketplace requests.',
  message_fr: 'Trop de requetes marketplace.',
});

module.exports = { authLimiter, mfaLimiter, apiLimiter, uploadLimiter, marketplaceLimiter };

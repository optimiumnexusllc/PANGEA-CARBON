/**
 * PANGEA CARBON — JWT Token Blacklist v1.0
 * Révocation immédiate des refresh tokens via Redis
 * Sécurité: logout, compromis, changement de mot de passe
 */
const Redis = require('ioredis');

let _redis = null;
function getRedis() {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    _redis.connect().catch(() => {});
  }
  return _redis;
}

const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 jours en secondes

// Révoquer un refresh token (logout, changement mdp)
async function revokeToken(jti, expiresIn = REFRESH_TTL) {
  try {
    const redis = getRedis();
    await redis.setex('bl:' + jti, expiresIn, '1');
    return true;
  } catch(e) {
    console.error('[TokenBlacklist] revokeToken error:', e.message);
    return false;
  }
}

// Vérifier si un token est révoqué
async function isRevoked(jti) {
  try {
    const redis = getRedis();
    const val = await redis.get('bl:' + jti);
    return val === '1';
  } catch(e) {
    console.error('[TokenBlacklist] isRevoked error:', e.message);
    return false; // En cas d'erreur Redis: permettre (disponibilité > sécurité ici)
  }
}

// Révoquer TOUS les tokens d'un userId (compromis de compte)
async function revokeAllUserTokens(userId) {
  try {
    const redis = getRedis();
    // Stocker une version de révocation globale par user
    await redis.setex('bl:user:' + userId, REFRESH_TTL, Date.now().toString());
    return true;
  } catch(e) {
    console.error('[TokenBlacklist] revokeAllUserTokens error:', e.message);
    return false;
  }
}

// Vérifier si les tokens d'un user sont révoqués globalement
async function isUserRevoked(userId, tokenIssuedAt) {
  try {
    const redis = getRedis();
    const revokedAt = await redis.get('bl:user:' + userId);
    if (!revokedAt) return false;
    // Token révoqué si émis AVANT la révocation globale
    return tokenIssuedAt < parseInt(revokedAt);
  } catch(e) {
    return false;
  }
}

// Middleware: vérifier blacklist sur les routes protégées
const checkBlacklist = async (req, res, next) => {
  try {
    const jti = req.user?.jti;
    const userId = req.user?.userId;
    const iat = req.user?.iat ? req.user.iat * 1000 : 0;

    if (jti && await isRevoked(jti)) {
      return res.status(401).json({
        error: 'Token révoqué. Veuillez vous reconnecter.',
        code: 'TOKEN_REVOKED',
      });
    }

    if (userId && await isUserRevoked(userId, iat)) {
      return res.status(401).json({
        error: 'Session révoquée. Veuillez vous reconnecter.',
        code: 'SESSION_REVOKED',
      });
    }

    next();
  } catch(e) {
    next(); // Non-fatal: si Redis est down, ne pas bloquer
  }
};

module.exports = { revokeToken, isRevoked, revokeAllUserTokens, isUserRevoked, checkBlacklist };

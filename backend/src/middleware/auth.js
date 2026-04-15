const jwt = require('jsonwebtoken');

// ─── Hiérarchie des rôles PANGEA CARBON ──────────────────────────────────────
// SUPER_ADMIN : accès total — console plateforme complète (équipe PANGEA)
// ADMIN       : accès admin restreint — gestion interne (équipe PANGEA)
// ORG_OWNER   : propriétaire de son compte — accès complet à son espace, zéro admin plateforme
// ANALYST     : collaborateur dans une org — lecture/écriture limité
// AUDITOR     : accès audit uniquement
// CLIENT      : lecture seule — acheteurs externes

const ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ADMIN:       4,
  ORG_OWNER:   3,
  ANALYST:     2,
  AUDITOR:     2,
  CLIENT:      1,
};

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification manquant' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Permissions insuffisantes' });
  }
  next();
};

// ORG_OWNER + ADMIN + SUPER_ADMIN = gestion de leur propre org
const requireOrgAccess = requireRole('SUPER_ADMIN', 'ADMIN', 'ORG_OWNER');

// Seulement SUPER_ADMIN et ADMIN pour la console plateforme
const requirePlatformAdmin = requireRole('SUPER_ADMIN', 'ADMIN');

// Helper: est-ce que l'user peut gérer son org ?
const canManageOrg = (user) => ['SUPER_ADMIN', 'ADMIN', 'ORG_OWNER'].includes(user?.role);

// Helper: est-ce un admin plateforme ?
const isPlatformAdmin = (user) => ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

module.exports = auth;
module.exports.requireRole = requireRole;
module.exports.requireOrgAccess = requireOrgAccess;
module.exports.requirePlatformAdmin = requirePlatformAdmin;
module.exports.canManageOrg = canManageOrg;
module.exports.isPlatformAdmin = isPlatformAdmin;
module.exports.ROLE_HIERARCHY = ROLE_HIERARCHY;

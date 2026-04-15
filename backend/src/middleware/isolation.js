/**
 * PANGEA CARBON — Isolation des données par rôle
 *
 * SUPER_ADMIN  → voit tout (toutes les orgs, tous les users)
 * ADMIN        → voit son organisation
 * ORG_OWNER    → voit son organisation (comme ADMIN, sans console plateforme)
 * ANALYST      → voit uniquement ses propres objets dans son org
 * CLIENT       → voit uniquement ses propres objets
 */

function dataWhere(user, orgField = 'organizationId', userField = 'userId') {
  if (!user) return { [userField]: '__unauthorized__' };
  if (user.role === 'SUPER_ADMIN') return {};
  if (['ADMIN', 'ORG_OWNER'].includes(user.role) && user.organizationId) {
    return { [orgField]: user.organizationId };
  }
  // ANALYST, CLIENT, AUDITOR : seulement leurs propres objets
  if (user.organizationId) {
    return { [orgField]: user.organizationId, [userField]: user.userId };
  }
  return { [userField]: user.userId };
}

function pipelineWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};
  if (['ADMIN', 'ORG_OWNER'].includes(user.role) && user.organizationId) {
    return { organizationId: user.organizationId };
  }
  return {
    organizationId: user.organizationId || '__none__',
    project: { userId: user.userId },
  };
}

function ghgWhere(user) {
  if (user.role === 'SUPER_ADMIN') return {};
  if (['ADMIN', 'ORG_OWNER'].includes(user.role) && user.organizationId) {
    return { organizationId: user.organizationId };
  }
  return { userId: user.userId };
}

function canAccess(user, resource) {
  if (!user || !resource) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (['ADMIN', 'ORG_OWNER'].includes(user.role)) {
    return resource.organizationId === user.organizationId;
  }
  const sameOrg = !resource.organizationId || resource.organizationId === user.organizationId;
  const isOwner = resource.userId === user.userId || resource.createdById === user.userId;
  return sameOrg && isOwner;
}

function requireAccess(user, resource, res) {
  if (!canAccess(user, resource)) {
    res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own data',
    });
    return false;
  }
  return true;
}

// ORG_OWNER peut gérer son org (seller profile, buyer profile, team members)
function canManageOwnOrg(user) {
  return ['SUPER_ADMIN', 'ADMIN', 'ORG_OWNER'].includes(user?.role);
}

module.exports = { dataWhere, pipelineWhere, ghgWhere, canAccess, requireAccess, canManageOwnOrg };

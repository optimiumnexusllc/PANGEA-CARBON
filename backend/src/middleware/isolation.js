/**
 * PANGEA CARBON — Middleware d'isolation des données
 * Chaque utilisateur ne voit que ses données
 * ADMIN voit son organisation
 * SUPER_ADMIN voit tout
 */

function dataWhere(user, orgField = 'organizationId', userField = 'userId') {
  if (!user) return { [userField]: '__unauthorized__' };
  if (user.role === 'SUPER_ADMIN') return {};
  if (['ADMIN'].includes(user.role) && user.organizationId) {
    return { [orgField]: user.organizationId };
  }
  // Utilisateur standard: seulement ses propres objets
  if (user.organizationId) {
    return { [orgField]: user.organizationId, [userField]: user.userId };
  }
  return { [userField]: user.userId };
}

function canAccess(user, resource) {
  if (!user || !resource) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'ADMIN') {
    return resource.organizationId === user.organizationId;
  }
  // Utilisateur normal: doit être le créateur ET dans la même org
  const sameOrg = !resource.organizationId || resource.organizationId === user.organizationId;
  const isOwner = resource.userId === user.userId || resource.createdById === user.userId;
  return sameOrg && isOwner;
}

function requireAccess(user, resource, res) {
  if (!canAccess(user, resource)) {
    res.status(403).json({ 
      error: 'Access denied',
      message: 'You can only access your own data'
    });
    return false;
  }
  return true;
}

module.exports = { dataWhere, canAccess, requireAccess };

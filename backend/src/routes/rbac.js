/**
 * PANGEA CARBON — RBAC Routes
 * Gestion des groupes, permissions, et assignations
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { ROLE_PERMISSIONS, ALL_PERMISSIONS, resolvePermissions } = require('../services/rbac.service');
const prisma = new PrismaClient();

const adminOnly = requirePlatformAdmin;

// ─── GET /api/rbac/matrix — Matrice complète rôles × permissions ─────────────
router.get('/matrix', auth, adminOnly, async (req, res, next) => {
  try {
    const roles = ['SUPER_ADMIN','ADMIN','ORG_OWNER','ANALYST','AUDITOR','CLIENT','VIEWER'];
    
    // Récupérer les overrides DB
    const overrides = await prisma.rolePermissionOverride.findMany();
    
    const matrix = {};
    for (const role of roles) {
      const basePerms = new Set();
      const rolePerms = ROLE_PERMISSIONS[role] || [];
      
      if (rolePerms.includes('*')) {
        basePerms.add('*');
      } else {
        rolePerms.forEach(p => {
          if (p.endsWith('.*')) {
            const mod = p.slice(0,-2);
            (ALL_PERMISSIONS[mod]||[]).forEach(pp => basePerms.add(`${mod}.${pp}`));
          } else basePerms.add(p);
        });
      }
      
      // Appliquer overrides
      overrides.filter(o => o.role === role).forEach(o => {
        if (o.granted) basePerms.add(o.permission);
        else basePerms.delete(o.permission);
      });
      
      matrix[role] = [...basePerms];
    }
    
    res.json({ matrix, allPermissions: ALL_PERMISSIONS, roles });
  } catch(e) { next(e); }
});

// ─── PATCH /api/rbac/matrix — Modifier un override de permission ─────────────
router.patch('/matrix', auth, adminOnly, async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'SUPER_ADMIN required pour modifier les permissions système' });
    }
    const { role, permission, granted, reason } = req.body;
    if (!role || !permission) return res.status(400).json({ error: 'role and permission required' });
    
    const override = await prisma.rolePermissionOverride.upsert({
      where: { role_permission: { role, permission } },
      update: { granted: !!granted, setBy: req.user.userId, reason },
      create: { role, permission, granted: !!granted, setBy: req.user.userId, reason },
    });
    
    await prisma.auditLog.create({ data: {
      userId: req.user.userId, action: 'RBAC_PERMISSION_CHANGED',
      entity: 'RolePermissionOverride', entityId: override.id,
      after: { role, permission, granted },
    }}).catch(() => {});
    
    res.json({ success: true, override });
  } catch(e) { next(e); }
});

// ─── GET /api/rbac/groups — Liste des groupes ────────────────────────────────
router.get('/groups', auth, adminOnly, async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: { user: { select: { id:true, name:true, email:true, role:true } } }
        }
      },
      orderBy: [{ isSystem: 'desc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    });
    res.json({ groups });
  } catch(e) { next(e); }
});

// ─── POST /api/rbac/groups — Créer un groupe ─────────────────────────────────
router.post('/groups', auth, adminOnly, async (req, res, next) => {
  try {
    const { name, description, color, icon, permissions, priority, orgId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') 
                  + '-' + Date.now().toString(36);
    
    const group = await prisma.group.create({
      data: {
        name: name.trim(), slug, description, color: color || '#00FF94',
        icon: icon || '👥',
        permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
        priority: parseInt(priority) || 0,
        orgId: orgId || null,
        createdBy: req.user.userId,
      },
      include: { members: { include: { user: { select: { id:true, name:true, email:true, role:true } } } } }
    });
    
    await prisma.auditLog.create({ data: {
      userId: req.user.userId, action: 'GROUP_CREATED',
      entity: 'Group', entityId: group.id, after: { name, permissions },
    }}).catch(() => {});
    
    res.json({ success: true, group });
  } catch(e) { next(e); }
});

// ─── PUT /api/rbac/groups/:id — Modifier un groupe ───────────────────────────
router.put('/groups/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.isSystem && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify system groups without SUPER_ADMIN' });
    }
    
    const { name, description, color, icon, permissions, priority } = req.body;
    const updated = await prisma.group.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(permissions && { permissions: JSON.stringify(permissions) }),
        ...(priority !== undefined && { priority: parseInt(priority) }),
        updatedAt: new Date(),
      },
      include: { members: { include: { user: { select: { id:true, name:true, email:true, role:true } } } } }
    });
    res.json({ success: true, group: updated });
  } catch(e) { next(e); }
});

// ─── DELETE /api/rbac/groups/:id — Supprimer un groupe ───────────────────────
router.delete('/groups/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.isSystem) return res.status(400).json({ error: 'Cannot delete system groups' });
    
    await prisma.group.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch(e) { next(e); }
});

// ─── POST /api/rbac/groups/:id/members — Ajouter un membre ──────────────────
router.post('/groups/:id/members', auth, adminOnly, async (req, res, next) => {
  try {
    const { userId, expiresAt } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const member = await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId } },
      update: { expiresAt: expiresAt ? new Date(expiresAt) : null, addedBy: req.user.userId, addedAt: new Date() },
      create: {
        groupId: req.params.id, userId, addedBy: req.user.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: { user: { select: { id:true, name:true, email:true, role:true } } }
    });
    
    res.json({ success: true, member });
  } catch(e) { next(e); }
});

// ─── DELETE /api/rbac/groups/:id/members/:userId — Retirer un membre ─────────
router.delete('/groups/:id/members/:userId', auth, adminOnly, async (req, res, next) => {
  try {
    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: req.params.id, userId: req.params.userId } }
    });
    res.json({ success: true });
  } catch(e) { next(e); }
});

// ─── GET /api/rbac/users/:id/permissions — Permissions effectives d'un user ──
router.get('/users/:id/permissions', auth, adminOnly, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id:true, name:true, email:true, role:true, organizationId:true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const userCtx = { userId: user.id, role: user.role, organizationId: user.organizationId };
    const perms = await resolvePermissions(userCtx, prisma);
    
    const groups = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: { group: { select: { id:true, name:true, color:true, permissions:true } } }
    });
    
    const userPerms = await prisma.userPermission.findMany({ where: { userId: user.id } });
    
    res.json({
      user,
      effectivePermissions: [...perms],
      groups: groups.map(m => ({ ...m.group, permissions: JSON.parse(m.group.permissions||'[]') })),
      userOverrides: userPerms,
    });
  } catch(e) { next(e); }
});

// ─── POST /api/rbac/users/:id/permissions — Override permission user ─────────
router.post('/users/:id/permissions', auth, adminOnly, async (req, res, next) => {
  try {
    const { permission, granted, reason, expiresAt } = req.body;
    if (!permission) return res.status(400).json({ error: 'permission required' });
    
    const perm = await prisma.userPermission.upsert({
      where: { userId_permission: { userId: req.params.id, permission } },
      update: { granted: granted !== false, grantedBy: req.user.userId, reason, expiresAt: expiresAt ? new Date(expiresAt) : null },
      create: { userId: req.params.id, permission, granted: granted !== false, grantedBy: req.user.userId, reason, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    res.json({ success: true, permission: perm });
  } catch(e) { next(e); }
});

// ─── DELETE /api/rbac/users/:id/permissions/:permission — Supprimer override ─
router.delete('/users/:id/permissions/:permission', auth, adminOnly, async (req, res, next) => {
  try {
    await prisma.userPermission.delete({
      where: { userId_permission: { userId: req.params.id, permission: req.params.permission } }
    });
    res.json({ success: true });
  } catch(e) { next(e); }
});

// ─── GET /api/rbac/audit — Log des changements RBAC ─────────────────────────
router.get('/audit', auth, adminOnly, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['RBAC_PERMISSION_CHANGED','GROUP_CREATED','GROUP_MEMBER_ADDED'] }
      },
      include: { user: { select: { name:true, email:true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ logs });
  } catch(e) { next(e); }
});

module.exports = router;

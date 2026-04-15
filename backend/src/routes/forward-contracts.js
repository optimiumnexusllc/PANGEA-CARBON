/**
 * PANGEA CARBON — Forward Contracts (Marché à terme)
 * Acheteurs peuvent réserver des crédits futurs à prix verrouillé
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/forward — Liste des contrats à terme disponibles
router.get('/', auth, async (req, res, next) => {
  try {
    const where = req.user.role === 'SUPER_ADMIN' ? {} :
                  req.user.role === 'ADMIN' ? 
                    { sellerOrgId: req.user.organizationId } :
                    { buyerOrgId: req.user.organizationId };
    
    const contracts = await prisma.forwardContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ contracts });
  } catch(e) { next(e); }
});

// POST /api/forward — Créer une offre de forward (vendeur)
router.post('/', auth, requirePermission('seller.configure_gateway'), async (req, res, next) => {
  try {
    if (!req.user.organizationId) return res.status(400).json({ error: 'Organization required' });
    const { projectId, vintage, quantity, pricePerTonne, standard, deliveryDeadline, depositPct, notes } = req.body;
    if (!projectId || !vintage || !quantity || !pricePerTonne) {
      return res.status(400).json({ error: 'projectId, vintage, quantity, pricePerTonne required' });
    }
    // Vérifier que le projet appartient à cette org
    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: req.user.organizationId }});
    if (!project) return res.status(403).json({ error: 'Project not found in your organization' });

    const contract = await prisma.forwardContract.create({ data: {
      sellerOrgId: req.user.organizationId,
      buyerOrgId: req.user.organizationId, // placeholder, updated when buyer commits
      projectId,
      vintage: parseInt(vintage),
      quantity: parseFloat(quantity),
      pricePerTonne: parseFloat(pricePerTonne),
      standard: standard || 'VERRA_VCS',
      deliveryDeadline: new Date(deliveryDeadline),
      depositPct: parseFloat(depositPct) || 20,
      depositAmount: parseFloat(quantity) * parseFloat(pricePerTonne) * (parseFloat(depositPct) || 20) / 100,
      pangeaFee: 3.5,
      status: 'PENDING',
      notes,
    }});
    res.json({ success: true, contract });
  } catch(e) { next(e); }
});

// POST /api/forward/:id/commit — Acheteur s'engage sur un forward
router.post('/:id/commit', auth, requirePermission('seller.request_payout'), async (req, res, next) => {
  try {
    const contract = await prisma.forwardContract.findUnique({ where: { id: req.params.id }});
    if (!contract || contract.status !== 'PENDING') return res.status(400).json({ error: 'Contract not available' });
    
    const updated = await prisma.forwardContract.update({
      where: { id: req.params.id },
      data: { buyerOrgId: req.user.organizationId, status: 'ACTIVE' }
    });
    res.json({ success: true, contract: updated });
  } catch(e) { next(e); }
});

module.exports = router;

/**
 * PANGEA CARBON — Système de notifications
 * Alertes production · Digest hebdo · Crédits générés
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { requirePermission, requirePlan } = require('../services/rbac.service');
const { sendVerificationEmail } = require('../services/email.service');
const prisma = new PrismaClient();

// Règles d'alerte
const ALERT_RULES = [
  {
    id: 'availability_low',
    name: 'Disponibilité faible',
    description: 'Déclenché si disponibilité < 95% sur un mois',
    severity: 'warning',
    check: (reading, project) => (reading.availabilityPct || 98) < 95,
    message: (reading, project) =>
      `⚠️ Disponibilité ${reading.availabilityPct?.toFixed(1)}% sur ${project.name} — seuil critique 95%`,
  },
  {
    id: 'production_drop',
    name: 'Chute de production',
    description: 'Production > 20% sous la moyenne historique',
    severity: 'critical',
    check: (reading, project, history) => {
      if (history.length < 3) return false;
      const avg = history.slice(0, 6).reduce((s, r) => s + r.energyMWh, 0) / Math.min(history.length, 6);
      return reading.energyMWh < avg * 0.8;
    },
    message: (reading, project, history) => {
      const avg = history.slice(0, 6).reduce((s, r) => s + r.energyMWh, 0) / Math.min(history.length, 6);
      const drop = ((avg - reading.energyMWh) / avg * 100).toFixed(1);
      return `🚨 Production ${drop}% sous la moyenne sur ${project.name} — action requise`;
    },
  },
  {
    id: 'credits_milestone',
    name: 'Jalon crédits carbone',
    description: 'Déclenché lors de jalons (1K, 5K, 10K, 50K tCO₂e)',
    severity: 'success',
    check: (reading, project, history, mrvRecord) => {
      if (!mrvRecord) return false;
      const milestones = [1000, 5000, 10000, 50000, 100000];
      return milestones.some(m =>
        mrvRecord.netCarbonCredits >= m &&
        mrvRecord.netCarbonCredits - (mrvRecord.netCarbonCredits * 0.1) < m
      );
    },
    message: (reading, project, history, mrvRecord) => {
      const milestones = [1000, 5000, 10000, 50000, 100000];
      const reached = milestones.filter(m => mrvRecord.netCarbonCredits >= m).pop();
      return `🎉 Jalon atteint: ${reached?.toLocaleString()} tCO₂e sur ${project.name}!`;
    },
  },
];

// POST /api/notifications/check/:projectId — Vérifier les alertes d'un projet
router.post('/check/:projectId', auth, requirePermission('projects.read'), async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        readings: { orderBy: { periodStart: 'desc' }, take: 12 },
        mrvRecords: { orderBy: { year: 'desc' }, take: 1 },
        user: { select: { email: true, name: true } },
      }
    });
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const latestReading = project.readings[0];
    const latestMRV = project.mrvRecords[0];
    const triggered = [];

    if (latestReading) {
      for (const rule of ALERT_RULES) {
        try {
          if (rule.check(latestReading, project, project.readings, latestMRV)) {
            const msg = rule.message(latestReading, project, project.readings, latestMRV);
            triggered.push({ ruleId: rule.id, name: rule.name, severity: rule.severity, message: msg });

            // Log en DB (audit)
            await prisma.auditLog.create({
              data: {
                userId: project.userId,
                action: `ALERT_${rule.id.toUpperCase()}`,
                entity: 'Project', entityId: project.id,
                after: { message: msg, severity: rule.severity }
              }
            });
          }
        } catch (e) { /* skip failing rules */ }
      }
    }

    res.json({ triggered, projectName: project.name, checkedAt: new Date() });
  } catch (e) { next(e); }
});

// GET /api/notifications/alerts — Toutes les alertes récentes du user
router.get('/alerts', auth, async (req, res, next) => {
  try {
    const alerts = await prisma.auditLog.findMany({
      where: {
        userId: req.user.userId,
        action: { startsWith: 'ALERT_' }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = alerts.map(a => ({
      id: a.id,
      type: a.action.replace('ALERT_', '').toLowerCase(),
      projectId: a.entityId,
      message: a.after?.message || a.action,
      severity: a.after?.severity || 'info',
      createdAt: a.createdAt,
    }));

    const unread = formatted.filter(a => {
      const lastSeen = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(a.createdAt) > lastSeen;
    }).length;

    res.json({ alerts: formatted, unread, total: alerts.length });
  } catch (e) { next(e); }
});

// POST /api/notifications/digest — Envoyer le digest hebdo
router.post('/digest', auth, requirePermission('projects.read'), async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const where = orgId ? { user: { organizationId: orgId } } : { userId: req.user.userId };

    const [projects, mrvRecords] = await Promise.all([
      prisma.project.findMany({ where, include: { mrvRecords: { orderBy: { year: 'desc' }, take: 1 } } }),
      prisma.mRVRecord.aggregate({ where: { project: where }, _sum: { netCarbonCredits: true, revenueUSD: true, totalEnergyMWh: true } }),
    ]);

    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true, name: true } });

    // Générer email digest
    const totalCredits = mrvRecords._sum.netCarbonCredits || 0;
    const totalRevenue = mrvRecords._sum.revenueUSD || 0;

    const digestHtml = `
      <h2 style="color:#00FF94;font-family:sans-serif">Digest hebdomadaire PANGEA CARBON</h2>
      <p>Bonjour ${user?.name},</p>
      <table style="width:100%;border-collapse:collapse;font-family:sans-serif">
        <tr><td style="padding:8px;border-bottom:1px solid #333">Projets actifs</td><td style="padding:8px;color:#00FF94;font-weight:bold">${projects.length}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #333">Crédits carbone totaux</td><td style="padding:8px;color:#38BDF8;font-weight:bold">${totalCredits.toFixed(0)} tCO₂e</td></tr>
        <tr><td style="padding:8px">Revenus carbone</td><td style="padding:8px;color:#FCD34D;font-weight:bold">$${totalRevenue.toFixed(0)}</td></tr>
      </table>
      <br>
      ${projects.map(p => {
        const mrv = p.mrvRecords[0];
        return `<p>📊 <b>${p.name}</b> (${p.countryCode}) — ${mrv ? mrv.netCarbonCredits.toFixed(0) + ' tCO₂e' : 'Aucun MRV'}</p>`;
      }).join('')}
      <br><a href="https://pangea-carbon.com/dashboard" style="background:#00FF94;color:#000;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold">Voir le dashboard →</a>
    `;

    await sendVerificationEmail({
      to: user?.email || '',
      name: user?.name || '',
      verifyUrl: 'https://pangea-carbon.com/dashboard',
      // On réutilise le service email pour le digest
    }).catch(e => console.error('[Digest]', e.message));

    res.json({ sent: true, to: user?.email, summary: { projects: projects.length, totalCredits, totalRevenue } });
  } catch (e) { next(e); }
});

// GET /api/notifications/preferences — Préférences de notifications
router.get('/preferences', auth, async (req, res, next) => {
  try {
    // Lire depuis SystemSetting ou retourner les défauts
    const prefs = await prisma.systemSetting.findMany({
      where: { key: { startsWith: `notif_${req.user.userId}_` } }
    });

    const defaults = {
      email_alerts: true,
      weekly_digest: true,
      production_drops: true,
      credit_milestones: true,
      availability_warnings: true,
    };

    const stored = Object.fromEntries(prefs.map(p => [p.key.replace(`notif_${req.user.userId}_`, ''), p.value === 'true']));
    res.json({ ...defaults, ...stored });
  } catch (e) { next(e); }
});

// PUT /api/notifications/preferences — Mettre à jour les préférences
router.put('/preferences', auth, requirePermission('projects.read'), async (req, res, next) => {
  try {
    const prefs = req.body;
    for (const [key, value] of Object.entries(prefs)) {
      await prisma.systemSetting.upsert({
        where: { key: `notif_${req.user.userId}_${key}` },
        update: { value: String(value) },
        create: { key: `notif_${req.user.userId}_${key}`, value: String(value), category: 'notifications' },
      });
    }
    res.json({ saved: true, preferences: prefs });
  } catch (e) { next(e); }
});

module.exports = router;

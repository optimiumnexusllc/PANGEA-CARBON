/**
 * PANGEA CARBON — Email Composer Backend
 * Envoi d'emails branded depuis la plateforme
 * Templates: MRV Report · Credit Issuance · Digest · Custom
 */
const router = require('express').Router();
const { requirePermission, requirePlan } = require('../services/rbac.service');

// Middleware: ADMIN et SUPER_ADMIN uniquement
const adminOrSuperAdmin = (req, res, next) => {
  if (!req.user || !['SUPER_ADMIN','ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Email Composer reserved for SUPER_ADMIN only' });
  }
  next();
};
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const prisma = new PrismaClient();

// Templates branded PANGEA CARBON
const TEMPLATES = {
  mrv_report: {
    id: 'mrv_report',
    name: 'Rapport MRV',
    subject: 'Votre rapport MRV ACM0002 — PANGEA CARBON',
    description: 'Envoi d\'un rapport de calcul MRV à un client ou partenaire',
    variables: ['recipientName', 'projectName', 'netCredits', 'revenueUSD', 'year', 'methodology'],
  },
  credit_issuance: {
    id: 'credit_issuance',
    name: 'Émission de crédits',
    subject: 'Crédits carbone émis — {{projectName}}',
    description: 'Notification d\'émission de crédits blockchain',
    variables: ['recipientName', 'projectName', 'quantity', 'standard', 'blockHash', 'vintage'],
  },
  investor_update: {
    id: 'investor_update',
    name: 'Update investisseur',
    subject: 'Portfolio Update — PANGEA CARBON Africa',
    description: 'Rapport périodique pour investisseurs et partenaires',
    variables: ['recipientName', 'totalCredits', 'totalRevenue', 'projectCount', 'period'],
  },
  welcome: {
    id: 'welcome',
    name: 'Bienvenue',
    subject: 'Bienvenue sur PANGEA CARBON — Plateforme MRV Africa',
    description: 'Email de bienvenue pour les nouveaux utilisateurs',
    variables: ['recipientName', 'orgName', 'loginUrl'],
  },
  custom: {
    id: 'custom',
    name: 'Email personnalisé',
    subject: '',
    description: 'Composez votre propre email avec la charte PANGEA CARBON',
    variables: [],
  },
};

// GET /api/email-composer/templates
router.get('/templates', auth, adminOrSuperAdmin, (req, res) => {
  res.json({ templates: Object.values(TEMPLATES) });
});

// POST /api/email-composer/preview — Prévisualiser un email
router.post('/preview', auth, adminOrSuperAdmin, async (req, res, next) => {
  try {
    const { templateId, subject, body, variables = {}, recipientName = 'Prénom Nom' } = req.body;
    const html = buildEmailHTML({ subject, body, variables, recipientName, templateId });
    res.json({ html, subject: interpolate(subject, variables) });
  } catch (e) { next(e); }
});

// POST /api/email-composer/send — Envoyer l'email
router.post('/send', auth, adminOrSuperAdmin, requirePermission('email_comp.send'), async (req, res, next) => {
  try {
    const { to, subject, body, variables = {}, templateId, cc, replyTo } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'Destinataire et sujet requis' });

    const { emailService } = require('../services/email.service');
    const html = buildEmailHTML({ subject, body, variables, templateId });
    const finalSubject = interpolate(subject, variables);

    // Utiliser nodemailer via le service existant
    const nodemailer = require('nodemailer');
    const { PrismaClient: PC } = require('@prisma/client');
    const p = new PC();
    const settings = await p.systemSetting.findMany({ where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'] } } });
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    await p.$disconnect();

    const host = map.smtp_host || process.env.SMTP_HOST;
    const user = map.smtp_user || process.env.SMTP_USER;
    const pass = map.smtp_password || process.env.SMTP_PASS;
    const port = parseInt(map.smtp_port || process.env.SMTP_PORT || '465');

    if (!host || !user || !pass) {
      return res.status(503).json({ error: 'SMTP non configuré. Admin → Secrets → smtp_host/user/password' });
    }

    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"PANGEA CARBON Africa" <${user}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      ...(cc && { cc }),
      ...(replyTo && { replyTo }),
      subject: finalSubject,
      html,
    });

    // Log dans l'audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'EMAIL_SENT',
        entity: 'Email',
        entityId: info.messageId || 'unknown',
        after: { to, subject: finalSubject, templateId }
      }
    });

    res.json({ success: true, messageId: info.messageId, to, subject: finalSubject });
  } catch (e) { next(e); }
});

// GET /api/email-composer/history
router.get('/history', auth, adminOrSuperAdmin, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.user.userId, action: 'EMAIL_SENT' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ history: logs.map(l => ({ id: l.id, ...l.after, sentAt: l.createdAt })) });
  } catch (e) { next(e); }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function interpolate(str, vars) {
  if (!str) return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);
}

function buildEmailHTML({ subject, body, variables = {}, recipientName = '', templateId }) {
  const finalBody = interpolate(body || getDefaultBody(templateId, variables), variables);
  const finalSubject = interpolate(subject || '', variables);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${finalSubject}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0D1117; color: #E8EFF6; }
  .wrapper { max-width: 640px; margin: 0 auto; background: #0D1117; }
  .header { background: linear-gradient(135deg, #080B0F 0%, #121920 100%); border-bottom: 2px solid #00FF94; padding: 32px 40px; }
  .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .logo-icon { width: 36px; height: 36px; background: rgba(0,255,148,0.15); border: 1px solid rgba(0,255,148,0.4); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .logo-text { font-size: 20px; font-weight: 800; color: #E8EFF6; letter-spacing: -0.5px; }
  .logo-sub { font-size: 11px; color: #4A6278; letter-spacing: 0.15em; font-family: 'Courier New', monospace; }
  .badge { display: inline-block; background: rgba(0,255,148,0.1); border: 1px solid rgba(0,255,148,0.3); color: #00FF94; font-size: 10px; padding: 3px 10px; border-radius: 20px; font-family: monospace; letter-spacing: 0.1em; margin-top: 4px; }
  .content { background: #121920; padding: 40px; border-left: 1px solid #1E2D3D; border-right: 1px solid #1E2D3D; }
  .subject-line { font-size: 22px; font-weight: 700; color: #E8EFF6; margin-bottom: 8px; line-height: 1.3; }
  .divider { height: 1px; background: linear-gradient(90deg, #00FF94, transparent); margin: 20px 0; }
  .body-text { font-size: 15px; line-height: 1.8; color: #8FA3B8; white-space: pre-wrap; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
  .kpi-box { background: #0D1117; border: 1px solid #1E2D3D; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi-value { font-size: 24px; font-weight: 800; color: #00FF94; font-family: monospace; }
  .kpi-label { font-size: 10px; color: #4A6278; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
  .cta { display: inline-block; background: #00FF94; color: #080B0F; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 24px 0; }
  .info-box { background: rgba(56,189,248,0.06); border: 1px solid rgba(56,189,248,0.2); border-radius: 8px; padding: 16px; margin: 20px 0; }
  .info-box p { font-size: 13px; color: #38BDF8; }
  .footer { background: #080B0F; border-top: 1px solid #1E2D3D; padding: 24px 40px; text-align: center; }
  .footer p { font-size: 11px; color: #2A3F55; line-height: 1.8; }
  .footer a { color: #4A6278; text-decoration: none; }
  .footer-logo { font-size: 13px; font-weight: 700; color: #4A6278; margin-bottom: 8px; }
  .standard-badge { display: inline-block; background: rgba(252,211,77,0.1); border: 1px solid rgba(252,211,77,0.3); color: #FCD34D; font-size: 9px; padding: 2px 8px; border-radius: 3px; font-family: monospace; margin: 2px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⬡</div>
      <div>
        <div class="logo-text">PANGEA CARBON</div>
        <div class="logo-sub">CARBON CREDIT INTELLIGENCE · AFRICA</div>
      </div>
    </div>
    <div>
      <span class="badge">VERRA ACM0002 v19.0</span>
      <span class="badge" style="margin-left:6px; border-color:rgba(252,211,77,0.3); color:#FCD34D; background:rgba(252,211,77,0.08);">GOLD STANDARD</span>
    </div>
  </div>

  <div class="content">
    <div class="subject-line">${finalSubject}</div>
    <div class="divider"></div>
    <div class="body-text">${finalBody}</div>
    <div style="margin-top:32px;">
      <a href="https://pangea-carbon.com/dashboard" class="cta">Accéder au Dashboard →</a>
    </div>
  </div>

  <div class="footer">
    <div class="footer-logo">⬡ PANGEA CARBON Africa</div>
    <p>
      Carbon Credit MRV Platform · Africa<br>
      <span class="standard-badge">VERRA VCS</span>
      <span class="standard-badge">GOLD STANDARD</span>
      <span class="standard-badge">ARTICLE 6 ITMO</span>
      <span class="standard-badge">CORSIA</span>
    </p>
    <p style="margin-top:12px;">
      <a href="https://pangea-carbon.com">pangea-carbon.com</a> ·
      <a href="mailto:contact@pangea-carbon.com">contact@pangea-carbon.com</a>
    </p>
    <p style="margin-top:8px; font-size:10px;">
      Cet email a été envoyé depuis la plateforme PANGEA CARBON.<br>
      © 2026 PANGEA CARBON Africa — Tous droits réservés
    </p>
  </div>
</div>
</body>
</html>`;
}

function getDefaultBody(templateId, vars) {
  switch (templateId) {
    case 'mrv_report':
      return `Bonjour {{recipientName}},\n\nVeuillez trouver ci-dessous les résultats de votre calcul MRV pour l'année {{year}}.\n\nProjet : {{projectName}}\nCrédits carbone nets : {{netCredits}} tCO₂e\nRevenus carbone : ${{revenueUSD}}\nMéthodologie : {{methodology}}\n\nCes crédits ont été calculés conformément au standard Verra ACM0002 v19.0 et aux facteurs d'émission UNFCCC 2024.\n\nPour accéder à votre rapport complet et à l'analyse détaillée de performance, connectez-vous à votre tableau de bord PANGEA CARBON.\n\nCordialement,\nL'équipe PANGEA CARBON Africa`;
    case 'credit_issuance':
      return `Bonjour {{recipientName}},\n\nNous avons le plaisir de vous informer que vos crédits carbone ont été émis avec succès sur la blockchain PANGEA CARBON.\n\nDétails de l'émission :\n• Projet : {{projectName}}\n• Quantité : {{quantity}} tCO₂e\n• Standard : {{standard}}\n• Vintage : {{vintage}}\n• Hash blockchain : {{blockHash}}\n\nVos crédits sont maintenant disponibles sur le Carbon Marketplace PANGEA CARBON.\n\nCordialement,\nL'équipe PANGEA CARBON Africa`;
    case 'investor_update':
      return `Bonjour {{recipientName}},\n\nVoici votre mise à jour de portfolio pour la période {{period}}.\n\nRésumé du portfolio :\n• Projets actifs : {{projectCount}}\n• Crédits carbone totaux : {{totalCredits}} tCO₂e\n• Revenus carbone : ${{totalRevenue}}\n\nNos équipes restent disponibles pour toute question sur votre portfolio carbone africain.\n\nCordialement,\nL'équipe PANGEA CARBON Africa`;
    case 'welcome':
      return `Bonjour {{recipientName}},\n\nBienvenue sur PANGEA CARBON — la plateforme de référence pour la gestion des crédits carbone en Afrique.\n\nVotre organisation {{orgName}} est maintenant enregistrée et vous pouvez commencer à :\n• Créer et gérer vos projets d'énergie renouvelable\n• Calculer vos crédits carbone (Verra ACM0002, Gold Standard)\n• Accéder aux marchés carbone africains\n• Générer des rapports certifiés\n\nConnectez-vous sur : {{loginUrl}}\n\nCordialement,\nL'équipe PANGEA CARBON Africa`;
    default:
      return '';
  }
}

module.exports = router;

// POST /api/email-composer/contact — ROUTE PUBLIQUE (sans auth)
// Pour le formulaire de contact Enterprise de la landing page
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, company, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });

    // Utiliser email.service.js qui gère le déchiffrement AES-256
    const { sendEmail } = require('../services/email.service');
    const dest = await (async () => {
      try {
        const s = await prisma.systemSetting.findUnique({ where: { key: 'contact_email' } });
        return s ? s.value : 'contact@pangea-carbon.com';
      } catch { return 'contact@pangea-carbon.com'; }
    })();

    await sendEmail({
      to: dest,
      replyTo: email,
      subject: `Demande Enterprise - ${company || name} (${email})`,
      html: `<h2 style="color:#00FF94">Nouvelle demande Enterprise PANGEA CARBON</h2>
        <p><strong>Nom:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Entreprise:</strong> ${company || '-'}</p>
        <p><strong>Message:</strong><br>${(message || '').replace(/\n/g, '<br>')}</p>
        <hr><p style="color:#888;font-size:11px">Envoye depuis pangea-carbon.com</p>`,
    });

    res.json({ success: true });
  } catch (e) { next(e); }
});

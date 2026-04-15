/**
 * PANGEA CARBON — Admin Router
 * Routes réservées SUPER_ADMIN et ADMIN
 */
const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { encrypt, decrypt, maskSecret } = require('../services/crypto.service');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Middleware: Admin only
const adminOnly = (req, res, next) => {
  if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

// ── SYSTEM OVERVIEW ────────────────────────────────────────────────────────
router.get('/overview', auth, adminOnly, async (req, res, next) => {
  try {
    const [
      totalUsers, activeUsers, totalOrgs,
      totalProjects, totalReadings,
      mrvagg, recentAudit
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.organization.count(),
      prisma.project.count(),
      prisma.energyReading.count(),
      prisma.mRVRecord.aggregate({ _sum: { netCarbonCredits: true, revenueUSD: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10,
        include: { user: { select: { name: true, email: true } } } }),
    ]);

    const usersByRole = await prisma.user.groupBy({ by: ['role'], _count: true });
    const orgsByPlan = await prisma.organization.groupBy({ by: ['plan'], _count: true });
    const projectsByStatus = await prisma.project.groupBy({ by: ['status'], _count: true });

    res.json({
      stats: {
        totalUsers, activeUsers, totalOrgs, totalProjects, totalReadings,
        totalCarbonCredits: mrvagg._sum.netCarbonCredits || 0,
        totalRevenueUSD: mrvagg._sum.revenueUSD || 0,
      },
      usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count })),
      orgsByPlan: orgsByPlan.map(r => ({ plan: r.plan, count: r._count })),
      projectsByStatus: projectsByStatus.map(r => ({ status: r.status, count: r._count })),
      recentAudit,
    });
  } catch (e) { next(e); }
});

// ── USERS ──────────────────────────────────────────────────────────────────
router.get('/users', auth, adminOnly, async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
        include: { organization: { select: { name: true, plan: true } }, _count: { select: { projects: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total });
  } catch (e) { next(e); }
});

router.patch('/users/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const { role, isActive, organizationId, name, billingPlan, maxProjects, maxUsers, maxMW } = req.body;
    if (req.params.id === req.user.userId && isActive === false) {
      return res.status(400).json({ error: 'Cannot disable your own account' });
    }
    const before = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { organization: { select: { id:true, plan:true, name:true } } }
    });

    // Update user fields
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (name !== undefined && name.trim()) updateData.name = name.trim();

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id:true, name:true, email:true, role:true, isActive:true, organizationId:true,
                organization:{ select:{ id:true, name:true, plan:true } } }
    });

    // Update org billing plan if requested
    if (billingPlan && user.organizationId) {
      const orgUpdate = { plan: billingPlan };
      if (maxProjects) orgUpdate.maxProjects = parseInt(maxProjects);
      if (maxUsers) orgUpdate.maxUsers = parseInt(maxUsers);
      if (maxMW) orgUpdate.maxMW = parseFloat(maxMW);
      // Set limits based on plan
      const planLimits = {
        TRIAL:      { maxProjects:5,  maxUsers:3,  maxMW:100 },
        STARTER:    { maxProjects:10, maxUsers:5,  maxMW:500 },
        GROWTH:     { maxProjects:50, maxUsers:20, maxMW:5000 },
        ENTERPRISE: { maxProjects:999,maxUsers:999,maxMW:99999 },
      };
      const limits = planLimits[billingPlan] || planLimits.TRIAL;
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { plan:billingPlan, status:billingPlan, ...limits, ...orgUpdate }
      });
    }

    await prisma.auditLog.create({
      data: { userId:req.user.userId, action:'UPDATE_USER', entity:'User', entityId:req.params.id,
              before, after:{ ...updateData, billingPlan }, ipAddress:req.ip }
    });
    res.json({ ...user, billingPlan: billingPlan || user.organization?.plan });
  } catch (e) { next(e); }
});

router.delete('/users/:id', auth, adminOnly, async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hard = req.query.hard === 'true' && req.user.role === 'SUPER_ADMIN';

    if (hard) {
      // Vraie suppression (SUPER_ADMIN only)
      await prisma.user.delete({ where: { id: req.params.id } });
      await prisma.auditLog.create({ data: { userId:req.user.userId, action:'DELETE_USER_HARD', entity:'User', entityId:req.params.id, before:user, ipAddress:req.ip } }).catch(()=>{});
      res.json({ deleted: true, hard: true });
    } else {
      // Désactivation (comportement par défaut)
      await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
      await prisma.auditLog.create({ data: { userId:req.user.userId, action:'DEACTIVATE_USER', entity:'User', entityId:req.params.id, before:user, ipAddress:req.ip } });
      res.json({ deleted: true, hard: false, deactivated: true });
    }
  } catch (e) { next(e); }
});

router.post('/users', auth, adminOnly, async (req, res, next) => {
  try {
    const { name, email, password, role, organizationId } = req.body;
    const hashed = await bcrypt.hash(password || 'ChangeMe@2026!', 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'ANALYST', organizationId, isActive: true, emailVerified: true },
      select: { id: true, name: true, email: true, role: true }
    });
    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'CREATE_USER', entity: 'User', entityId: user.id, after: { name, email, role }, ipAddress: req.ip } });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

// ── ORGANIZATIONS ──────────────────────────────────────────────────────────
router.get('/orgs', auth, adminOnly, async (req, res, next) => {
  try {
    const { search, plan, status } = req.query;
    const where = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (plan) where.plan = plan;
    if (status) where.status = status;

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where, include: { _count: { select: { users: true, projects: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.organization.count({ where }),
    ]);
    res.json({ orgs, total });
  } catch (e) { next(e); }
});

router.post('/orgs', auth, adminOnly, async (req, res, next) => {
  try {
    const { name, plan, country, billingEmail, maxProjects, maxMW, maxUsers } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const org = await prisma.organization.create({
      data: { name, slug: `${slug}-${Date.now().toString(36)}`, plan: plan || 'TRIAL', country, billingEmail, maxProjects: maxProjects || 5, maxMW: maxMW || 100, maxUsers: maxUsers || 3, trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
    });
    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'CREATE_ORG', entity: 'Organization', entityId: org.id, after: org, ipAddress: req.ip } });
    res.status(201).json(org);
  } catch (e) { next(e); }
});

router.patch('/orgs/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const org = await prisma.organization.update({ where: { id: req.params.id }, data: req.body });
    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'UPDATE_ORG', entity: 'Organization', entityId: req.params.id, after: req.body, ipAddress: req.ip } });
    res.json(org);
  } catch (e) { next(e); }
});

// ── SYSTEM SETTINGS (secrets chiffrés) ────────────────────────────────────
const SETTING_DEFS = [
  { key: 'stripe_secret_key',        category: 'stripe',       encrypted: true,  description: 'Stripe Secret Key (sk_live_...)' },
  { key: 'stripe_webhook_secret',    category: 'stripe',       encrypted: true,  description: 'Stripe Webhook Secret (whsec_...)' },
  { key: 'stripe_publishable_key',   category: 'stripe',       encrypted: false, description: 'Stripe Publishable Key (pk_live_...)' },
  { key: 'smtp_host',                category: 'smtp',         encrypted: false, description: 'Serveur SMTP (ex: smtp.gmail.com)' },
  { key: 'smtp_port',                category: 'smtp',         encrypted: false, description: 'Port SMTP (587)' },
  { key: 'smtp_user',                category: 'smtp',         encrypted: false, description: 'Email SMTP' },
  { key: 'smtp_password',            category: 'smtp',         encrypted: true,  description: 'Mot de passe SMTP' },
  { key: 'smtp_from_name',           category: 'smtp',         encrypted: false, description: 'Nom expéditeur (ex: PANGEA CARBON)' },
  { key: 'smtp_from_email',          category: 'smtp',         encrypted: false, description: 'Email expéditeur (ex: noreply@pangea-carbon.com)' },
  { key: 'carbon_market_api_key',    category: 'integrations', encrypted: true,  description: 'API prix carbone temps réel' },
  { key: 'anthropic_api_key',        category: 'integrations', encrypted: true,  description: 'Claude AI API key (Assistant IA)' },
  { key: 'sentry_dsn',               category: 'integrations', encrypted: false, description: 'Sentry DSN (monitoring erreurs)' },
  { key: 's3_bucket',                category: 'storage',      encrypted: false, description: 'Bucket S3/MinIO pour les PDFs' },
  { key: 's3_endpoint',              category: 'storage',      encrypted: false, description: 'Endpoint S3 (vide = AWS, sinon MinIO URL)' },
  { key: 's3_region',                category: 'storage',      encrypted: false, description: 'Région S3 (us-east-1, eu-west-1...)' },
  { key: 's3_access_key',            category: 'storage',      encrypted: true,  description: 'S3 Access Key ID' },
  { key: 's3_secret_key',            category: 'storage',      encrypted: true,  description: 'S3 Secret Access Key' },
  { key: 'mapbox_token',             category: 'integrations', encrypted: false, description: 'Mapbox token (carte avancée)' },
  { key: 'platform_name',            category: 'general',      encrypted: false, description: 'Nom de la plateforme' },
  { key: 'support_email',            category: 'general',      encrypted: false, description: 'Email de support' },
  { key: 'contact_email',            category: 'integrations', encrypted: false, description: 'Email destinataire des demandes Enterprise' },
  { key: 'carbon_price_usd',         category: 'general',      encrypted: false, description: 'Prix carbone par défaut ($/tCO₂e)' },


  // ── EMAIL NOTIFICATIONS ───────────────────────────────────────────────────
  { key: 'notif_email_signup',      category: 'notifications', encrypted: false, description: 'Notif: New user signup' },
  { key: 'notif_email_verify',      category: 'notifications', encrypted: false, description: 'Notif: Email verification' },
  { key: 'notif_email_2fa',         category: 'notifications', encrypted: false, description: 'Notif: 2FA OTP code' },
  { key: 'notif_email_password',    category: 'notifications', encrypted: false, description: 'Notif: Password reset' },
  { key: 'notif_email_project',     category: 'notifications', encrypted: false, description: 'Notif: New project created' },
  { key: 'notif_email_mrv',         category: 'notifications', encrypted: false, description: 'Notif: MRV report generated' },
  { key: 'notif_email_credit',      category: 'notifications', encrypted: false, description: 'Notif: Carbon credits issued' },
  { key: 'notif_email_marketplace', category: 'notifications', encrypted: false, description: 'Notif: Marketplace order' },
  { key: 'notif_email_pipeline',    category: 'notifications', encrypted: false, description: 'Notif: Pipeline stage change' },
  { key: 'notif_email_esg',         category: 'notifications', encrypted: false, description: 'Notif: ESG assessment complete' },
  { key: 'notif_email_invoice',     category: 'notifications', encrypted: false, description: 'Notif: Invoice generated' },
  { key: 'notif_email_payment',     category: 'notifications', encrypted: false, description: 'Notif: Payment confirmed' },
  { key: 'notif_email_alert',       category: 'notifications', encrypted: false, description: 'Notif: System alert' },
  { key: 'notif_email_digest',      category: 'notifications', encrypted: false, description: 'Notif: Weekly digest' },

  // ── CARBON MARKETPLACE & SPLIT ENGINE ─────────────────────────────────────
  { key: 'pangea_fee_pct',            category: 'carbon_marketplace', encrypted: false, description: 'PANGEA Carbon Fee % (défaut: 3.5%)' },
  { key: 'marketplace_stripe_key',    category: 'carbon_marketplace', encrypted: true,  description: 'Stripe Secret Key dédié marketplace carbone' },
  { key: 'marketplace_webhook_secret',category: 'carbon_marketplace', encrypted: true,  description: 'Stripe Webhook Secret marketplace (/api/marketplace/webhook/stripe)' },
  { key: 'seller_default_gateway',    category: 'carbon_marketplace', encrypted: false, description: 'Gateway par défaut pour payout vendeur: FLUTTERWAVE | CINETPAY | WIRE' },
  { key: 'marketplace_min_order',     category: 'carbon_marketplace', encrypted: false, description: 'Montant minimum par ordre (USD, défaut: 100)' },
  { key: 'marketplace_max_order',     category: 'carbon_marketplace', encrypted: false, description: 'Montant maximum par ordre (USD, défaut: 500000)' },

  // ── CINETPAY — AFRIQUE DE L'OUEST ─────────────────────────────────────────
  { key: 'cinetpay_api_key',          category: 'cinetpay',    encrypted: true,  description: 'CinetPay API Key (Dashboard → Mon compte → Mes API)' },
  { key: 'cinetpay_site_id',          category: 'cinetpay',    encrypted: false, description: 'CinetPay Site ID (numérique)' },
  { key: 'cinetpay_secret',           category: 'cinetpay',    encrypted: true,  description: 'CinetPay Secret (Dashboard → Mes API → Secret)' },
  { key: 'cinetpay_currency',         category: 'cinetpay',    encrypted: false, description: 'Devise CinetPay: XOF (CEDEAO) | XAF (CEMAC) | USD' },
  { key: 'cinetpay_notify_url',       category: 'cinetpay',    encrypted: false, description: 'Webhook CinetPay (auto: /api/marketplace/webhook/cinetpay)' },

  // ── FLUTTERWAVE — PAN-AFRICA ───────────────────────────────────────────────
  { key: 'flutterwave_secret_key',    category: 'flutterwave', encrypted: true,  description: 'Flutterwave Secret Key (FLWSECK_PROD-...)' },
  { key: 'flutterwave_public_key',    category: 'flutterwave', encrypted: false, description: 'Flutterwave Public Key (FLWPUBK_PROD-...)' },
  { key: 'flutterwave_webhook_hash',  category: 'flutterwave', encrypted: true,  description: 'Flutterwave Webhook Hash Secret' },
  { key: 'flutterwave_currency',      category: 'flutterwave', encrypted: false, description: 'Devise Flutterwave défaut: USD | NGN | GHS | KES | ZAR' },
  { key: 'flutterwave_subaccount',    category: 'flutterwave', encrypted: false, description: 'Subaccount ID Flutterwave pour split automatique' },

  // ── MOBILE MONEY DIRECT ────────────────────────────────────────────────────
  { key: 'mtn_momo_api_key',          category: 'mobile_money', encrypted: true,  description: 'MTN Mobile Money API Key (momodeveloper.mtn.com)' },
  { key: 'mtn_momo_user_id',          category: 'mobile_money', encrypted: false, description: 'MTN MoMo User ID (UUID v4)' },
  { key: 'mtn_momo_subscription_key', category: 'mobile_money', encrypted: true,  description: 'MTN MoMo Primary Subscription Key' },
  { key: 'orange_money_client_id',    category: 'mobile_money', encrypted: false, description: 'Orange Money Client ID (developer.orange.com/apis)' },
  { key: 'orange_money_client_secret',category: 'mobile_money', encrypted: true,  description: 'Orange Money Client Secret' },
  { key: 'wave_api_key',              category: 'mobile_money', encrypted: true,  description: 'Wave API Key (wave.com/en/business/api)' },

  // ── STRIPE CONNECT (split natif Stripe) ───────────────────────────────────
  { key: 'stripe_connect_client_id',  category: 'stripe',       encrypted: false, description: 'Stripe Connect Client ID (ca_...) pour onboarding vendeurs' },
  { key: 'stripe_connect_secret',     category: 'stripe',       encrypted: true,  description: 'Stripe Connect Secret Key pour splits automatiques' },

  // ── VERRA / GOLD STANDARD (registres officiels) ────────────────────────────
  { key: 'verra_api_token',           category: 'registries',   encrypted: true,  description: 'Verra Registry API Token (registry.verra.org)' },
  { key: 'gold_standard_api_key',     category: 'registries',   encrypted: true,  description: 'Gold Standard API Key (registry.goldstandard.org)' },
  { key: 'xpansiv_api_key',           category: 'registries',   encrypted: true,  description: 'Xpansiv CBL API Key (prix marché temps réel)' },
  { key: 'icvcm_api_key',             category: 'registries',   encrypted: true,  description: 'ICVCM Core Carbon Principles API Key' },
];

router.get('/settings', auth, adminOnly, async (req, res, next) => {
  try {
    const stored = await prisma.systemSetting.findMany();
    const storedMap = Object.fromEntries(stored.map(s => [s.key, s]));

    const settings = SETTING_DEFS.map(def => {
      const stored = storedMap[def.key];
      let displayValue = '';
      if (stored) {
        const raw = stored.encrypted ? decrypt(stored.value) : stored.value;
        displayValue = stored.encrypted ? maskSecret(raw) : raw;
      }
      // Fallback sur process.env
      if (!displayValue) {
        const envVal = process.env[def.key.toUpperCase()] || '';
        displayValue = def.encrypted && envVal ? maskSecret(envVal) : envVal;
      }
      return {
        ...def,
        value: displayValue,
        hasValue: !!stored?.value || !!process.env[def.key.toUpperCase()],
        updatedAt: stored?.updatedAt || null,
      };
    });

    const byCategory = settings.reduce((acc, s) => {
      acc[s.category] = acc[s.category] || [];
      acc[s.category].push(s);
      return acc;
    }, {});

    res.json({ settings, byCategory });
  } catch (e) { next(e); }
});


// POST /api/admin/settings/bulk — Sauvegarder plusieurs settings en une fois
router.post('/settings/bulk', auth, adminOnly, async (req, res, next) => {
  try {
    const { settings: settingsToSave } = req.body;
    if (!Array.isArray(settingsToSave)) return res.status(400).json({ error: 'settings must be an array' });

    const results = [];
    for (const { key, value } of settingsToSave) {
      const def = SETTING_DEFS.find(d => d.key === key);
      if (!def) { results.push({ key, success: false, error: 'Unknown key' }); continue; }
      try {
        const storedValue = def.encrypted ? encrypt(value||'') : (value||'');
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: storedValue, encrypted: def.encrypted, updatedBy: req.user.userId },
          create: { key, value: storedValue, encrypted: def.encrypted, category: def.category, description: def.description, updatedBy: req.user.userId },
        });
        if (value) process.env[key.toUpperCase()] = value;
        results.push({ key, success: true });
      } catch(err) { results.push({ key, success: false, error: err.message }); }
    }
    const saved = results.filter(r => r.success).length;
    res.json({ success: true, saved, total: settingsToSave.length, results });
  } catch(e) { next(e); }
});

router.put('/settings/:key', auth, adminOnly, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const def = SETTING_DEFS.find(d => d.key === key);
    if (!def) return res.status(400).json({ error: 'Clé inconnue' });

    const storedValue = def.encrypted ? encrypt(value) : value;

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: storedValue, encrypted: def.encrypted, updatedBy: req.user.userId },
      create: { key, value: storedValue, encrypted: def.encrypted, category: def.category, description: def.description, updatedBy: req.user.userId },
    });

    // Mettre à jour process.env en mémoire pour effet immédiat
    if (def.encrypted) {
      process.env[key.toUpperCase()] = value;
    } else {
      process.env[key.toUpperCase()] = value;
    }

    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'UPDATE_SETTING', entity: 'SystemSetting', entityId: key, after: { key, encrypted: def.encrypted }, ipAddress: req.ip } });

    const displayMasked = def.encrypted ? maskSecret(value) : value;
    console.log(`[Settings] ✓ ${key} sauvegardé (encrypted: ${def.encrypted})`);
    res.json({ success: true, key, masked: displayMasked });
  } catch (e) { next(e); }
});

// ── FEATURE FLAGS ──────────────────────────────────────────────────────────
const DEFAULT_FEATURES = [
  { key: 'pdf_reports',        name: 'Rapports PDF',         description: 'Génération PDF Verra ACM0002' },
  { key: 'africa_map',         name: 'Carte Afrique',        description: 'Carte interactive Leaflet' },
  { key: 'mrv_calculator',     name: 'Calculateur MRV',      description: 'Simulateur temps réel' },
  { key: 'api_access',         name: 'Accès API',            description: 'API REST publique' },
  { key: 'carbon_marketplace', name: 'Marketplace carbone',  description: 'Place de marché crédits' },
  { key: 'ai_assistant',       name: 'Assistant IA',         description: 'Claude AI intégré' },
  { key: 'bulk_import',        name: 'Import CSV/Excel',     description: 'Import données en masse' },
  { key: 'multi_standard',     name: 'Multi-standard',       description: 'Gold Standard + Article 6' },
  { key: 'white_label',        name: 'White Label',          description: 'Personnalisation marque' },
  { key: 'sso_saml',          name: 'SSO/SAML',             description: 'Single Sign-On enterprise' },
];

router.get('/features', auth, adminOnly, async (req, res, next) => {
  try {
    // Seed features si absent
    for (const f of DEFAULT_FEATURES) {
      await prisma.featureFlag.upsert({ where: { key: f.key }, update: {}, create: { ...f, enabled: ['pdf_reports', 'africa_map', 'mrv_calculator', 'bulk_import', 'ai_assistant'].includes(f.key) } });
    }
    const features = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    res.json(features);
  } catch (e) { next(e); }
});

router.patch('/features/:key', auth, adminOnly, async (req, res, next) => {
  try {
    const { enabled, rolloutPct } = req.body;
    const feature = await prisma.featureFlag.update({
      where: { key: req.params.key },
      data: { ...(enabled !== undefined && { enabled }), ...(rolloutPct !== undefined && { rolloutPct }) }
    });
    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'UPDATE_FEATURE', entity: 'FeatureFlag', entityId: req.params.key, after: req.body, ipAddress: req.ip } });
    res.json(feature);
  } catch (e) { next(e); }
});

// ── AUDIT LOGS ─────────────────────────────────────────────────────────────
router.get('/audit', auth, adminOnly, async (req, res, next) => {
  try {
    const { action, userId, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: parseInt(limit),
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total });
  } catch (e) { next(e); }
});

// ── REVENUE / BILLING ──────────────────────────────────────────────────────
router.get('/revenue', auth, adminOnly, async (req, res, next) => {
  try {
    const mrv = await prisma.mRVRecord.findMany({
      include: { project: { select: { name: true, countryCode: true, type: true, organizationId: true } } },
      orderBy: [{ year: 'desc' }, { revenueUSD: 'desc' }]
    });

    const byYear = mrv.reduce((acc, r) => {
      acc[r.year] = acc[r.year] || { year: r.year, credits: 0, revenue: 0, projects: 0 };
      acc[r.year].credits += r.netCarbonCredits;
      acc[r.year].revenue += r.revenueUSD;
      acc[r.year].projects++;
      return acc;
    }, {});

    const orgRevenue = await prisma.mRVRecord.groupBy({
      by: ['projectId'], _sum: { revenueUSD: true, netCarbonCredits: true }
    });

    res.json({
      totalCredits: mrv.reduce((s, r) => s + r.netCarbonCredits, 0),
      totalRevenue: mrv.reduce((s, r) => s + r.revenueUSD, 0),
      byYear: Object.values(byYear).sort((a, b) => b.year - a.year),
      topProjects: mrv.slice(0, 10),
    });
  } catch (e) { next(e); }
});

// ── API KEY MANAGEMENT ─────────────────────────────────────────────────────
router.get('/apikeys', auth, async (req, res, next) => {
  if (!['ADMIN','SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only ADMIN and SUPER_ADMIN can view API keys' });
  }
  try {
    const where = req.user.role === 'SUPER_ADMIN' ? {} : { organizationId: req.user.organizationId };
    const keys = await prisma.apiKey.findMany({ where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(keys);
  } catch (e) { next(e); }
});

router.post('/apikeys', auth, async (req, res, next) => {
  // Accessible aux ADMIN de leur org + SUPER_ADMIN
  if (!['ADMIN','SUPER_ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only ADMIN and SUPER_ADMIN can create API keys' });
  }
  // Vérifier le plan de l'org
  if (req.user.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: req.user.organizationId } });
    if (org?.plan === 'TRIAL') {
      const existing = await prisma.apiKey.count({ where: { organizationId: req.user.organizationId } });
      if (existing >= 1) {
        return res.status(403).json({ error: 'TRIAL plan limited to 1 API key. Upgrade to STARTER or higher.' });
      }
    }
  }
  try {
    const { name, userId, expiresAt } = req.body;
    const rawKey = `pgc_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const key = await prisma.apiKey.create({
      data: { name, userId, keyHash, keyPrefix, expiresAt: expiresAt ? new Date(expiresAt) : null }
    });

    await prisma.auditLog.create({ data: { userId: req.user.userId, action: 'CREATE_API_KEY', entity: 'ApiKey', entityId: key.id, after: { name, userId }, ipAddress: req.ip } });
    // Retourner la clé une seule fois
    res.status(201).json({ ...key, rawKey });
  } catch (e) { next(e); }
});

router.delete('/apikeys/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const hard = req.query.hard === 'true';
    if (hard) {
      // Suppression définitive (uniquement si déjà révoquée)
      const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
      if (!key) return res.status(404).json({ error: 'Clé introuvable' });
      if (key.isActive) return res.status(400).json({ error: 'Révoquez la clé avant de la supprimer définitivement' });
      await prisma.apiKey.delete({ where: { id: req.params.id } });
      await prisma.auditLog.create({ data: {
        userId: req.user.userId, action: 'APIKEY_DELETED', entity: 'ApiKey', entityId: req.params.id,
        before: { name: key.name, keyPrefix: key.keyPrefix }, ipAddress: req.ip,
      }}).catch(() => {});
      res.json({ success: true, deleted: true });
    } else {
      // Révocation (soft delete)
      await prisma.apiKey.update({ where: { id: req.params.id }, data: { isActive: false } });
      res.json({ success: true, revoked: true });
    }
  } catch (e) { next(e); }
});


// POST /api/admin/settings/test-smtp
router.post('/settings/test-smtp', auth, adminOnly, async (req, res, next) => {
  try {
    const nodemailer = require('nodemailer');
    const { decrypt } = require('../services/crypto.service');
    const admin = await prisma.user.findFirst({
      where: { id: req.user.userId },
      select: { email: true, name: true }
    });
    const to = req.body.to || admin.email;

    // Lire les settings directement depuis la DB avec déchiffrement
    const getSMTPSetting = async (key) => {
      const s = await prisma.systemSetting.findUnique({ where: { key } });
      if (!s) return process.env[key.toUpperCase()] || null;
      try { return s.encrypted ? decrypt(s.value) : s.value; }
      catch(e) { return process.env[key.toUpperCase()] || null; }
    };

    const smtpHost   = await getSMTPSetting('smtp_host');
    const smtpPort   = parseInt(await getSMTPSetting('smtp_port') || '465');
    const smtpUser   = await getSMTPSetting('smtp_user');
    const smtpPass   = await getSMTPSetting('smtp_password');
    const fromName   = await getSMTPSetting('smtp_from_name') || 'PANGEA CARBON';
    const fromEmail  = await getSMTPSetting('smtp_from_email') || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(400).json({
        error: 'SMTP not fully configured. Missing: ' + [
          !smtpHost && 'smtp_host',
          !smtpUser && 'smtp_user',
          !smtpPass && 'smtp_password',
        ].filter(Boolean).join(', ')
      });
    }

    // Test connectivité TCP d'abord
    const net = require('net');
    const tcpOk = await new Promise(resolve => {
      const sock = new net.Socket();
      sock.setTimeout(5000);
      sock.connect(smtpPort, smtpHost, () => { sock.destroy(); resolve(true); });
      sock.on('error', () => resolve(false));
      sock.on('timeout', () => { sock.destroy(); resolve(false); });
    });

    if (!tcpOk) {
      return res.status(400).json({
        error: 'TCP connection failed to ' + smtpHost + ':' + smtpPort + ' — port may be blocked by VPS firewall',
        diagnostic: {
          host: smtpHost, port: smtpPort, tcpReachable: false,
          user: smtpUser, passLength: smtpPass ? smtpPass.length : 0,
          hint: 'VPS providers often block outbound SMTP ports. Try port 587, or use SendGrid/Mailgun.',
        }
      });
    }

    // Créer le transporteur — config Hostinger optimale
    const secure = smtpPort === 465;
    const transporter = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure,
      auth: { type: 'login', user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // Vérifier la connexion SMTP
    try { await transporter.verify(); }
    catch(verifyErr) {
      const msg = verifyErr.message || '';
      const is535 = msg.includes('535') || msg.includes('authentication');
      return res.status(400).json({
        error: 'SMTP connection failed: ' + msg,
        diagnostic: {
          host: smtpHost, port: smtpPort, secure,
          tcpReachable: true,
          user: smtpUser,
          passLength: smtpPass ? smtpPass.length : 0,
          authError: is535,
          hint: is535
            ? 'Authentication failed — verify the email password in Hostinger hPanel: Emails > Manage > contact@pangea-carbon.com > Change Password'
            : (smtpPort === 465 ? 'Port 465 SSL error — try port 587' : 'Port 587 TLS error — try port 465'),
        }
      });
    }
    // Envoyer l'email de test
    const now = new Date().toLocaleString('fr-FR');
    const info = await transporter.sendMail({
      from: '"' + fromName + '" <' + fromEmail + '>',
      to,
      subject: 'PANGEA CARBON — SMTP Test ' + now,
      html: '<div style="font-family:monospace;background:#080B0F;color:#E8EFF6;padding:32px;border-radius:12px;max-width:560px">' +
        '<div style="color:#00FF94;font-size:20px;font-weight:800;margin-bottom:16px">⬡ PANGEA CARBON</div>' +
        '<div style="color:#4A6278;font-size:11px;margin-bottom:24px">SMTP TEST · ' + now + '</div>' +
        '<div style="background:#121920;border:1px solid #1E2D3D;border-radius:8px;padding:16px;margin-bottom:16px">' +
        '<div style="color:#38BDF8;font-size:12px;font-weight:700;margin-bottom:8px">✓ SMTP Authentication Successful</div>' +
        '<div style="color:#8FA3B8;font-size:12px">Host: <span style="color:#E8EFF6">' + smtpHost + ':' + smtpPort + '</span></div>' +
        '<div style="color:#8FA3B8;font-size:12px">From: <span style="color:#E8EFF6">' + fromName + ' &lt;' + fromEmail + '&gt;</span></div>' +
        '<div style="color:#8FA3B8;font-size:12px">To: <span style="color:#E8EFF6">' + to + '</span></div>' +
        '</div>' +
        '<div style="color:#4A6278;font-size:11px">PANGEA CARBON Africa · Carbon Intelligence Platform · pangea-carbon.com</div>' +
        '</div>',
      text: 'PANGEA CARBON SMTP Test OK — Host: ' + smtpHost + ':' + smtpPort,
    });
    res.json({ success: true, message: 'Test email sent to ' + to + ' via ' + smtpHost + ':' + smtpPort, messageId: info.messageId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// DELETE /api/admin/orgs/:id — Supprimer une organisation (avec ses users)
router.delete('/orgs/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: { users: { select: { id: true } }, _count: true }
    });
    if (!org) return res.status(404).json({ error: 'Organisation introuvable' });
    if (org._count.users > 0 && !req.query.force) {
      return res.status(409).json({
        error: `Cette organisation a ${org._count.users} utilisateur(s). Utilisez ?force=true pour forcer.`,
        userCount: org._count.users,
      });
    }
    // Détacher les users (ne pas supprimer leurs comptes)
    await prisma.user.updateMany({
      where: { organizationId: req.params.id },
      data: { organizationId: null }
    });
    // Supprimer les projets et leurs données
    const projects = await prisma.project.findMany({ where: { user: { organizationId: req.params.id } } });
    // Supprimer l'org
    await prisma.organization.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'ORG_DELETED', entity: 'Organization', entityId: req.params.id, after: { name: org.name } }
    });
    res.json({ success: true, deleted: org.name, usersDetached: org._count.users });
  } catch (e) { next(e); }
});

// PUT /api/admin/orgs/:id/full — Mise à jour complète d'une organisation
router.put('/orgs/:id/full', auth, adminOnly, async (req, res, next) => {
  try {
    const { name, plan, status, maxProjects, maxMW, maxUsers, domain, trialEndsAt } = req.body;
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(plan && { plan }),
        ...(status && { status }),
        ...(maxProjects !== undefined && { maxProjects: parseInt(maxProjects) }),
        ...(maxMW !== undefined && { maxMW: parseFloat(maxMW) }),
        ...(maxUsers !== undefined && { maxUsers: parseInt(maxUsers) }),
        ...(domain !== undefined && { domain }),
        ...(trialEndsAt !== undefined && { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null }),
      }
    });
    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: 'ORG_UPDATED', entity: 'Organization', entityId: req.params.id, after: req.body }
    });
    res.json(org);
  } catch (e) { next(e); }
});

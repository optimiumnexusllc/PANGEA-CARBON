const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { sendVerificationEmail, sendAdminNotification, sendWelcomeEmail } = require('../services/email.service');
const prisma = new PrismaClient();

const generateTokens = (user) => {
  const payload = { userId: user.id, email: user.email, role: user.role, organizationId: user.organizationId || null };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty(),
  body('organization').optional().trim(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, name, organization, orgType, orgCountry } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, 12);

    // Token de vérification (expire dans 24h)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Créer une organisation Trial automatiquement pour chaque nouveau signup
    const orgSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'') + '-' + Date.now().toString(36);
    const org = await prisma.organization.create({
      data: {
        name: organization || (name + "'s Organization"),
        slug: orgSlug,
        plan: 'TRIAL',
        status: 'TRIAL',
        maxProjects: 3,
        maxUsers: 2,
        maxMW: 50,
        billingEmail: email,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }
    });

    const user = await prisma.user.create({
      data: {
        email, password: hashedPassword, name,
        role: 'ORG_OWNER',       // Propriétaire de son organisation — pas d'accès console admin plateforme
        organizationId: org.id,
        isActive: false,         // Inactif jusqu'à vérification email
        emailVerified: false,
        verifyToken,
        verifyExpires,
      },
      select: { id: true, email: true, name: true, role: true }
    });

    // Auto-créer BuyerProfile si corporate buyer
    const corporateTypes = ['CORPORATE_VOLUNTARY','COMPLIANCE_CBAM','STRATEGIC_NETZERO','FINANCIAL','COMPLIANCE_CORSIA','COMPLIANCE_LOCAL'];
    if (orgType && corporateTypes.includes(orgType)) {
      try {
        await prisma.buyerProfile.create({
          data: {
            organizationId: org.id,
            buyerType: orgType,
            country: orgCountry || null,
            status: 'PROSPECT',
          }
        });
      } catch(_e) { /* non bloquant */ }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://pangea-carbon.com';
    const verifyUrl = `${frontendUrl}/auth/verify?token=${verifyToken}`;

    // 1. Email de vérification à l'utilisateur
    await sendVerificationEmail({ to: email, name, verifyUrl }).catch(e =>
      console.error('[Email] Erreur envoi vérification:', e.message)
    );

    // 2. Notification aux admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
      select: { email: true }
    });
    for (const admin of admins) {
      await sendAdminNotification({
        adminEmail: admin.email,
        newUser: { name, email },
        orgName: organization,
        plan: req.body.plan || 'Trial',
        verifyUrl,
      }).catch(e => console.error('[Email] Erreur notif admin:', e.message));
    }

    // Log audit (non-bloquant)
    await prisma.auditLog.create({
      data: { action: 'REGISTER', entity: 'User', entityId: user.id, after: { email, name }, ipAddress: req.ip }
    }).catch(() => {});

    // Générer tokens pour que le frontend puisse créer le projet/profil
    const tokens = generateTokens(user);

    res.status(201).json({
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
      email,
      pendingVerification: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, email, name, role: 'ADMIN' },
    });
  } catch (e) { next(e); }
});

// GET /api/auth/verify?token=xxx
router.get('/verify', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token manquant' });

    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyExpires: { gt: new Date() } }
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré. Demandez un nouveau lien.' });
    }

    // Activer le compte
    const activated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true, emailVerified: true, verifyToken: null, verifyExpires: null, lastLoginAt: new Date() },
      select: { id: true, email: true, name: true, role: true, organization: true }
    });

    // Email de bienvenue
    await sendWelcomeEmail({
      to: activated.email,
      name: activated.name,
      dashboardUrl: `${process.env.FRONTEND_URL || 'https://pangea-carbon.com'}/dashboard`,
    }).catch(e => console.error('[Email] Erreur bienvenue:', e.message));

    // Log audit
    await prisma.auditLog.create({
      data: { action: 'EMAIL_VERIFIED', entity: 'User', entityId: user.id, ipAddress: req.ip }
    });

    // Générer les tokens et connecter directement
    const tokens = generateTokens(activated);
    res.json({
      success: true,
      message: 'Email vérifié ! Votre compte est maintenant actif.',
      user: activated,
      ...tokens,
    });
  } catch (e) { next(e); }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ error: 'Email introuvable' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email déjà vérifié' });

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({ where: { id: user.id }, data: { verifyToken, verifyExpires } });

    const verifyUrl = `${process.env.FRONTEND_URL || 'https://pangea-carbon.com'}/auth/verify?token=${verifyToken}`;
    await sendVerificationEmail({ to: email, name: user.name, verifyUrl });

    res.json({ message: 'Email de vérification renvoyé.' });
  } catch (e) { next(e); }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    // Vérifier si l'email est validé
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Email non vérifié',
        message: 'Vérifiez votre boîte email et cliquez sur le lien d\'activation.',
        pendingVerification: true,
        email,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez le support.' });
    }

    // ── Vérifier si 2FA est activé ────────────────────────────────────────
    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: user.id } });

    if (twofa?.enabled) {
      // Générer un token temporaire pré-auth (15 minutes, limité)
      const preAuthToken = jwt.sign(
        { userId: user.id, preAuth: true, requiresMFA: true },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({
        requiresMFA: true,
        preAuthToken,
        userId: user.id,
        user: { name: user.name, email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2') },
      });
    }

    // Mettre à jour dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } }
    });

    const { password: _, ...userSafe } = user;
    const tokens = generateTokens(userSafe);
    res.json({ user: userSafe, ...tokens });
  } catch (e) { next(e); }
});

// POST /api/auth/mfa-verify — Étape 2FA après login
router.post('/mfa-verify', async (req, res, next) => {
  try {
    const { preAuthToken, code, method } = req.body;
    if (!preAuthToken || !code) return res.status(400).json({ error: 'preAuthToken and code required' });

    // Valider le pre-auth token
    let decoded;
    try {
      decoded = jwt.verify(preAuthToken, process.env.JWT_SECRET);
    } catch(e) { return res.status(401).json({ error: 'Pre-auth token expired. Please login again.' }); }

    if (!decoded.preAuth || !decoded.requiresMFA) return res.status(401).json({ error: 'Invalid pre-auth token' });

    const userId = decoded.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account not found or inactive' });

    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!twofa?.enabled) return res.status(400).json({ error: '2FA not enabled for this account' });

    const crypto = require('crypto');
    const speakeasy = require('speakeasy');
    const { decrypt } = require('../services/crypto.service');

    // Method: totp (app) ou email (otp par email)
    if (method === 'email') {
      // Vérifier via Email OTP
      const codeHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
      const otp = await prisma.emailOTP.findFirst({
        where: { userId, code: codeHash, used: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' }
      });
      if (!otp) return res.status(401).json({ error: 'Invalid or expired email code. Request a new one.' });
      await prisma.emailOTP.update({ where: { id: otp.id }, data: { used: true } });
    } else {
      // Vérifier via TOTP app (défaut)
      const secret = decrypt(twofa.secret);
      const totpValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(code).replace(/\s/g,''), window: 2 });

      if (!totpValid) {
        // Essayer les backup codes
        const codeHash = crypto.createHash('sha256').update(String(code).toLowerCase().replace(/\s/g,'')).digest('hex');
        const idx = (twofa.backupCodes||[]).indexOf(codeHash);
        if (idx === -1) return res.status(401).json({ error: 'Invalid 2FA code. Try again or use a backup code.' });
        const newBackups = [...twofa.backupCodes]; newBackups.splice(idx, 1);
        await prisma.twoFactorAuth.update({ where: { userId }, data: { backupCodes: newBackups } });
      }
    }

    // 2FA validé — finaliser la connexion
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } }
    });
    await prisma.auditLog.create({
      data: { userId, action:'LOGIN_MFA_SUCCESS', entity:'User', entityId:userId, after:{ method:method||'totp' } }
    }).catch(() => {});

    const { password: _, ...userSafe } = user;
    const tokens = generateTokens(userSafe);
    res.json({ user: userSafe, ...tokens });
  } catch(e) { next(e); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Token manquant' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, name: true, isActive: true, organizationId: true }
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Compte invalide' });

    const tokens = generateTokens(user);
    res.json({ user, ...tokens });
  } catch (e) {
    if (e.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token invalide' });
    next(e);
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, role: true, organization: true, createdAt: true, emailVerified: true, lastLoginAt: true }
    });
    res.json(user);
  } catch (e) { next(e); }
});

module.exports = router;

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const { email } = req.body;
    // Toujours répondre 200 (ne pas révéler si l'email existe)
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: resetToken, verifyExpires: resetExpires }
    });

    // Auto-créer BuyerProfile si corporate buyer
    const corporateTypes = ['CORPORATE_VOLUNTARY','COMPLIANCE_CBAM','STRATEGIC_NETZERO','FINANCIAL','COMPLIANCE_CORSIA','COMPLIANCE_LOCAL'];
    if (orgType && corporateTypes.includes(orgType)) {
      await prisma.buyerProfile.create({
        data: {
          organizationId: org.id,
          buyerType: orgType,
          country: orgCountry || null,
          status: 'PROSPECT',
        }
      }).catch(() => {});
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://pangea-carbon.com';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const { sendVerificationEmail } = require('../services/email.service');
    // Réutiliser le template email mais avec un message reset
    await sendVerificationEmail({
      to: email,
      name: user.name,
      verifyUrl: resetUrl,
      subject: '🔑 Réinitialisation de votre mot de passe PANGEA CARBON',
    }).catch(e => console.error('[Email] Reset password:', e.message));

    await prisma.auditLog.create({
      data: { action: 'PASSWORD_RESET_REQUESTED', entity: 'User', entityId: user.id, ipAddress: req.ip }
    });

    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (e) { next(e); }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyExpires: { gt: new Date() } }
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou expiré. Demandez un nouveau lien.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verifyToken: null,
        verifyExpires: null,
        isActive: true,
        emailVerified: true,
      }
    });

    await prisma.auditLog.create({
      data: { action: 'PASSWORD_RESET_COMPLETED', entity: 'User', entityId: user.id, ipAddress: req.ip }
    });

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (e) { next(e); }
});

// POST /api/auth/change-password (utilisateur connecté)
router.post('/change-password', require('../middleware/auth'), [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'PASSWORD_CHANGED', entity: 'User', entityId: user.id, ipAddress: req.ip }
    });

    res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
  } catch (e) { next(e); }
});

// PUT /api/auth/me — Mettre à jour le profil
router.put('/me', require('../middleware/auth'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
], async (req, res, next) => {
  try {
    const { name } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { ...(name && { name }) },
      select: { id: true, email: true, name: true, role: true, organizationId: true, emailVerified: true, lastLoginAt: true }
    });
    res.json(updated);
  } catch (e) { next(e); }
});

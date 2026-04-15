/**
 * PANGEA CARBON — 2FA / MFA Elite
 * TOTP (Google Authenticator/Authy) + Email OTP
 * RFC 6238 · AES-256 encrypted secrets
 */
const router = require('express').Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/crypto.service');
const { sendEmailOTP } = require('../services/email.service');
const prisma = new PrismaClient();

// ─── GET /api/2fa/status ──────────────────────────────────────────────────────
router.get('/status', auth, async (req, res, next) => {
  try {
    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    const user  = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true, name: true } });
    res.json({
      enabled: twofa?.enabled || false,
      emailOtpEnabled: twofa?.emailOtpEnabled || false,
      backupCodesRemaining: twofa?.backupCodes?.length || 0,
      email: user?.email,
      name: user?.name,
    });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/setup — TOTP Setup ────────────────────────────────────────
router.post('/setup', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true, name: true } });
    const secret = speakeasy.generateSecret({
      name: 'PANGEA CARBON (' + (user?.email||'user') + ')',
      issuer: 'PANGEA CARBON Africa',
      length: 20,
    });

    await prisma.twoFactorAuth.upsert({
      where: { userId: req.user.userId },
      update: { secret: encrypt(secret.base32), enabled: false },
      create: { userId: req.user.userId, secret: encrypt(secret.base32), enabled: false },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url, {
      errorCorrectionLevel: 'M', width: 220,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntry: { account: user?.email, key: secret.base32, type: 'TOTP', issuer: 'PANGEA CARBON Africa' },
    });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/verify — Activate TOTP ────────────────────────────────────
router.post('/verify', auth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    if (!twofa) return res.status(404).json({ error: '2FA not set up. Call /setup first.' });

    const secret = decrypt(twofa.secret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
    if (!valid) return res.status(400).json({ error: 'Invalid code. Check your authenticator app and device time.' });

    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedBackups = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));

    await prisma.twoFactorAuth.update({
      where: { userId: req.user.userId },
      data: { enabled: true, backupCodes: hashedBackups },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: '2FA_ENABLED', entity: 'User', entityId: req.user.userId, ipAddress: req.ip }
    }).catch(() => {});

    res.json({ success: true, backupCodes });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/validate — Login MFA check ────────────────────────────────
router.post('/validate', async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!twofa?.enabled) return res.json({ valid: true, required: false });

    // Check TOTP
    const secret = decrypt(twofa.secret);
    const totpValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
    if (totpValid) return res.json({ valid: true, required: true });

    // Check backup codes (hashed)
    const codeHash = crypto.createHash('sha256').update(code.toLowerCase().replace(/\s/g,'')).digest('hex');
    const idx = twofa.backupCodes.indexOf(codeHash);
    if (idx !== -1) {
      const newBackups = [...twofa.backupCodes];
      newBackups.splice(idx, 1);
      await prisma.twoFactorAuth.update({ where: { userId }, data: { backupCodes: newBackups } });
      return res.json({ valid: true, required: true, usedBackupCode: true, remaining: newBackups.length });
    }

    res.status(401).json({ valid: false, required: true, error: 'Invalid 2FA code' });
  } catch(e) { next(e); }
});

// ─── DELETE /api/2fa/disable ──────────────────────────────────────────────────
router.delete('/disable', auth, async (req, res, next) => {
  try {
    const { code } = req.body;
    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    if (!twofa?.enabled) return res.status(400).json({ error: '2FA not enabled' });

    const secret = decrypt(twofa.secret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
    if (!valid) return res.status(400).json({ error: 'Invalid code. Cannot disable 2FA.' });

    await prisma.twoFactorAuth.update({ where: { userId: req.user.userId }, data: { enabled: false } });
    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: '2FA_DISABLED', entity: 'User', entityId: req.user.userId, ipAddress: req.ip }
    }).catch(() => {});

    res.json({ success: true });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/backup-codes/regenerate ───────────────────────────────────
router.post('/backup-codes/regenerate', auth, async (req, res, next) => {
  try {
    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    if (!twofa?.enabled) return res.status(400).json({ error: '2FA must be enabled' });

    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedBackups = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));
    await prisma.twoFactorAuth.update({ where: { userId: req.user.userId }, data: { backupCodes: hashedBackups } });
    res.json({ backupCodes });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/email/send — Envoyer OTP par email ────────────────────────
router.post('/email/send', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true, name: true } });
    if (!user?.email) return res.status(400).json({ error: 'No email address on file' });

    // Invalider les anciens OTPs (non-fatal)
    try {
      await prisma.emailOTP.updateMany({
        where: { userId: req.user.userId, used: false },
        data: { used: true }
      });
    } catch(dbErr) { console.warn('[2FA] emailOTP cleanup:', dbErr.message); }

    // Générer et stocker le code 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    try {
      await prisma.emailOTP.create({
        data: { userId: req.user.userId, code: codeHash, expiresAt }
      });
    } catch(dbErr) {
      console.error('[2FA] emailOTP create error:', dbErr.message);
      return res.status(500).json({ error: 'Database error: ' + dbErr.message });
    }

    // Envoyer le mail (non-fatal — on retourne quand même succès)
    const lang = req.query.lang || req.body.lang || 'en';
    let emailResult = { sent: false };
    try {
      await sendEmailOTP({ to: user.email, name: user.name||'', code, expiresInMinutes: 5, lang });
      emailResult = { sent: true };
    } catch(emailErr) {
      console.warn('[2FA] Email send failed:', emailErr.message, '— code:', code);
      // En dev, retourner le code si l'email échoue (à désactiver en prod)
      emailResult = { sent: false, devCode: process.env.NODE_ENV !== 'production' ? code : undefined };
    }

    const maskedEmail = user.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    res.json({ success: true, sentTo: maskedEmail, ...emailResult });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/email/verify — Vérifier OTP email ────────────────────────
router.post('/email/verify', auth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const codeHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
    const otp = await prisma.emailOTP.findFirst({
      where: { userId: req.user.userId, code: codeHash, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp) return res.status(400).json({ error: 'Invalid or expired code. Request a new one.' });

    await prisma.emailOTP.update({ where: { id: otp.id }, data: { used: true } });
    res.json({ valid: true });
  } catch(e) { next(e); }
});

module.exports = router;

/**
 * PANGEA CARBON — 2FA TOTP
 * Sprint 4 — Sécurité crédits carbone
 * Compatible: Google Authenticator, Authy, 1Password
 */
const router = require('express').Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/crypto.service');
const prisma = new PrismaClient();

// POST /api/2fa/setup — Initier la configuration 2FA
router.post('/setup', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { email: true, name: true } });

    const secret = speakeasy.generateSecret({
      name: `PANGEA CARBON (${user.email})`,
      issuer: 'PANGEA CARBON Africa',
      length: 20,
    });

    // Stocker le secret temporairement (non activé)
    await prisma.twoFactorAuth.upsert({
      where: { userId: req.user.userId },
      update: { secret: encrypt(secret.base32), enabled: false },
      create: { userId: req.user.userId, secret: encrypt(secret.base32), enabled: false },
    });

    // Générer le QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32, // Affiché une seule fois pour la saisie manuelle
      qrCode: qrCodeUrl,     // Image base64 pour scanner
      manualEntry: {
        account: user.email,
        key: secret.base32,
        type: 'TOTP',
        issuer: 'PANGEA CARBON',
      },
    });
  } catch (e) { next(e); }
});

// POST /api/2fa/verify — Vérifier le code et activer le 2FA
router.post('/verify', auth, async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis' });

    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    if (!twofa) return res.status(404).json({ error: '2FA non configuré. Appelez /setup d\'abord.' });

    const secret = decrypt(twofa.secret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });

    if (!valid) return res.status(400).json({ error: 'Code invalide. Vérifiez l\'heure de votre appareil.' });

    // Générer les codes de secours (8 codes de 8 caractères)
    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
    const hashedBackups = backupCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));

    await prisma.twoFactorAuth.update({
      where: { userId: req.user.userId },
      data: { enabled: true, backupCodes: hashedBackups },
    });

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: '2FA_ENABLED', entity: 'User', entityId: req.user.userId, ipAddress: req.ip }
    });

    res.json({
      success: true,
      message: '2FA activé avec succès',
      backupCodes, // Affichés une seule fois — l'utilisateur doit les sauvegarder
    });
  } catch (e) { next(e); }
});

// POST /api/2fa/validate — Valider lors du login (appelé après login classique)
router.post('/validate', async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId et code requis' });

    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!twofa?.enabled) return res.json({ valid: true, required: false }); // 2FA non activé

    const secret = decrypt(twofa.secret);

    // Vérifier le code TOTP
    const totpValid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
    if (totpValid) {
      await prisma.auditLog.create({
        data: { userId, action: '2FA_LOGIN_SUCCESS', entity: 'User', entityId: userId, ipAddress: req.ip }
      });
      return res.json({ valid: true, required: true });
    }

    // Vérifier les codes de secours
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const backupIndex = twofa.backupCodes.indexOf(codeHash);
    if (backupIndex !== -1) {
      // Invalider le code de secours utilisé
      const newBackups = [...twofa.backupCodes];
      newBackups.splice(backupIndex, 1);
      await prisma.twoFactorAuth.update({ where: { userId }, data: { backupCodes: newBackups } });
      return res.json({ valid: true, required: true, usedBackupCode: true, remaining: newBackups.length });
    }

    await prisma.auditLog.create({
      data: { userId, action: '2FA_LOGIN_FAILED', entity: 'User', entityId: userId, ipAddress: req.ip }
    });
    res.status(401).json({ valid: false, required: true, error: 'Code 2FA invalide' });
  } catch (e) { next(e); }
});

// DELETE /api/2fa/disable — Désactiver le 2FA
router.delete('/disable', auth, async (req, res, next) => {
  try {
    const { code } = req.body;
    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    if (!twofa?.enabled) return res.status(400).json({ error: '2FA non activé' });

    const secret = decrypt(twofa.secret);
    const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
    if (!valid) return res.status(400).json({ error: 'Code invalide pour désactiver le 2FA' });

    await prisma.twoFactorAuth.update({ where: { userId: req.user.userId }, data: { enabled: false } });
    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: '2FA_DISABLED', entity: 'User', entityId: req.user.userId, ipAddress: req.ip }
    });

    res.json({ success: true, message: '2FA désactivé' });
  } catch (e) { next(e); }
});

// GET /api/2fa/status — Statut 2FA de l'utilisateur
router.get('/status', auth, async (req, res, next) => {
  try {
    const twofa = await prisma.twoFactorAuth.findUnique({ where: { userId: req.user.userId } });
    res.json({
      enabled: twofa?.enabled || false,
      backupCodesRemaining: twofa?.backupCodes?.length || 0,
    });
  } catch (e) { next(e); }
});

module.exports = router;

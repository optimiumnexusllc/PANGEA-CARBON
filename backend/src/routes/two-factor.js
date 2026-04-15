/**
 * PANGEA CARBON — 2FA / MFA Routes
 * TOTP via speakeasy + QR Code via qrcode
 */
const router = require('express').Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const auth = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

// ─── GET /api/2fa/status ─────────────────────────────────────────────────────
router.get('/status', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where:{ id:req.user.userId }, select:{ twoFactorEnabled:true, email:true, name:true } });
    res.json({ enabled: user?.twoFactorEnabled || false, email: user?.email });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/setup — Generate secret + QR code ────────────────────────
router.post('/setup', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where:{ id:req.user.userId }, select:{ email:true, name:true, twoFactorEnabled:true } });
    if (!user) return res.status(404).json({ error:'User not found' });
    if (user.twoFactorEnabled) return res.status(400).json({ error:'2FA already enabled' });

    const secret = speakeasy.generateSecret({
      name: 'PANGEA CARBON (' + (user.email||'user') + ')',
      issuer: 'PANGEA CARBON',
      length: 32,
    });

    // Save temp secret (not enabled yet — only enabled after verify)
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorSecret: secret.base32, twoFactorEnabled: false }
    });

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
      errorCorrectionLevel: 'M', type: 'image/png', width: 200,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    res.json({
      secret: secret.base32,
      qrCode: qrDataUrl,
      otpauthUrl: secret.otpauth_url,
      manualEntry: secret.base32,
    });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/verify — Confirm code + activate 2FA ─────────────────────
router.post('/verify', auth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error:'Token required' });

    const user = await prisma.user.findUnique({ where:{ id:req.user.userId }, select:{ twoFactorSecret:true } });
    if (!user?.twoFactorSecret) return res.status(400).json({ error:'2FA not set up. Call /setup first.' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token).replace(/\s/g,''),
      window: 2,
    });

    if (!verified) return res.status(400).json({ error:'Invalid code. Check your authenticator app.' });

    // Generate backup codes
    const backupCodes = Array.from({length:8}, ()=> crypto.randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})/,'$1-').slice(0,9));

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorEnabled: true, twoFactorBackup: JSON.stringify(backupCodes) }
    });

    await prisma.auditLog.create({ data:{ userId:req.user.userId, action:'2FA_ENABLED', entity:'User', entityId:req.user.userId, after:{ enabled:true } } }).catch(()=>{});

    res.json({ success:true, backupCodes, message:'2FA enabled successfully' });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/check — Validate TOTP during login ───────────────────────
router.post('/check', async (req, res, next) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error:'userId and token required' });

    const user = await prisma.user.findUnique({ where:{ id:userId }, select:{ twoFactorSecret:true, twoFactorEnabled:true, twoFactorBackup:true } });
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ error:'2FA not enabled for this user' });

    // Check TOTP
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token).replace(/\s/g,''),
      window: 2,
    });

    if (verified) return res.json({ valid: true });

    // Check backup codes
    const backupCodes = user.twoFactorBackup ? JSON.parse(user.twoFactorBackup) : [];
    const normalizedToken = String(token).replace(/\s|-/g,'').toUpperCase();
    const codeIdx = backupCodes.findIndex(c => c.replace(/-/g,'') === normalizedToken);

    if (codeIdx !== -1) {
      // Consume backup code (one-time use)
      backupCodes.splice(codeIdx, 1);
      await prisma.user.update({ where:{ id:userId }, data:{ twoFactorBackup: JSON.stringify(backupCodes) } });
      return res.json({ valid:true, usedBackup:true, remainingBackupCodes:backupCodes.length });
    }

    res.status(400).json({ valid:false, error:'Invalid authentication code' });
  } catch(e) { next(e); }
});

// ─── POST /api/2fa/disable ───────────────────────────────────────────────────
router.post('/disable', auth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error:'Current 2FA token required to disable' });

    const user = await prisma.user.findUnique({ where:{ id:req.user.userId }, select:{ twoFactorSecret:true, twoFactorEnabled:true } });
    if (!user?.twoFactorEnabled) return res.status(400).json({ error:'2FA not enabled' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token).replace(/\s/g,''),
      window: 2,
    });

    if (!verified) return res.status(400).json({ error:'Invalid token. Cannot disable 2FA.' });

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackup: null }
    });

    await prisma.auditLog.create({ data:{ userId:req.user.userId, action:'2FA_DISABLED', entity:'User', entityId:req.user.userId } }).catch(()=>{});

    res.json({ success:true, message:'2FA disabled' });
  } catch(e) { next(e); }
});

// ─── GET /api/2fa/backup-codes — Regenerate backup codes ────────────────────
router.post('/backup-codes/regenerate', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where:{ id:req.user.userId }, select:{ twoFactorEnabled:true } });
    if (!user?.twoFactorEnabled) return res.status(400).json({ error:'2FA must be enabled' });

    const backupCodes = Array.from({length:8}, ()=> crypto.randomBytes(4).toString('hex').toUpperCase().replace(/(.{4})/,'$1-').slice(0,9));
    await prisma.user.update({ where:{ id:req.user.userId }, data:{ twoFactorBackup: JSON.stringify(backupCodes) } });

    res.json({ backupCodes });
  } catch(e) { next(e); }
});

module.exports = router;

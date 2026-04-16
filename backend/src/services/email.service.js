/**
 * PANGEA CARBON — Email Service
 * Nodemailer + Templates HTML branded
 * Config: SMTP via SystemSetting DB ou .env
 */
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./crypto.service');

const prisma = new PrismaClient();

async function getSetting(key) {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key } });
    if (!s) return process.env[key.toUpperCase()] || null;
    return s.encrypted ? decrypt(s.value) : s.value;
  } catch { return process.env[key.toUpperCase()] || null; }
}

async function getTransporter() {
  const host = await getSetting('smtp_host') || process.env.SMTP_HOST;
  const port = parseInt(await getSetting('smtp_port') || process.env.SMTP_PORT || '587');
  const user = await getSetting('smtp_user') || process.env.SMTP_USER;
  const pass = await getSetting('smtp_password') || process.env.SMTP_PASS;
  // Hostinger: le From DOIT correspondre à l'utilisateur authentifié
  const fromName  = await getSetting('smtp_from_name')  || process.env.SMTP_FROM_NAME  || 'PANGEA CARBON';
  const fromEmail = await getSetting('smtp_from_email') || process.env.SMTP_FROM_EMAIL || user;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP non configuré — email non envoyé');
    return null;
  }

  const transport = nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { type: 'login', user, pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  // Attacher les infos d'expéditeur au transporteur
  transport._pangea_from = '"' + fromName + '" <' + (fromEmail || user) + '>';
  transport._pangea_user = user;
  return transport;
}

const BRAND = {
  bg: '#080B0F', card: '#121920', border: '#1E2D3D',
  green: '#00FF94', text: '#E8EFF6', muted: '#8FA3B8', dim: '#4A6278',
};

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PANGEA CARBON</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="display:inline-block;">
            <tr>
              <td style="width:32px;height:32px;background:rgba(0,255,148,0.15);border:1px solid rgba(0,255,148,0.3);border-radius:8px;text-align:center;vertical-align:middle;font-size:16px;">⬡</td>
              <td style="padding-left:10px;font-size:18px;font-weight:700;color:${BRAND.text};">PANGEA CARBON</td>
            </tr>
          </table>
          <div style="font-size:12px;color:${BRAND.dim};margin-top:6px;">Carbon Credit Intelligence · Africa</div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;padding:32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:${BRAND.dim};">
          © 2026 PANGEA CARBON Africa · Verra ACM0002 · Gold Standard<br>
          <a href="https://pangea-carbon.com" style="color:${BRAND.green};text-decoration:none;">pangea-carbon.com</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Email de vérification envoyé à l'utilisateur
 */
async function sendVerificationEmail({ to, name, verifyUrl }) {
  const transporter = await getTransporter();

  const html = baseTemplate(`
    <h1 style="font-size:22px;font-weight:700;color:${BRAND.text};margin:0 0 8px;">Vérifiez votre adresse email</h1>
    <p style="color:${BRAND.muted};font-size:14px;line-height:1.7;margin:0 0 24px;">
      Bonjour <strong style="color:${BRAND.text};">${name}</strong>,<br>
      Bienvenue sur PANGEA CARBON ! Cliquez sur le bouton ci-dessous pour activer votre compte et commencer à générer des crédits carbone.
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}"
        style="background:${BRAND.green};color:#080B0F;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        ✓ Activer mon compte →
      </a>
    </div>

    <div style="background:#0D1117;border:1px solid ${BRAND.border};border-radius:8px;padding:12px 16px;margin-top:24px;">
      <div style="font-size:11px;color:${BRAND.dim};margin-bottom:6px;font-family:monospace;letter-spacing:0.05em;">LIEN DE VÉRIFICATION (valable 24h)</div>
      <a href="${verifyUrl}" style="color:${BRAND.green};font-size:12px;word-break:break-all;font-family:monospace;">${verifyUrl}</a>
    </div>

    <p style="color:${BRAND.dim};font-size:12px;margin-top:20px;line-height:1.6;">
      Si vous n'avez pas créé de compte PANGEA CARBON, ignorez cet email.<br>
      Ce lien expire dans <strong style="color:${BRAND.text};">24 heures</strong>.
    </p>
  `);

  const info = transporter
    ? await transporter.sendMail({
        from: transporter._pangea_from || transporter._pangea_user,
        to,
        subject: '✓ Activez votre compte PANGEA CARBON',
        html,
      })
    : null;

  if (info) console.log(`[Email] Vérification envoyée → ${to} (${info.messageId})`);
  else console.log(`[Email] SMTP non dispo — lien de vérification: ${verifyUrl}`);

  return info;
}

/**
 * Notification admin : nouvel inscrit
 */
async function sendAdminNotification({ adminEmail, newUser, orgName, plan, verifyUrl }) {
  const transporter = await getTransporter();
  const supportEmail = await getSetting('support_email') || process.env.SMTP_USER;

  const html = baseTemplate(`
    <div style="display:inline-block;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);border-radius:6px;padding:4px 10px;font-size:11px;color:#F87171;font-family:monospace;margin-bottom:16px;">
      ADMIN · NOUVEL INSCRIT
    </div>
    <h1 style="font-size:20px;font-weight:700;color:${BRAND.text};margin:0 0 20px;">Nouvelle inscription EPC/IPP</h1>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${[
        ['Nom', newUser.name],
        ['Email', newUser.email],
        ['Organisation', orgName || '—'],
        ['Plan choisi', plan || 'Trial'],
        ['Date', new Date().toLocaleString('fr-FR')],
      ].map(([k, v]) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font-size:12px;color:${BRAND.dim};font-family:monospace;width:140px;">${k}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.text};">${v}</td>
        </tr>
      `).join('')}
    </table>

    <div style="margin-top:24px;padding:16px;background:#0D1117;border-radius:8px;border:1px solid ${BRAND.border};">
      <div style="font-size:11px;color:${BRAND.dim};margin-bottom:8px;font-family:monospace;">LIEN DE VÉRIFICATION UTILISATEUR</div>
      <a href="${verifyUrl}" style="color:${BRAND.green};font-size:12px;word-break:break-all;font-family:monospace;">${verifyUrl}</a>
    </div>

    <div style="display:flex;gap:12px;margin-top:20px;">
      <a href="https://pangea-carbon.com/dashboard/admin/users"
        style="background:${BRAND.green};color:#080B0F;text-decoration:none;padding:10px 20px;border-radius:7px;font-weight:700;font-size:13px;display:inline-block;">
        Gérer les utilisateurs →
      </a>
    </div>
  `);

  if (!transporter) { console.log(`[Email] Admin notif non envoyée — SMTP non dispo`); return null; }

  return transporter.sendMail({
    from: transporter._pangea_from || transporter._pangea_user,
    to: adminEmail,
    subject: `🆕 Nouvel inscrit : ${newUser.name} (${orgName || 'sans org'})`,
    html,
  });
}

/**
 * Email de confirmation après vérification réussie
 */
async function sendWelcomeEmail({ to, name, dashboardUrl }) {
  const transporter = await getTransporter();
  if (!transporter) return null;

  const html = baseTemplate(`
    <div style="text-align:center;font-size:40px;margin-bottom:16px;">🌍</div>
    <h1 style="font-size:22px;font-weight:700;color:${BRAND.text};margin:0 0 12px;text-align:center;">Bienvenue sur PANGEA CARBON !</h1>
    <p style="color:${BRAND.muted};font-size:14px;line-height:1.7;margin:0 0 24px;text-align:center;">
      <strong style="color:${BRAND.text};">${name}</strong>, votre compte est activé.<br>
      Commencez à calculer vos crédits carbone dès maintenant.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${dashboardUrl}"
        style="background:${BRAND.green};color:#080B0F;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        Accéder à mon dashboard →
      </a>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td width="33%" style="text-align:center;padding:12px;">
          <div style="font-size:24px;margin-bottom:6px;">⚡</div>
          <div style="font-size:12px;color:${BRAND.text};font-weight:600;">Créez un projet</div>
          <div style="font-size:11px;color:${BRAND.dim};margin-top:3px;">Solaire, éolien, hydraulique</div>
        </td>
        <td width="33%" style="text-align:center;padding:12px;">
          <div style="font-size:24px;margin-bottom:6px;">📊</div>
          <div style="font-size:12px;color:${BRAND.text};font-weight:600;">Importez vos données</div>
          <div style="font-size:11px;color:${BRAND.dim};margin-top:3px;">CSV ou Equipment API</div>
        </td>
        <td width="33%" style="text-align:center;padding:12px;">
          <div style="font-size:24px;margin-bottom:6px;">💰</div>
          <div style="font-size:12px;color:${BRAND.text};font-weight:600;">Générez des crédits</div>
          <div style="font-size:11px;color:${BRAND.dim};margin-top:3px;">Verra ACM0002 certifiés</div>
        </td>
      </tr>
    </table>
  `);

  return transporter.sendMail({
    from: transporter._pangea_from || transporter._pangea_user,
    to,
    subject: '🌍 Bienvenue sur PANGEA CARBON — Votre compte est activé',
    html,
  });
}

async function sendEmail({ to, replyTo, subject, html, text }) {
  const transporter = await getTransporter();
  if (!transporter) throw new Error('SMTP non configure — verifiez Admin > Secrets');
  const user = await getSetting('smtp_user') || process.env.SMTP_USER;
  return transporter.sendMail({
    from: transporter._pangea_from || transporter._pangea_user,
    to,
    ...(replyTo && { replyTo }),
    subject,
    html,
    ...(text && { text }),
  });
}


/**
 * Email OTP pour 2FA — PANGEA CARBON
 */
async function sendEmailOTP({ to, name, code, expiresInMinutes, lang }) {
  const transporter = await getTransporter();
  const mins = expiresInMinutes || 5;
  const isEn = lang !== 'fr';
  const userName = name || '';
  const validFor = isEn ? ('Valid for ' + mins + ' minutes') : ('Valide pendant ' + mins + ' minutes');
  const titleTxt = isEn ? 'Your PANGEA CARBON security code' : 'Votre code de securite PANGEA CARBON';
  const bodyTxt = isEn
    ? ('Hello ' + userName + ',<br><br>Use this code to complete your PANGEA CARBON authentication. Valid for <strong style="color:#E8EFF6;">' + mins + ' minutes</strong>. Single use only.')
    : ('Bonjour ' + userName + ',<br><br>Utilisez ce code pour votre authentification PANGEA CARBON. Valide <strong style="color:#E8EFF6;">' + mins + ' minutes</strong>. Usage unique.');
  const warnTxt = isEn
    ? 'If you did not request this code, your account may be at risk. Contact support immediately.'
    : 'Si vous navez pas demande ce code, votre compte est en danger. Contactez le support.';

  const content = [
    '<div style="text-align:center;margin-bottom:28px;">',
    '<div style="display:inline-block;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);border-radius:12px;padding:16px 24px;margin-bottom:16px;">',
    '<div style="font-size:11px;color:#A78BFA;letter-spacing:0.15em;font-family:monospace;margin-bottom:8px;">' + (isEn ? 'SECURITY CODE' : 'CODE DE SECURITE') + '</div>',
    '<div style="font-size:48px;font-weight:800;color:#E8EFF6;letter-spacing:0.25em;font-family:monospace;">' + code + '</div>',
    '</div>',
    '<div style="font-size:12px;color:#4A6278;font-family:monospace;">' + validFor + '</div>',
    '</div>',
    '<h2 style="font-size:18px;font-weight:700;color:#E8EFF6;margin:0 0 12px;">' + titleTxt + '</h2>',
    '<p style="font-size:14px;color:#8FA3B8;line-height:1.7;margin:0 0 20px;">' + bodyTxt + '</p>',
    '<div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:8px;padding:12px 16px;font-size:12px;color:#F87171;margin-bottom:20px;">',
    'warning: ' + warnTxt,
    '</div>',
    '<div style="border-top:1px solid #1E2D3D;padding-top:16px;font-size:11px;color:#4A6278;text-align:center;font-family:monospace;">',
    'PANGEA CARBON · MFA · ' + new Date().toISOString().split('T')[0],
    '</div>',
  ].join('\n');

  const subject = isEn
    ? ('PANGEA CARBON — Security code: ' + code)
    : ('PANGEA CARBON — Code de securite: ' + code);
  const html = baseTemplate(content);
  const from = transporter ? (transporter._pangea_from || transporter._pangea_user) : null;
  const info = transporter
    ? await transporter.sendMail({ from, to, subject, html })
    : null;
  if (!transporter) console.log('[2FA Email OTP] SMTP non configure — code:', code);
  return { success: true, info };
}


/**
 * Envoie les instructions de virement Wire aux ops PANGEA
 */
async function sendWireInstructions({ to, payoutId, amount, currency, instructions, orderId }) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[Email] SMTP not configured — wire instructions not sent');
    return;
  }
  const from = transporter._pangea_from || ('"PANGEA CARBON" <contact@pangea-carbon.com>');

  const fields = [
    ['Payout ID',      payoutId],
    ['Order ID',       orderId],
    ['Amount',         `${amount} ${currency}`],
    ['Beneficiary',    instructions.beneficiary || '—'],
    ['IBAN / Account', instructions.iban || '—'],
    ['SWIFT/BIC',      instructions.swift || '—'],
    ['Bank Name',      instructions.bankName || '—'],
    ['Bank City',      instructions.bankCity || '—'],
    ['Bank Country',   instructions.bankCountry || '—'],
    ['Intermediary',   instructions.bankIntermediary || '—'],
    ['Reference',      instructions.reference],
    ['Note',           instructions.note],
  ].map(([k,v]) => `<tr><td style="padding:6px 12px;font-weight:700;color:#4A6278;width:180px">${k}</td><td style="padding:6px 12px;color:#E8EFF6;font-family:'JetBrains Mono',monospace">${v}</td></tr>`).join('');

  const html = baseTemplate(`
    <h2 style="color:#00FF94;font-family:sans-serif;margin:0 0 16px">🏦 Wire Transfer Required</h2>
    <p style="color:#8FA3B8;margin:0 0 20px">A wire transfer payout needs to be processed for the following seller:</p>
    <table style="width:100%;border-collapse:collapse;background:#0D1117;border:1px solid #1E2D3D;border-radius:8px">
      ${fields}
    </table>
    <div style="margin-top:20px;padding:14px;background:rgba(0,255,148,0.06);border:1px solid rgba(0,255,148,0.2);border-radius:8px">
      <p style="margin:0;color:#00FF94;font-size:13px">⚡ Action required: Process this wire transfer and mark the payout as PAID in the PANGEA Admin Console.</p>
    </div>
  `);

  await transporter.sendMail({
    from,
    to,
    subject: `[PANGEA CARBON] Wire Payout Required — $${amount} — Order ${orderId}`,
    html,
  });
}

module.exports = {
  sendWireInstructions, sendVerificationEmail, sendAdminNotification, sendWelcomeEmail, sendEmail, sendEmailOTP };

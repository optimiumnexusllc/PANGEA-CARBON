/**
 * PANGEA CARBON — Service de chiffrement AES-256-GCM
 * Chiffre/déchiffre les secrets stockés en base de données
 * La clé de chiffrement vient de l'env (jamais stockée en DB)
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Dérive une clé fixe depuis ENCRYPTION_KEY de l'env
function getKey() {
  const rawKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'pangea-carbon-default-key-change-in-prod';
  return crypto.scryptSync(rawKey, 'pangea-carbon-salt', KEY_LENGTH);
}

/**
 * Chiffre une valeur sensible
 * @param {string} plaintext - Valeur à chiffrer
 * @returns {string} Format: iv:encrypted:tag (base64)
 */
function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${encrypted}:${tag.toString('base64')}`;
}

/**
 * Déchiffre une valeur stockée
 * @param {string} ciphertext - Format iv:encrypted:tag
 * @returns {string} Valeur déchiffrée
 */
function decrypt(ciphertext) {
  if (!ciphertext) return '';
  try {
    const [ivB64, encrypted, tagB64] = ciphertext.split(':');
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[Crypto] Déchiffrement échoué:', e.message);
    return '';
  }
}

/**
 * Masque une clé pour l'affichage (sk_live_xxx... → sk_live_••••••••xxxx)
 */
function maskSecret(value) {
  if (!value || value.length < 8) return '••••••••';
  const prefix = value.substring(0, Math.min(8, value.indexOf('_', 3) + 1) || 7);
  const suffix = value.slice(-4);
  return `${prefix}${'•'.repeat(16)}${suffix}`;
}

module.exports = { encrypt, decrypt, maskSecret };

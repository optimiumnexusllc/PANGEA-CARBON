/**
 * PANGEA CARBON — PDF Signature Service v1.0
 * Signature cryptographique SHA-256 + HMAC des rapports
 * Vérification publique: pangea-carbon.com/verify/:hash
 * Compatible: Verra VVB · Gold Standard · ISO 14064
 */
const crypto = require('crypto');

// ─── SIGNATURE ────────────────────────────────────────────────────────────────
function signDocument(content, metadata) {
  const ts = new Date().toISOString();
  const sigData = {
    content_hash: crypto.createHash('sha256').update(content).digest('hex'),
    metadata: {
      projectId: metadata.projectId,
      orgId: metadata.orgId,
      type: metadata.type,
      standard: metadata.standard || 'Verra VCS',
      issuer: 'PANGEA CARBON · pangea-carbon.com',
      issued_at: ts,
    },
  };
  
  // HMAC avec la clé secrète
  const secret = process.env.JWT_SECRET || 'pangea-carbon-signing-key';
  const payload = JSON.stringify(sigData);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  
  const verificationId = crypto.createHash('sha256')
    .update(sigData.content_hash + ts + signature)
    .digest('hex')
    .slice(0, 32);
  
  return {
    verificationId,
    signature,
    signedAt: ts,
    algorithm: 'HMAC-SHA256',
    issuer: 'PANGEA CARBON Platform',
    verifyUrl: 'https://pangea-carbon.com/verify/' + verificationId,
    contentHash: sigData.content_hash,
    metadata: sigData.metadata,
  };
}

// ─── VÉRIFICATION ─────────────────────────────────────────────────────────────
function verifyDocument(content, signatureData) {
  try {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    if (contentHash !== signatureData.contentHash) {
      return { valid: false, reason: 'Document content has been modified' };
    }
    
    const secret = process.env.JWT_SECRET || 'pangea-carbon-signing-key';
    const sigData = {
      content_hash: contentHash,
      metadata: signatureData.metadata,
    };
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(sigData))
      .digest('hex');
    
    const valid = crypto.timingSafeEqual(
      Buffer.from(signatureData.signature),
      Buffer.from(expectedSig)
    );
    
    return {
      valid,
      verificationId: signatureData.verificationId,
      signedAt: signatureData.signedAt,
      issuer: signatureData.issuer,
      reason: valid ? null : 'Signature verification failed',
    };
  } catch(e) {
    return { valid: false, reason: e.message };
  }
}

// ─── ENREGISTREMENT EN DB ─────────────────────────────────────────────────────
async function registerSignature(reportId, signatureData, prisma) {
  try {
    // Sauvegarder dans le rapport pour vérification future
    await prisma.report.update({
      where: { id: reportId },
      data: {
        verificationId: signatureData.verificationId,
        signature: signatureData.signature,
        signedAt: new Date(signatureData.signedAt),
        contentHash: signatureData.contentHash,
      }
    }).catch(() => {}); // Silencieux si colonnes manquantes
    
    return signatureData.verificationId;
  } catch(e) {
    console.error('[PDFSign] Register error:', e.message);
    return null;
  }
}

// ─── FOOTER DE SIGNATURE POUR LE PDF ──────────────────────────────────────────
function getSignatureBlock(sigData, lang = 'en') {
  const line1 = lang === 'fr'
    ? 'Document certifié par PANGEA CARBON · Plateforme MRV Africaine'
    : 'Document certified by PANGEA CARBON · African MRV Platform';
  const line2 = lang === 'fr'
    ? 'Signature: ' + sigData.algorithm + ' · Émis le: ' + new Date(sigData.signedAt).toLocaleDateString('fr-FR')
    : 'Signature: ' + sigData.algorithm + ' · Issued: ' + new Date(sigData.signedAt).toLocaleDateString('en-GB');
  const line3 = lang === 'fr'
    ? 'Vérification: ' + sigData.verifyUrl
    : 'Verify at: ' + sigData.verifyUrl;
  const line4 = 'Hash: ' + sigData.contentHash.slice(0, 32) + '...';
  
  return { line1, line2, line3, line4 };
}

module.exports = { signDocument, verifyDocument, registerSignature, getSignatureBlock };

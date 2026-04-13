/**
 * PANGEA CARBON — Storage S3/MinIO
 * Sprint 3 — PDFs et fichiers persistants
 * Compatible: AWS S3 · MinIO · Backblaze B2 · Cloudflare R2
 */
const AWS = require('aws-sdk');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let s3Client = null;
let configured = false;

async function getConfig() {
  try {
    const keys = ['s3_bucket','s3_access_key','s3_secret_key','s3_region','s3_endpoint'];
    const settings = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    return {
      bucket: map.s3_bucket || process.env.S3_BUCKET,
      accessKey: map.s3_access_key || process.env.S3_ACCESS_KEY,
      secretKey: map.s3_secret_key || process.env.S3_SECRET_KEY,
      region: map.s3_region || process.env.S3_REGION || 'us-east-1',
      endpoint: map.s3_endpoint || process.env.S3_ENDPOINT,
    };
  } catch { return {}; }
}

async function initStorage() {
  const config = await getConfig();
  if (!config.bucket || !config.accessKey) {
    console.log('[Storage] S3 non configuré — stockage local /tmp/pangea-storage');
    return false;
  }
  s3Client = new AWS.S3({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint, s3ForcePathStyle: true } : {}),
  });
  configured = true;
  console.log('[Storage] ✓ S3:', config.endpoint || 's3.amazonaws.com');
  return true;
}

async function uploadFile(key, buffer, contentType = 'application/pdf') {
  if (!configured || !s3Client) {
    const fs = require('fs'), path = require('path');
    const dir = '/tmp/pangea-storage';
    fs.mkdirSync(dir, { recursive: true });
    const localPath = path.join(dir, key.replace(/\//g, '_'));
    fs.writeFileSync(localPath, buffer);
    return { local: true, path: localPath };
  }
  const config = await getConfig();
  const result = await s3Client.upload({
    Bucket: config.bucket, Key: key, Body: buffer,
    ContentType: contentType, ServerSideEncryption: 'AES256',
  }).promise();
  return { s3: true, location: result.Location, key: result.Key };
}

async function getSignedUrl(key, expiresIn = 3600) {
  if (!configured || !s3Client) return `/api/reports/download?key=${encodeURIComponent(key)}`;
  const config = await getConfig();
  return s3Client.getSignedUrlPromise('getObject', { Bucket: config.bucket, Key: key, Expires: expiresIn });
}

module.exports = { initStorage, uploadFile, getSignedUrl, isConfigured: () => configured };

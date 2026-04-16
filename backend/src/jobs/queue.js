/**
 * PANGEA CARBON — Queue Engine v2.0 (BullMQ)
 * Jobs: MRV Monte Carlo, PDF Generation, Report Delivery, Webhook Dispatch
 * Redis-backed, concurrence configurable, retry automatique
 */
const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');

const REDIS_OPTS = {
  host: (process.env.REDIS_URL || 'redis://localhost:6379').replace('redis://','').split(':')[0],
  port: parseInt((process.env.REDIS_URL || 'redis://localhost:6379').split(':')[2] || '6379'),
  maxRetriesPerRequest: null,
};

// ─── QUEUES ──────────────────────────────────────────────────────────────────
const MRV_QUEUE    = 'pangea:mrv';
const REPORT_QUEUE = 'pangea:reports';
const WEBHOOK_QUEUE= 'pangea:webhooks';
const EMAIL_QUEUE  = 'pangea:emails';

let mrvQueue, reportQueue, webhookQueue, emailQueue;

function initQueues() {
  const connection = new Redis(REDIS_OPTS);
  const opts = { connection };
  mrvQueue    = new Queue(MRV_QUEUE, opts);
  reportQueue = new Queue(REPORT_QUEUE, opts);
  webhookQueue= new Queue(WEBHOOK_QUEUE, opts);
  emailQueue  = new Queue(EMAIL_QUEUE, opts);
  return { mrvQueue, reportQueue, webhookQueue, emailQueue };
}

// ─── JOBS API ─────────────────────────────────────────────────────────────────
async function queueMRVCalculation(projectId, userId, opts = {}) {
  if (!mrvQueue) initQueues();
  return mrvQueue.add('mrv-calc', { projectId, userId, ...opts }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}

async function queueReportGeneration(reportId, userId, type = 'MRV') {
  if (!reportQueue) initQueues();
  return reportQueue.add('report-gen', { reportId, userId, type }, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { count: 100 },
  });
}

async function queueWebhook(event, payload, orgId) {
  if (!webhookQueue) initQueues();
  return webhookQueue.add('webhook', { event, payload, orgId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  });
}

async function queueEmail(to, subject, template, data) {
  if (!emailQueue) initQueues();
  return emailQueue.add('send-email', { to, subject, template, data }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
  });
}

// ─── WORKERS ─────────────────────────────────────────────────────────────────
function startWorkers() {
  const connection = new Redis(REDIS_OPTS);
  const workerOpts = { connection, concurrency: 2 };

  // Worker MRV (calculs Monte Carlo)
  const mrvWorker = new Worker(MRV_QUEUE, async (job) => {
    const { projectId, userId } = job.data;
    try {
      const { MRVEngine } = require('../services/mrv.service');
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { energyReadings: true }
      });
      
      if (!project) throw new Error('Project not found: ' + projectId);
      
      const engine = new MRVEngine(project, project.energyReadings);
      const result = engine.calculate();
      
      await prisma.mRVRecord.create({
        data: {
          projectId,
          userId,
          totalEnergyMWh: result.totalEnergy || 0,
          netEmissionReductions: result.netCredits || 0,
          grossEmissionReductions: result.grossEmissions || 0,
          leakage: result.leakage || 0,
          uncertainty: result.uncertainty || 0,
          calculationMethod: 'ACM0002_v22',
          status: 'CALCULATED',
        }
      });
      
      return { success: true, projectId, credits: result.netCredits };
    } catch(e) {
      throw new Error('MRV calc failed: ' + e.message);
    }
  }, workerOpts);

  // Worker Reports (génération PDF)
  const reportWorker = new Worker(REPORT_QUEUE, async (job) => {
    const { reportId, type } = job.data;
    try {
      const { generateReport } = require('../services/pdf.service');
      await generateReport(reportId, type);
      return { success: true, reportId };
    } catch(e) {
      throw new Error('Report gen failed: ' + e.message);
    }
  }, workerOpts);

  // Worker Webhooks
  const webhookWorker = new Worker(WEBHOOK_QUEUE, async (job) => {
    const { event, payload, orgId } = job.data;
    const { dispatch } = require('../services/webhooks.service');
    await dispatch(event, payload, orgId);
    return { success: true, event };
  }, workerOpts);

  // Worker Emails
  const emailWorker = new Worker(EMAIL_QUEUE, async (job) => {
    const { to, subject, template, data } = job.data;
    const emailService = require('../services/email.service');
    await emailService.sendTemplated(to, subject, template, data);
    return { success: true, to };
  }, workerOpts);

  // Gestion erreurs workers
  [mrvWorker, reportWorker, webhookWorker, emailWorker].forEach(w => {
    w.on('failed', (job, err) => {
      console.error('[Queue]', job?.name, 'failed:', err.message);
    });
  });

  return { mrvWorker, reportWorker, webhookWorker, emailWorker };
}

async function getQueueStats() {
  if (!mrvQueue) initQueues();
  const [mrv, reports, webhooks, emails] = await Promise.all([
    mrvQueue.getJobCounts(),
    reportQueue.getJobCounts(),
    webhookQueue.getJobCounts(),
    emailQueue.getJobCounts(),
  ]);
  return { mrv, reports, webhooks, emails };
}

module.exports = {
  initQueues, startWorkers, getQueueStats,
  queueMRVCalculation, queueReportGeneration, queueWebhook, queueEmail,
};

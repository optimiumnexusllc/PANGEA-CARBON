const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const readingRoutes = require('./routes/readings');
const mrvRoutes = require('./routes/mrv');
const reportRoutes = require('./routes/reports');
const billingRoutes = require('./routes/billing');
const dashboardRoutes = require('./routes/dashboard');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const prisma = new PrismaClient();

// Stripe webhook needs raw body BEFORE express.json()
app.use('/api/billing/webhook', require('express').raw({ type: 'application/json' }));

// Middleware
app.use(helmet());
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://pangea-carbon.com',
  'https://www.pangea-carbon.com',
  ...(process.env.EXTRA_ORIGINS ? process.env.EXTRA_ORIGINS.split(',') : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin non autorisée: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
  } catch (e) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', readingRoutes);
app.use('/api/projects', mrvRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/assistant', require('./routes/assistant'));
const { checkFeature, checkPlan } = require('./middleware/tenant');
const auth = require('./middleware/auth');

// Elite modules — feature-gated
const featureGuard = (flag) => [auth, checkFeature(flag)];
app.use('/api/article6', ...featureGuard('multi_standard'), require('./routes/article6'));
app.use('/api/sdg',      ...featureGuard('multi_standard'), require('./routes/sdg'));
app.use('/api/dmrv',     ...featureGuard('multi_standard'), require('./routes/dmrv'));
app.use('/api/corsia',   ...featureGuard('multi_standard'), require('./routes/corsia'));
app.use('/api/registry', ...featureGuard('multi_standard'), require('./routes/registry'));
app.use('/api/baseline', ...featureGuard('ai_assistant'),   require('./routes/baseline'));
app.use('/api/assistant',[auth, checkFeature('ai_assistant')], require('./routes/assistant'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/optimization', require('./routes/optimization'));
app.use('/api/projection', require('./routes/projection'));
app.use('/api/benchmark', require('./routes/benchmark'));
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`PANGEA CARBON API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;

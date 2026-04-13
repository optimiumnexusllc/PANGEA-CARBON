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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
app.use('/api/article6', require('./routes/article6'));
app.use('/api/sdg', require('./routes/sdg'));
app.use('/api/dmrv', require('./routes/dmrv'));
app.use('/api/corsia', require('./routes/corsia'));
app.use('/api/registry', require('./routes/registry'));
app.use('/api/baseline', require('./routes/baseline'));
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

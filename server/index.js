'use strict';
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./src/config/database');
const { PORT, FRONTEND_URL, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, NODE_ENV } = require('./src/config/env');
const logger = require('./src/utils/logger');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const documentRoutes = require('./src/routes/documentRoutes');

// Error handler (must be last)
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true, // allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
});
app.use('/api/', limiter);

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Request Logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Incoming request');
  next();
});

// ── Health Check ─────────────────────────────────────────────────────────────
const mongoose = require('mongoose');
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
  const statusCode = dbState === 1 ? 200 : 503;

  return res.status(statusCode).json({
    success: dbState === 1,
    data: {
      status: dbState === 1 ? 'ok' : 'degraded',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Placeholder for routes owned by other developers
// Dev 1 will add: app.use('/api/applications', applicationRoutes);
// Dev 3 will add: app.use('/api/review', reviewRoutes);
// Dev 3 will add: app.use('/api/checker', checkerRoutes);
// Dev 3 will add: app.use('/api/dashboard', dashboardRoutes);
// Dev 1 will add: app.use('/api/batch', batchRoutes);
// Dev 2 will add: app.use('/api/audit', auditRoutes);

// ── Audit routes (Dev 2 owned) ────────────────────────────────────────────────
const auditRoutes = require('./src/routes/auditRoutes');
app.use('/api/audit', auditRoutes);

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
});

// ── Centralized Error Handler (MUST be last) ──────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`🚀 OnboardIQ server running on port ${PORT} (${NODE_ENV})`);
    logger.info(`📋 Health check: http://localhost:${PORT}/health`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Bootstrap failed');
  process.exit(1);
});

module.exports = app; // for testing

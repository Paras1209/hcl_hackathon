/**
 * Express Application Setup
 * Mounts core middlewares, health check, and KYC application & batch routes.
 */

const express = require('express');
const applicationRoutes = require('./routes/applicationRoutes');
const batchRoutes = require('./routes/batchRoutes');

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint (Required by CLAUDE.md)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'OnboardIQ Backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/applications', applicationRoutes);
app.use('/api/batch', batchRoutes);

module.exports = app;

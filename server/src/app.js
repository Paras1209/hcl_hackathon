/**
 * Express Application Setup
 * Mounts core middlewares, health check, and KYC application & batch routes.
 * Developer 3: Review, Checker, Dashboard routes added
 */

const express = require('express');
const cors = require('cors');
const applicationRoutes = require('./routes/applicationRoutes');
const batchRoutes = require('./routes/batchRoutes');
const reviewRoutes = require('./routes/reviewRoutes'); // Dev 3
const checkerRoutes = require('./routes/checkerRoutes'); // Dev 3
const dashboardRoutes = require('./routes/dashboardRoutes'); // Dev 3

const app = express();

// CORS middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

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
app.use('/api/review', reviewRoutes); // Dev 3: KYC Officer review endpoints
app.use('/api/checker', checkerRoutes); // Dev 3: Compliance Officer checker endpoints
app.use('/api/dashboard', dashboardRoutes); // Dev 3: Dashboard statistics endpoints

module.exports = app;

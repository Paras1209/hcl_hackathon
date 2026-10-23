/**
 * Dashboard Routes
 * Compliance Officer dashboard statistics endpoints
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3
 * Reference: case_studies.md FR-10
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// All dashboard routes require COMPLIANCE_OFFICER role
router.use(authenticate);
router.use(authorize('COMPLIANCE_OFFICER'));

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics: total, decided, by_status, STP rate, review rate, reject rate
 */
router.get('/stats', dashboardController.getStats);

/**
 * GET /api/dashboard/top-reasons
 * Get top 5 reason codes across all applications
 */
router.get('/top-reasons', dashboardController.getTopReasons);

/**
 * GET /api/dashboard/metrics
 * Get additional metrics: average review time, pending checker count, risk breakdown
 */
router.get('/metrics', dashboardController.getMetrics);

module.exports = router;

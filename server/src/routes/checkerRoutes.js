/**
 * Checker Routes
 * Compliance Officer checker endpoints
 * CRITICAL: Enforces maker≠checker validation
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3
 * Reference: case_studies.md FR-7
 */

const express = require('express');
const router = express.Router();
const checkerController = require('../controllers/checkerController');
const { authenticate, authorize } = require('../middleware/auth');

// All checker routes require COMPLIANCE_OFFICER role
router.use(authenticate);
router.use(authorize('COMPLIANCE_OFFICER'));

/**
 * GET /api/checker/queue
 * Get checker queue: applications in PENDING_CHECKER status (FIFO)
 * Shows maker's recommendation and comment
 */
router.get('/queue', checkerController.getCheckerQueue);

/**
 * GET /api/checker/:id
 * Get application details for checker review with maker's work and audit trail
 */
router.get('/:id', checkerController.getApplicationForChecker);

/**
 * POST /api/checker/:id/decide
 * Checker submits decision: APPROVE, REJECT, or SEND_BACK
 * CRITICAL: Returns 403 if same user as maker (maker-checker violation)
 */
router.post('/:id/decide', checkerController.decide);

module.exports = router;

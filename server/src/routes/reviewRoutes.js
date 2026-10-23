/**
 * Review Routes
 * KYC Officer review endpoints
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3
 * Reference: case_studies.md FR-6
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

// All review routes require KYC_OFFICER role
router.use(authenticate);
router.use(authorize('KYC_OFFICER'));

/**
 * GET /api/review/queue
 * Get review queue: applications in IN_REVIEW status sorted by risk and time
 */
router.get('/queue', reviewController.getReviewQueue);

/**
 * GET /api/review/:id
 * Get application details for review with documents and audit trail
 */
router.get('/:id', reviewController.getApplicationForReview);

/**
 * POST /api/review/:id/correct-field
 * Officer corrects an extracted field with reason
 * Triggers rules re-evaluation
 */
router.post('/:id/correct-field', reviewController.correctField);

/**
 * POST /api/review/:id/recommend
 * Officer submits recommendation: APPROVE, REJECT, or REQUEST_RESUBMISSION
 */
router.post('/:id/recommend', reviewController.recommend);

module.exports = router;

/**
 * Checker Controller
 * Handles Compliance Officer checker endpoints
 * CRITICAL: Enforces maker≠checker validation (case_studies.md FR-7, Example 11)
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3, CLAUDE.md
 */

const Application = require('../models/Application');
const Document = require('../models/Document');
const workflowService = require('../services/workflowService');
const auditService = require('../services/auditService');
const { MakerCheckerError } = require('../services/makerCheckerService');
const { z } = require('zod');
const logger = require('../utils/logger');

/**
 * GET /api/checker/queue
 * Get all applications in PENDING_CHECKER status
 * Sorted by submission time (FIFO - oldest first)
 * Shows maker's recommendation and comment
 * Reference: case_studies.md FR-7
 */
exports.getCheckerQueue = async (req, res, next) => {
  try {
    const applications = await Application.find({ status: 'PENDING_CHECKER' })
      .sort({ application_date: 1 }) // FIFO - oldest first
      .populate('maker_user_id', 'full_name email role')
      .select(
        'application_id full_name risk_category maker_recommendation maker_comment maker_user_id submitted_at application_date'
      );

    logger.info(
      { count: applications.length, checker: req.user._id },
      'Checker queue fetched'
    );

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/checker/:id
 * Get application details for checker review
 * Returns application with maker's details, documents, and full audit trail
 * Reference: case_studies.md FR-7 - "Review evidence, maker's work"
 */
exports.getApplicationForChecker = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findOne({ application_id: id }).populate(
      'maker_user_id',
      'full_name email role'
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    // Get documents
    const documents = await Document.find({ application_id: application.application_id });

    // Get audit trail
    const auditLogs = await auditService.getAuditTrail(application.application_id);

    // Log document views
    for (const doc of documents) {
      await auditService.logDocumentView({
        application_id: application.application_id,
        doc_id: doc.doc_id,
        user_id: req.user._id,
        role: req.user.role,
      });
    }

    logger.info(
      {
        application_id: id,
        checker: req.user._id,
        doc_count: documents.length,
      },
      'Application fetched for checker review'
    );

    res.json({
      success: true,
      data: {
        application,
        documents,
        audit_logs: auditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/checker/:id/decide
 * Checker decision (approve/reject/send_back)
 * CRITICAL: Enforces maker≠checker validation (HTTP 403 if same user)
 * Reference: case_studies.md FR-7, Example 11
 */
exports.decide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;

    // Validate input
    const validationSchema = z.object({
      decision: z.enum(['APPROVE', 'REJECT', 'SEND_BACK']),
      comment: z.string().min(10, 'comment must be at least 10 characters'),
    });

    const validated = validationSchema.parse({ decision, comment });

    const application = await Application.findOne({ application_id: id });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    // Process checker decision (this will throw MakerCheckerError if same user)
    const updatedApplication = await workflowService.processCheckerDecision(
      application,
      validated.decision,
      validated.comment,
      req.user
    );

    logger.info(
      {
        application_id: id,
        decision: validated.decision,
        checker: req.user._id,
      },
      'Checker decision submitted'
    );

    res.json({
      success: true,
      data: updatedApplication,
    });
  } catch (error) {
    // CRITICAL: Handle maker-checker validation error with 403
    // This is a sacred constraint per CLAUDE.md and case_studies.md FR-7
    if (error instanceof MakerCheckerError) {
      logger.warn(
        {
          application_id: req.params.id,
          user_id: req.user._id,
          error: error.message,
        },
        'Maker-checker violation attempt blocked'
      );

      return res.status(403).json({
        success: false,
        error: {
          code: 'MAKER_CHECKER_VIOLATION',
          message: error.message,
        },
      });
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors,
        },
      });
    }

    next(error);
  }
};

module.exports = exports;

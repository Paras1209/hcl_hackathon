/**
 * Review Controller
 * Handles KYC Officer review endpoints
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3, CLAUDE.md
 * Reference: case_studies.md FR-6 Review workbench
 */

const Application = require('../models/Application');
const Document = require('../models/Document');
const workflowService = require('../services/workflowService');
const auditService = require('../services/auditService');
const { z } = require('zod');
const logger = require('../utils/logger');

/**
 * GET /api/review/queue
 * Get all applications in IN_REVIEW status
 * Sorted by risk (HIGH first) then submission time (oldest first)
 * Reference: case_studies.md FR-6
 */
exports.getReviewQueue = async (req, res, next) => {
  try {
    const applications = await Application.find({ status: 'IN_REVIEW' })
      .sort({ risk_category: -1, application_date: 1 }) // HIGH > MEDIUM > LOW, oldest first
      .select(
        'application_id full_name dob risk_category reason_codes submitted_at application_date'
      )
      .populate('user_id', 'full_name email');

    logger.info(
      { count: applications.length, officer: req.user._id },
      'Review queue fetched'
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
 * GET /api/review/:id
 * Get application details for review
 * Returns application, documents with extracted fields, and audit trail
 * Reference: case_studies.md FR-6 - "document text next to the extracted fields"
 */
exports.getApplicationForReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findOne({ application_id: id });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    // Get documents with extracted fields
    const documents = await Document.find({ application_id: application.application_id });

    // Get audit trail
    const auditLogs = await auditService.getAuditTrail(application.application_id);

    // Log document view (SACRED: every view must be audited)
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
        officer: req.user._id,
        doc_count: documents.length,
      },
      'Application fetched for review'
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
 * POST /api/review/:id/correct-field
 * Officer corrects an extracted field with reason
 * Triggers rules re-evaluation
 * Reference: case_studies.md FR-6 - "field correction with reason (re-runs the rules)"
 */
exports.correctField = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { field_name, new_value, reason } = req.body;

    // Validate input
    const validationSchema = z.object({
      field_name: z.string().min(1, 'field_name is required'),
      new_value: z.string().min(1, 'new_value is required'),
      reason: z.string().min(10, 'reason must be at least 10 characters'),
    });

    const validated = validationSchema.parse({ field_name, new_value, reason });

    const application = await Application.findOne({ application_id: id });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    // Correct field using workflow service
    const result = await workflowService.correctField(
      application,
      validated.field_name,
      validated.new_value,
      validated.reason,
      req.user
    );

    logger.info(
      {
        application_id: id,
        field: validated.field_name,
        officer: req.user._id,
      },
      'Field correction submitted'
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
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

/**
 * POST /api/review/:id/recommend
 * Officer recommendation (maker)
 * Records recommendation: APPROVE, REJECT, or REQUEST_RESUBMISSION
 * Transitions application to PENDING_CHECKER or RESUBMISSION_REQUESTED
 * Reference: case_studies.md FR-6, TEAM_WORK_DISTRIBUTION.md
 */
exports.recommend = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recommendation, comment } = req.body;

    // Validate input
    const validationSchema = z.object({
      recommendation: z.enum(['APPROVE', 'REJECT', 'REQUEST_RESUBMISSION']),
      comment: z.string().min(10, 'comment must be at least 10 characters'),
    });

    const validated = validationSchema.parse({ recommendation, comment });

    const application = await Application.findOne({ application_id: id });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    // Process officer recommendation
    const updatedApplication = await workflowService.processOfficerRecommendation(
      application,
      validated.recommendation,
      validated.comment,
      req.user
    );

    logger.info(
      {
        application_id: id,
        recommendation: validated.recommendation,
        officer: req.user._id,
      },
      'Officer recommendation submitted'
    );

    res.json({
      success: true,
      data: updatedApplication,
    });
  } catch (error) {
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

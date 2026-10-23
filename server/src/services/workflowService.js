/**
 * Workflow Service
 * Orchestrates status transitions, audit logging, and account creation
 * Integration layer that connects pure logic with Dev 2's models and Dev 1's rules engine
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3
 */

// Integration with Dev 2 (Vaibhav) - Models and Audit Service
const Application = require('../models/Application');
const Document = require('../models/Document');
const auditService = require('./auditService');

// Integration with Dev 1 (Himanshu) - Rules Engine
const { evaluateApplication } = require('./rulesEngine');

// Developer 3 pure logic components
const { canTransition, isFinalStatus } = require('../modules/workflow/statusMachine');
const { validateMakerChecker, determineRouting } = require('./makerCheckerService');
const { createAccount } = require('../modules/workflow/coreBankingMock');

const logger = require('../utils/logger');

/**
 * Transition application to a new status
 * Validates transition, updates status, creates audit log
 * @param {object} application - Application document
 * @param {string} newStatus - Target status
 * @param {object} user - User object (_id, role, full_name)
 * @param {string} reason - Reason for transition
 * @returns {Promise<object>} Updated application document
 * @throws {Error} If transition is invalid or from final status
 */
async function transitionStatus(application, newStatus, user, reason = '') {
  const currentStatus = application.status;

  // Validate transition
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} -> ${newStatus}. Check statusMachine.js for valid transitions.`
    );
  }

  // Check if trying to transition from final status
  if (isFinalStatus(currentStatus)) {
    throw new Error(`Cannot transition from final status: ${currentStatus}`);
  }

  // Update status
  application.status = newStatus;

  // If final approval, create account via mock core-banking API
  if (newStatus === 'APPROVED' || newStatus === 'AUTO_APPROVED') {
    const accountDetails = await createAccount(application);
    application.customer_id = accountDetails.customer_id;
    application.account_number = accountDetails.account_number;
    application.decided_at = new Date();
  }

  // If rejection, mark decided date
  if (newStatus === 'REJECTED' || newStatus === 'AUTO_REJECTED') {
    application.decided_at = new Date();
  }

  // Save application
  await application.save();

  // Create audit log
  await auditService.logStatusChange({
    application_id: application.application_id,
    user_id: user._id,
    role: user.role,
    old_status: currentStatus,
    new_status: newStatus,
    reason,
  });

  logger.info(
    {
      application_id: application.application_id,
      transition: `${currentStatus} -> ${newStatus}`,
      user: `${user.role} (${user._id})`,
    },
    'Status transition completed'
  );

  return application;
}

/**
 * Process application after extraction and rules evaluation
 * Called after Dev 1's rules engine completes (from applicationController)
 * Determines routing based on rules output and creates account if approved
 * @param {object} application - Application document
 * @param {object} rulesResult - Rules engine output from Dev 1
 * @returns {Promise<object>} Updated application
 */
async function processAfterExtraction(application, rulesResult) {
  // Update application with rules result (from Dev 1's rules engine)
  application.decision = rulesResult.decision;
  application.reason_codes = rulesResult.reason_codes; // Already an array from rules engine
  application.name_match_score = rulesResult.name_match_score;
  application.risk_category = rulesResult.risk_category;
  application.rekyc_due_date = rulesResult.rekyc_due_date;

  // Determine routing using maker-checker service
  // Source: case_studies.md Section 6.1.2 Routing rules
  const newStatus = determineRouting(rulesResult.decision, rulesResult.risk_category);

  // Transition to new status with system user
  const systemUser = { _id: 'SYSTEM', role: 'SYSTEM', full_name: 'System' };
  const transitionReason = `Rules engine decision: ${rulesResult.decision}, Risk: ${rulesResult.risk_category}`;

  await transitionStatus(application, newStatus, systemUser, transitionReason);

  logger.info(
    {
      application_id: application.application_id,
      decision: rulesResult.decision,
      risk_category: rulesResult.risk_category,
      final_status: newStatus,
    },
    'Application routing determined'
  );

  return application;
}

/**
 * Handle officer recommendation (maker)
 * Officer reviews application and makes recommendation: APPROVE, REJECT, or REQUEST_RESUBMISSION
 * @param {object} application - Application document
 * @param {string} recommendation - 'APPROVE', 'REJECT', or 'REQUEST_RESUBMISSION'
 * @param {string} comment - Officer comment (min 10 chars per case_studies.md FR-6)
 * @param {object} officerUser - KYC Officer user object
 * @returns {Promise<object>} Updated application
 * @throws {Error} If application not in IN_REVIEW status
 */
async function processOfficerRecommendation(application, recommendation, comment, officerUser) {
  // Validate current status
  if (application.status !== 'IN_REVIEW') {
    throw new Error(
      `Application must be IN_REVIEW for recommendation, currently: ${application.status}`
    );
  }

  // Record maker details
  application.maker_user_id = officerUser._id;
  application.maker_recommendation = recommendation;
  application.maker_comment = comment;

  // Save application
  await application.save();

  // Create audit log
  await auditService.logDecision({
    application_id: application.application_id,
    user_id: officerUser._id,
    role: officerUser.role,
    decision: recommendation,
    reason_codes: comment,
  });

  logger.info(
    {
      application_id: application.application_id,
      maker_recommendation: recommendation,
      officer: officerUser._id,
    },
    'Officer recommendation recorded'
  );

  // Determine next status
  let newStatus;
  if (recommendation === 'REQUEST_RESUBMISSION') {
    // Officer requested resubmission - application goes to RESUBMISSION_REQUESTED
    newStatus = 'RESUBMISSION_REQUESTED';
    // Set resubmission deadline to 7 days from now (per case_studies.md Section 6.1.2)
    application.resubmission_deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else {
    // APPROVE or REJECT recommendation goes to PENDING_CHECKER for dual approval
    newStatus = 'PENDING_CHECKER';
  }

  await transitionStatus(
    application,
    newStatus,
    officerUser,
    `Officer recommendation: ${recommendation}`
  );

  return application;
}

/**
 * Handle checker decision
 * CRITICAL: Enforces maker≠checker validation (case_studies.md FR-7, Example 11)
 * Checker approves/rejects/sends back application from PENDING_CHECKER status
 * @param {object} application - Application document
 * @param {string} decision - 'APPROVE', 'REJECT', or 'SEND_BACK'
 * @param {string} comment - Checker comment (min 10 chars per case_studies.md FR-6)
 * @param {object} checkerUser - Compliance Officer user object
 * @returns {Promise<object>} Updated application
 * @throws {Error} If application not in PENDING_CHECKER status
 * @throws {MakerCheckerError} If same user as maker tries to check (HTTP 403)
 */
async function processCheckerDecision(application, decision, comment, checkerUser) {
  // Validate current status
  if (application.status !== 'PENDING_CHECKER') {
    throw new Error(
      `Application must be PENDING_CHECKER for decision, currently: ${application.status}`
    );
  }

  // CRITICAL: Validate maker-checker (same user gets HTTP 403)
  // This is a sacred constraint per CLAUDE.md
  validateMakerChecker(application, checkerUser._id);

  // Record checker details
  application.checker_user_id = checkerUser._id;
  application.checker_decision = decision;
  application.checker_comment = comment;

  // Save application
  await application.save();

  // Create audit log
  await auditService.logDecision({
    application_id: application.application_id,
    user_id: checkerUser._id,
    role: checkerUser.role,
    decision: decision,
    reason_codes: comment,
  });

  logger.info(
    {
      application_id: application.application_id,
      checker_decision: decision,
      checker: checkerUser._id,
      maker: application.maker_user_id,
    },
    'Checker decision recorded'
  );

  // Determine next status based on decision
  let newStatus;
  if (decision === 'APPROVE') {
    newStatus = 'APPROVED';
  } else if (decision === 'REJECT') {
    newStatus = 'REJECTED';
  } else if (decision === 'SEND_BACK') {
    // Checker sends back to review - officer can make new recommendation
    newStatus = 'IN_REVIEW';
  } else {
    throw new Error(`Invalid checker decision: ${decision}. Must be APPROVE, REJECT, or SEND_BACK`);
  }

  await transitionStatus(application, newStatus, checkerUser, `Checker decision: ${decision}`);

  return application;
}

/**
 * Handle field correction by officer (optional feature)
 * Officer corrects extracted field and triggers rules re-evaluation
 * @param {object} application - Application document
 * @param {string} fieldName - Field name to correct
 * @param {string} newValue - New field value
 * @param {string} reason - Reason for correction (min 10 chars per case_studies.md FR-6)
 * @param {object} officerUser - Officer user object
 * @returns {Promise<object>} Result object
 * @throws {Error} If field not found in documents
 */
async function correctField(application, fieldName, newValue, reason, officerUser) {
  // Find documents for this application
  const documents = await Document.find({ application_id: application.application_id });

  if (!documents.length) {
    throw new Error('No documents found for this application');
  }

  let fieldUpdated = false;
  let oldValue = null;

  // Find and update the field in documents
  for (const doc of documents) {
    if (doc.extracted_fields && Array.isArray(doc.extracted_fields)) {
      const fieldIndex = doc.extracted_fields.findIndex((f) => f.field_name === fieldName);
      if (fieldIndex !== -1) {
        oldValue = doc.extracted_fields[fieldIndex].value;

        // Update field with officer correction
        doc.extracted_fields[fieldIndex].value = newValue;
        doc.extracted_fields[fieldIndex].confidence = 1.0; // Officer correction = 100% confidence
        doc.extracted_fields[fieldIndex].source = 'OFFICER';

        await doc.save();

        // Create audit log for field correction
        await auditService.logFieldCorrection({
          application_id: application.application_id,
          user_id: officerUser._id,
          role: officerUser.role,
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          reason,
        });

        fieldUpdated = true;
        break;
      }
    }
  }

  if (!fieldUpdated) {
    throw new Error(`Field not found: ${fieldName}. Check extracted fields in documents.`);
  }

  logger.info(
    {
      application_id: application.application_id,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      officer: officerUser._id,
    },
    'Field correction recorded'
  );

  // Per case_studies.md Section 6.1.2: "the case still goes to the checker"
  // So we flag for re-evaluation but don't auto-transition
  application.needs_reevaluation = true;
  await application.save();

  return {
    success: true,
    message: 'Field corrected. Rules should be re-evaluated and case goes to checker.',
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
  };
}

module.exports = {
  transitionStatus,
  processAfterExtraction,
  processOfficerRecommendation,
  processCheckerDecision,
  correctField,
};

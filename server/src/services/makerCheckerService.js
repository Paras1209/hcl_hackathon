/**
 * Maker-Checker Service
 * Ensures dual approval for high-risk and reviewed applications
 * Source: case_studies.md Section 6.1.2 (Page 12) and FR-7
 */

class MakerCheckerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MakerCheckerError';
    this.statusCode = 403;
  }
}

/**
 * Validate that maker and checker are different users
 * CRITICAL: Same user must receive HTTP 403 (case_studies.md FR-7, Example 11)
 * @param {object} application - Application object with maker_user_id
 * @param {string|ObjectId} checkerUserId - ID of user trying to check
 * @returns {boolean} True if different users
 * @throws {MakerCheckerError} if same user tries to be both maker and checker
 */
function validateMakerChecker(application, checkerUserId) {
  // Convert to string for comparison (handles ObjectId vs string)
  const makerId = application.maker_user_id?.toString();
  const checkerId = checkerUserId.toString();
  
  if (makerId && makerId === checkerId) {
    throw new MakerCheckerError(
      'Maker and checker must be different users. You cannot approve your own recommendation.'
    );
  }
  
  return true;
}

/**
 * Check if application needs checker approval
 * According to case_studies.md Section 6.1.2:
 * - HIGH risk always needs checker
 * - Any application that went through IN_REVIEW needs checker
 * @param {object} application - Application object
 * @returns {boolean} True if needs checker approval
 */
function needsChecker(application) {
  // HIGH risk always needs checker (case_studies.md Section 6.1.2)
  if (application.risk_category === 'HIGH') {
    return true;
  }
  
  // Any application that went through IN_REVIEW needs checker
  if (application.status === 'PENDING_CHECKER') {
    return true;
  }
  
  return false;
}

/**
 * Determine routing based on decision and risk category
 * Source: case_studies.md Section 6.1.2 (Page 12)
 * - APPROVE with LOW or MEDIUM risk → AUTO_APPROVED
 * - APPROVE with HIGH risk → PENDING_CHECKER
 * - REVIEW → IN_REVIEW
 * - REJECT → AUTO_REJECTED
 * @param {string} decision - Rules engine decision: 'APPROVE', 'REVIEW', 'REJECT'
 * @param {string} riskCategory - Risk category: 'LOW', 'MEDIUM', 'HIGH'
 * @returns {string} Next status
 * @throws {Error} If decision or riskCategory is invalid
 */
function determineRouting(decision, riskCategory) {
  const validDecisions = ['APPROVE', 'REVIEW', 'REJECT'];
  const validRiskCategories = ['LOW', 'MEDIUM', 'HIGH'];
  
  if (!validDecisions.includes(decision)) {
    throw new Error(`Invalid decision: ${decision}. Must be one of: ${validDecisions.join(', ')}`);
  }
  
  if (decision !== 'REJECT' && !validRiskCategories.includes(riskCategory)) {
    throw new Error(`Invalid risk category: ${riskCategory}. Must be one of: ${validRiskCategories.join(', ')}`);
  }
  
  // REJECT always goes to AUTO_REJECTED regardless of risk
  if (decision === 'REJECT') {
    return 'AUTO_REJECTED';
  }
  
  // REVIEW always goes to IN_REVIEW
  if (decision === 'REVIEW') {
    return 'IN_REVIEW';
  }
  
  // APPROVE: LOW/MEDIUM risk → AUTO_APPROVED, HIGH risk → PENDING_CHECKER
  if (decision === 'APPROVE') {
    if (riskCategory === 'HIGH') {
      return 'PENDING_CHECKER';
    }
    // LOW or MEDIUM risk
    return 'AUTO_APPROVED';
  }
  
  // Should never reach here due to validation above
  throw new Error(`Unable to determine routing for decision: ${decision}, risk: ${riskCategory}`);
}

module.exports = {
  MakerCheckerError,
  validateMakerChecker,
  needsChecker,
  determineRouting,
};
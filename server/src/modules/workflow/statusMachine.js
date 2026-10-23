/**
 * Status Lifecycle State Machine
 * Defines all valid status transitions according to case_studies.md Section 6.1.1
 */

const STATUSES = {
  SUBMITTED: 'SUBMITTED',
  EXTRACTING: 'EXTRACTING',
  AUTO_APPROVED: 'AUTO_APPROVED',
  IN_REVIEW: 'IN_REVIEW',
  PENDING_CHECKER: 'PENDING_CHECKER',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  AUTO_REJECTED: 'AUTO_REJECTED',
  RESUBMISSION_REQUESTED: 'RESUBMISSION_REQUESTED',
  CLOSED_EXPIRED: 'CLOSED_EXPIRED',
};

/**
 * Valid transitions map
 * Key = current status, Value = array of allowed next statuses
 * Source: case_studies.md Section 6.1.1 (Page 11)
 */
const TRANSITIONS = {
  SUBMITTED: ['EXTRACTING'],
  
  EXTRACTING: [
    'AUTO_APPROVED',      // APPROVE decision + LOW/MEDIUM risk
    'AUTO_REJECTED',      // REJECT decision
    'IN_REVIEW',          // REVIEW decision
    'PENDING_CHECKER',    // APPROVE decision + HIGH risk
  ],
  
  IN_REVIEW: [
    'PENDING_CHECKER',          // Officer recommends APPROVE or REJECT
    'RESUBMISSION_REQUESTED',   // Officer requests resubmission
  ],
  
  RESUBMISSION_REQUESTED: [
    'SUBMITTED',         // Applicant resubmits within 7 days
    'CLOSED_EXPIRED',    // 7 days passed, no resubmission
  ],
  
  PENDING_CHECKER: [
    'APPROVED',          // Checker approves
    'REJECTED',          // Checker rejects
    'IN_REVIEW',         // Checker sends back to review
  ],
  
  // Final statuses (no transitions allowed)
  AUTO_APPROVED: [],
  APPROVED: [],
  REJECTED: [],
  AUTO_REJECTED: [],
  CLOSED_EXPIRED: [],
};

/**
 * Check if a status transition is valid
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Proposed new status
 * @returns {boolean} True if transition is valid
 * @throws {Error} If current or new status is invalid
 */
function canTransition(currentStatus, newStatus) {
  if (!STATUSES[currentStatus]) {
    throw new Error(`Invalid current status: ${currentStatus}. Valid statuses: ${Object.values(STATUSES).join(', ')}`);
  }
  
  if (!STATUSES[newStatus]) {
    throw new Error(`Invalid new status: ${newStatus}. Valid statuses: ${Object.values(STATUSES).join(', ')}`);
  }
  
  const allowedTransitions = TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get all possible next statuses for the current status
 * @param {string} currentStatus - Current status
 * @returns {Array<string>} Array of allowed next statuses
 * @throws {Error} If current status is invalid
 */
function getNextStatuses(currentStatus) {
  if (!STATUSES[currentStatus]) {
    throw new Error(`Invalid current status: ${currentStatus}. Valid statuses: ${Object.values(STATUSES).join(', ')}`);
  }
  
  return TRANSITIONS[currentStatus] || [];
}

/**
 * Check if status is final (no further transitions allowed)
 * @param {string} status - Status to check
 * @returns {boolean} True if status is final
 * @throws {Error} If status is invalid
 */
function isFinalStatus(status) {
  if (!STATUSES[status]) {
    throw new Error(`Invalid status: ${status}. Valid statuses: ${Object.values(STATUSES).join(', ')}`);
  }
  
  return TRANSITIONS[status] && TRANSITIONS[status].length === 0;
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  canTransition,
  getNextStatuses,
  isFinalStatus,
};
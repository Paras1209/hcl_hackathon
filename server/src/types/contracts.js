/**
 * Shared Team Contracts (Frozen)
 * Defined in docs/TEAM_WORK_DISTRIBUTION.md Section "Shared Contracts"
 * Owned by ALL developers.
 */

/**
 * Standard API Success Response Shape
 */
const SuccessResponse = {
  success: true,
  data: {},
};

/**
 * Standard API Error Response Shape
 */
const ErrorResponse = {
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable error description',
  },
};

/**
 * Rules Engine Output Contract (Dev 1 -> Dev 3 & ALL)
 */
const RulesResult = {
  decision: 'APPROVE', // 'APPROVE' | 'REVIEW' | 'REJECT'
  reason_codes: [],    // e.g. ['NAME_MISMATCH_MINOR']
  name_match_score: 1.0000, // 4 decimal places
  risk_category: 'LOW',     // 'LOW' | 'MEDIUM' | 'HIGH' | null
  rekyc_due_date: '2036-03-04', // 'YYYY-MM-DD' | null
};

/**
 * Extraction Service Output Contract (Dev 1 -> Dev 3)
 */
const ExtractionResult = {
  doc_id: 'D2000001',
  doc_type: 'PAN_CARD',
  confidence: 0.95,
  fields: [
    { field_name: 'name', value: 'RAJESH KUMAR', confidence: 0.98 },
    { field_name: 'dob', value: '1990-05-15', confidence: 0.95 },
  ],
};

/**
 * Application Status State Machine Values (Dev 2 -> ALL)
 */
const ApplicationStatus = [
  'SUBMITTED',
  'EXTRACTING',
  'AUTO_APPROVED',
  'IN_REVIEW',
  'PENDING_CHECKER',
  'APPROVED',
  'REJECTED',
  'AUTO_REJECTED',
  'RESUBMISSION_REQUESTED',
  'CLOSED_EXPIRED',
];

/**
 * Workflow Status Transition Event (Dev 3 -> Dev 2)
 */
const StatusTransition = {
  from: 'IN_REVIEW',
  to: 'PENDING_CHECKER',
  triggeredBy: 'user_id',
  reason: 'Officer recommendation: APPROVE',
};

/**
 * Email Notification Event (Dev 3 -> Dev 4)
 */
const EmailEvent = {
  type: 'APPLICATION_SUBMITTED', // 'APPLICATION_SUBMITTED' | 'DECISION_FINAL' | 'RESUBMISSION_REQUIRED'
  application_id: 'A2000001',
  recipient_email: 'user@example.com',
  data: {},
};

module.exports = {
  SuccessResponse,
  ErrorResponse,
  RulesResult,
  ExtractionResult,
  ApplicationStatus,
  StatusTransition,
  EmailEvent,
};

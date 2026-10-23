/**
 * API Response Shapes (ALL ENDPOINTS)
 * Owned by ALL developers - frozen after initial sync.
 */

/**
 * @typedef {Object} SuccessResponse
 * @property {true} success
 * @property {*} data - varies by endpoint
 */
const SuccessResponse = { success: true, data: {} };

/**
 * @typedef {Object} ErrorResponse
 * @property {false} success
 * @property {{ code: string, message: string }} error
 */
const ErrorResponse = {
  success: false,
  error: { code: 'ERROR_CODE', message: 'Human readable message' },
};

/**
 * Rules Engine Output (Dev 1 → Dev 3)
 * @typedef {Object} RulesResult
 */
const RulesResult = {
  decision: 'APPROVE | REVIEW | REJECT',
  reason_codes: ['CODE1', 'CODE2'],
  name_match_score: 0.85,
  risk_category: 'LOW | MEDIUM | HIGH',
  rekyc_due_date: '2028-10-23',
};

/**
 * Extraction Service Output (Dev 1 → Dev 3)
 * @typedef {Object} ExtractionResult
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
 * Application Status Enum (Dev 2 → ALL)
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
 * User Roles (Dev 2 → ALL)
 */
const UserRoles = ['APPLICANT', 'KYC_OFFICER', 'COMPLIANCE_OFFICER'];

/**
 * Workflow Transition (Dev 3 → Dev 2)
 * @typedef {Object} StatusTransition
 */
const StatusTransition = {
  from: 'IN_REVIEW',
  to: 'PENDING_CHECKER',
  triggeredBy: 'user_id',
  reason: 'Officer recommendation: APPROVE',
};

/**
 * Email Event (Dev 3 → Dev 4)
 * @typedef {Object} EmailEvent
 */
const EmailEvent = {
  type: 'APPLICATION_SUBMITTED | DECISION_FINAL | RESUBMISSION_REQUIRED',
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
  UserRoles,
  StatusTransition,
  EmailEvent,
};

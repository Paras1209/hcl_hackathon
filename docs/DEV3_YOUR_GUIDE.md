# Developer 3 - Workflow, Review & Checker Guide (PARAS)

## 🎯 Your Mission (3 Hours)

Build the **maker-checker workflow system**, review workbench backend, compliance checker endpoints, and dashboard aggregation. You own the business logic layer that connects rules engine (Himanshu) with the database (Vaibhav).

---

## 📂 Your Complete File Ownership

```
server/src/
  ├── services/
  │   ├── workflowService.js        ⭐ CRITICAL - YOU OWN THIS
  │   └── makerCheckerService.js    ⭐ CRITICAL - YOU OWN THIS
  ├── controllers/
  │   ├── reviewController.js       ← YOU
  │   ├── checkerController.js      ← YOU
  │   └── dashboardController.js    ← YOU
  ├── routes/
  │   ├── reviewRoutes.js           ← YOU
  │   ├── checkerRoutes.js          ← YOU
  │   └── dashboardRoutes.js        ← YOU
  ├── modules/workflow/
  │   ├── statusMachine.js          ← YOU (state transitions)
  │   ├── validation.js             ← YOU (workflow validations)
  │   └── coreBankingMock.js        ← YOU (mock API)
  └── tests/unit/
      └── workflow.test.js          ← YOU

server/src/utils/
  └── statusTransitions.js          ← YOU
```

**⚠️ NEVER TOUCH:** 
- `services/rulesEngine.js` (Himanshu)
- `services/nameMatching.js` (Himanshu)
- `models/` (Vaibhav - you can READ, but don't modify)
- `middleware/auth.js` (Vaibhav)
- `client/` (Rishabh)

**YOU CAN READ (but coordinate changes):**
- `models/Application.js` (Vaibhav) - to understand schema
- `services/auditService.js` (Vaibhav) - to create audit logs

---

## ⏱️ Your 3-Hour Timeline

### 🟢 Phase 1: Pure Logic (Hour 0:15-1:00) - 45 minutes
**NO DATABASE DEPENDENCIES - Build pure functions first**

#### Step 1: Status State Machine (20 min)
**File: `server/src/modules/workflow/statusMachine.js`**
```javascript
/**
 * Status Lifecycle State Machine
 * Defines all valid status transitions
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
  
  // Final statuses (no transitions)
  AUTO_APPROVED: [],
  APPROVED: [],
  REJECTED: [],
  AUTO_REJECTED: [],
  CLOSED_EXPIRED: [],
};

/**
 * Check if a status transition is valid
 */
function canTransition(currentStatus, newStatus) {
  if (!STATUSES[currentStatus]) {
    throw new Error(`Invalid current status: ${currentStatus}`);
  }
  
  if (!STATUSES[newStatus]) {
    throw new Error(`Invalid new status: ${newStatus}`);
  }
  
  const allowedTransitions = TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get next possible statuses
 */
function getNextStatuses(currentStatus) {
  return TRANSITIONS[currentStatus] || [];
}

/**
 * Check if status is final (no further transitions)
 */
function isFinalStatus(status) {
  return TRANSITIONS[status] && TRANSITIONS[status].length === 0;
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  canTransition,
  getNextStatuses,
  isFinalStatus,
};
```

**✅ TEST THIS NOW:**
```javascript
// Quick test in Node REPL
const { canTransition } = require('./statusMachine');

console.log(canTransition('SUBMITTED', 'EXTRACTING')); // true
console.log(canTransition('EXTRACTING', 'AUTO_APPROVED')); // true
console.log(canTransition('AUTO_APPROVED', 'IN_REVIEW')); // false (final status)
```

#### Step 2: Maker-Checker Validation (15 min)
**File: `server/src/services/makerCheckerService.js`**
```javascript
/**
 * Maker-Checker Service
 * Ensures dual approval for high-risk and reviewed applications
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
 * @throws {MakerCheckerError} if same user tries to be both
 */
function validateMakerChecker(application, checkerUserId) {
  // Convert to string for comparison (handles ObjectId vs string)
  const makerId = application.maker_user_id?.toString();
  const checkerId = checkerUserId.toString();
  
  if (makerId === checkerId) {
    throw new MakerCheckerError(
      'Maker and checker must be different users. You cannot approve your own recommendation.'
    );
  }
  
  return true;
}

/**
 * Check if application needs checker approval
 */
function needsChecker(application) {
  // HIGH risk always needs checker
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
 * Determine routing based on decision and risk
 */
function determineRouting(decision, riskCategory) {
  if (decision === 'REJECT') {
    return 'AUTO_REJECTED';
  }
  
  if (decision === 'REVIEW') {
    return 'IN_REVIEW';
  }
  
  if (decision === 'APPROVE') {
    // HIGH risk goes to checker
    if (riskCategory === 'HIGH') {
      return 'PENDING_CHECKER';
    }
    // LOW/MEDIUM auto-approved
    return 'AUTO_APPROVED';
  }
  
  throw new Error(`Unknown decision: ${decision}`);
}

module.exports = {
  MakerCheckerError,
  validateMakerChecker,
  needsChecker,
  determineRouting,
};
```

#### Step 3: Mock Core Banking API (10 min)
**File: `server/src/modules/workflow/coreBankingMock.js`**
```javascript
/**
 * Mock Core Banking API
 * Simulates account creation in the bank's core system
 */

function generateCustomerId() {
  // Format: CUST + 8 digits
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `CUST${number}`;
}

function generateAccountNumber() {
  // Format: 16 digits
  const number = Math.floor(1000000000000000 + Math.random() * 9000000000000000);
  return number.toString();
}

/**
 * Mock account creation
 * In production, this would call the real core banking API
 */
async function createAccount(application) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate account details
  const customerId = generateCustomerId();
  const accountNumber = generateAccountNumber();
  
  console.log(`[MOCK CORE BANKING] Account created for ${application.full_name}`);
  console.log(`  Customer ID: ${customerId}`);
  console.log(`  Account Number: ${accountNumber}`);
  
  // In production, this would return the actual response from core banking
  return {
    success: true,
    customer_id: customerId,
    account_number: accountNumber,
    account_type: 'SAVINGS',
    opened_date: new Date(),
  };
}

module.exports = {
  createAccount,
};
```

**✅ CHECKPOINT 1:00 - Pure logic functions ready (no DB)**

---

### 🟡 Phase 2: Workflow Service (Hour 1:00-2:00) - 60 minutes
**NOW integrate with Vaibhav's models**

#### Step 4: Workflow Service (30 min)
**File: `server/src/services/workflowService.js`**
```javascript
const Application = require('../models/Application');
const { canTransition, isFinalStatus } = require('../modules/workflow/statusMachine');
const { createAccount } = require('../modules/workflow/coreBankingMock');
const auditService = require('./auditService'); // Vaibhav's service

/**
 * Transition application to a new status
 * Validates transition, updates status, creates audit log
 */
async function transitionStatus(application, newStatus, user, reason = '') {
  const currentStatus = application.status;
  
  // Validate transition
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} -> ${newStatus}`
    );
  }
  
  // Check if trying to transition from final status
  if (isFinalStatus(currentStatus)) {
    throw new Error(`Cannot transition from final status: ${currentStatus}`);
  }
  
  // Update status
  const oldStatus = application.status;
  application.status = newStatus;
  
  // If final approval, create account
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
  
  await application.save();
  
  // Create audit log
  await auditService.logStatusChange(
    application.application_id,
    user._id,
    user.role,
    oldStatus,
    newStatus,
    reason
  );
  
  console.log(`[WORKFLOW] ${application.application_id}: ${oldStatus} -> ${newStatus}`);
  
  return application;
}

/**
 * Process application after extraction and rules evaluation
 */
async function processAfterExtraction(application, rulesResult) {
  // Update application with rules result
  application.decision = rulesResult.decision;
  application.reason_codes = rulesResult.reason_codes.join('|');
  application.name_match_score = rulesResult.name_match_score;
  application.risk_category = rulesResult.risk_category;
  application.rekyc_due_date = rulesResult.rekyc_due_date;
  
  // Determine routing
  const { determineRouting } = require('./makerCheckerService');
  const newStatus = determineRouting(rulesResult.decision, rulesResult.risk_category);
  
  // Transition to new status
  const systemUser = { _id: 'SYSTEM', role: 'SYSTEM' };
  await transitionStatus(
    application,
    newStatus,
    systemUser,
    `Rules engine decision: ${rulesResult.decision}, Risk: ${rulesResult.risk_category}`
  );
  
  return application;
}

/**
 * Handle officer recommendation
 */
async function processOfficerRecommendation(application, recommendation, comment, officerUser) {
  // Validate current status
  if (application.status !== 'IN_REVIEW') {
    throw new Error(`Application must be IN_REVIEW, currently: ${application.status}`);
  }
  
  // Record maker details
  application.maker_user_id = officerUser._id;
  application.maker_recommendation = recommendation;
  application.maker_comment = comment;
  
  await application.save();
  
  // Create audit log
  await auditService.logDecision(
    application.application_id,
    officerUser._id,
    officerUser.role,
    'MAKER_RECOMMENDATION',
    recommendation,
    comment
  );
  
  // Determine next status
  let newStatus;
  if (recommendation === 'REQUEST_RESUBMISSION') {
    newStatus = 'RESUBMISSION_REQUESTED';
  } else {
    // APPROVE or REJECT recommendation goes to checker
    newStatus = 'PENDING_CHECKER';
  }
  
  await transitionStatus(application, newStatus, officerUser, `Officer recommendation: ${recommendation}`);
  
  return application;
}

/**
 * Handle checker decision
 */
async function processCheckerDecision(application, decision, comment, checkerUser) {
  // Validate current status
  if (application.status !== 'PENDING_CHECKER') {
    throw new Error(`Application must be PENDING_CHECKER, currently: ${application.status}`);
  }
  
  // Validate maker-checker (THIS IS CRITICAL!)
  const { validateMakerChecker } = require('./makerCheckerService');
  validateMakerChecker(application, checkerUser._id);
  
  // Record checker details
  application.checker_user_id = checkerUser._id;
  application.checker_decision = decision;
  application.checker_comment = comment;
  
  await application.save();
  
  // Create audit log
  await auditService.logDecision(
    application.application_id,
    checkerUser._id,
    checkerUser.role,
    'CHECKER_DECISION',
    decision,
    comment
  );
  
  // Determine next status
  let newStatus;
  if (decision === 'APPROVE') {
    newStatus = 'APPROVED';
  } else if (decision === 'REJECT') {
    newStatus = 'REJECTED';
  } else if (decision === 'SEND_BACK') {
    newStatus = 'IN_REVIEW';
  } else {
    throw new Error(`Invalid checker decision: ${decision}`);
  }
  
  await transitionStatus(application, newStatus, checkerUser, `Checker decision: ${decision}`);
  
  return application;
}

/**
 * Handle field correction by officer
 */
async function correctField(application, fieldName, newValue, reason, officerUser) {
  // Find the document and extracted field
  const Document = require('../models/Document');
  const documents = await Document.find({ application_id: application.application_id });
  
  let fieldUpdated = false;
  
  for (const doc of documents) {
    const field = doc.extracted_fields.find(f => f.field_name === fieldName);
    if (field) {
      const oldValue = field.value;
      
      // Update field
      field.value = newValue;
      field.confidence = 1.00; // Officer correction = 100% confidence
      field.source = 'OFFICER';
      
      await doc.save();
      
      // Create audit log
      await auditService.logFieldCorrection(
        application.application_id,
        officerUser._id,
        officerUser.role,
        fieldName,
        oldValue,
        newValue,
        reason
      );
      
      fieldUpdated = true;
      console.log(`[WORKFLOW] Field corrected: ${fieldName} = ${newValue}`);
      break;
    }
  }
  
  if (!fieldUpdated) {
    throw new Error(`Field not found: ${fieldName}`);
  }
  
  // Re-run rules engine with corrected field
  // NOTE: This requires calling Himanshu's rules engine again
  // For now, just flag that re-evaluation is needed
  application.needs_reevaluation = true;
  await application.save();
  
  return { success: true, message: 'Field corrected. Rules will be re-evaluated.' };
}

module.exports = {
  transitionStatus,
  processAfterExtraction,
  processOfficerRecommendation,
  processCheckerDecision,
  correctField,
};
```

#### Step 5: Review Controller (15 min)
**File: `server/src/controllers/reviewController.js`**
```javascript
const Application = require('../models/Application');
const Document = require('../models/Document');
const workflowService = require('../services/workflowService');
const auditService = require('../services/auditService');

/**
 * GET /api/review/queue
 * Get all applications in IN_REVIEW status
 * Sorted by risk (HIGH first) then submission time
 */
exports.getReviewQueue = async (req, res, next) => {
  try {
    const applications = await Application.find({ status: 'IN_REVIEW' })
      .sort({ risk_category: -1, submitted_at: 1 }) // HIGH > MEDIUM > LOW, oldest first
      .select('application_id full_name dob risk_category reason_codes submitted_at');
    
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
 */
exports.getApplicationForReview = async (req, res, next) => {
  try {
    const application = await Application.findOne({ 
      application_id: req.params.id 
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }
    
    // Get documents with extracted fields
    const documents = await Document.find({ 
      application_id: application.application_id 
    });
    
    res.json({
      success: true,
      data: {
        application,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/review/:id/correct-field
 * Correct an extracted field
 */
exports.correctField = async (req, res, next) => {
  try {
    const { field_name, new_value, reason } = req.body;
    
    // Validate input
    if (!field_name || !new_value || !reason) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'field_name, new_value, and reason are required' },
      });
    }
    
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reason must be at least 10 characters' },
      });
    }
    
    const application = await Application.findOne({ 
      application_id: req.params.id 
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }
    
    // Correct field
    const result = await workflowService.correctField(
      application,
      field_name,
      new_value,
      reason,
      req.user
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/review/:id/recommend
 * Officer recommendation (maker)
 */
exports.recommend = async (req, res, next) => {
  try {
    const { recommendation, comment } = req.body;
    
    // Validate input
    const validRecommendations = ['APPROVE', 'REJECT', 'REQUEST_RESUBMISSION'];
    if (!validRecommendations.includes(recommendation)) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Recommendation must be one of: ${validRecommendations.join(', ')}` 
        },
      });
    }
    
    if (!comment || comment.length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Comment must be at least 10 characters' },
      });
    }
    
    const application = await Application.findOne({ 
      application_id: req.params.id 
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }
    
    // Process recommendation
    const updatedApplication = await workflowService.processOfficerRecommendation(
      application,
      recommendation,
      comment,
      req.user
    );
    
    res.json({
      success: true,
      data: updatedApplication,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
```

#### Step 6: Checker Controller (15 min)
**File: `server/src/controllers/checkerController.js`**
```javascript
const Application = require('../models/Application');
const workflowService = require('../services/workflowService');
const { MakerCheckerError } = require('../services/makerCheckerService');

/**
 * GET /api/checker/queue
 * Get all applications in PENDING_CHECKER status
 */
exports.getCheckerQueue = async (req, res, next) => {
  try {
    const applications = await Application.find({ status: 'PENDING_CHECKER' })
      .sort({ updated_at: 1 }) // Oldest first (FIFO)
      .populate('maker_user_id', 'full_name email')
      .select('application_id full_name risk_category maker_recommendation maker_comment maker_user_id updated_at');
    
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
 */
exports.getApplicationForChecker = async (req, res, next) => {
  try {
    const application = await Application.findOne({ 
      application_id: req.params.id 
    })
    .populate('maker_user_id', 'full_name email');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }
    
    // Get documents
    const Document = require('../models/Document');
    const documents = await Document.find({ 
      application_id: application.application_id 
    });
    
    // Get audit trail
    const auditService = require('../services/auditService');
    const auditLogs = await auditService.getAuditTrail(application.application_id);
    
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
 */
exports.decide = async (req, res, next) => {
  try {
    const { decision, comment } = req.body;
    
    // Validate input
    const validDecisions = ['APPROVE', 'REJECT', 'SEND_BACK'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: `Decision must be one of: ${validDecisions.join(', ')}` 
        },
      });
    }
    
    if (!comment || comment.length < 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Comment must be at least 10 characters' },
      });
    }
    
    const application = await Application.findOne({ 
      application_id: req.params.id 
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }
    
    // Process decision (THIS VALIDATES MAKER≠CHECKER!)
    const updatedApplication = await workflowService.processCheckerDecision(
      application,
      decision,
      comment,
      req.user
    );
    
    res.json({
      success: true,
      data: updatedApplication,
    });
  } catch (error) {
    // Special handling for maker-checker error (return 403)
    if (error instanceof MakerCheckerError) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'MAKER_CHECKER_VIOLATION', 
          message: error.message 
        },
      });
    }
    next(error);
  }
};

module.exports = exports;
```

**✅ CHECKPOINT 2:00 - Review & checker endpoints working**

---

### 🔴 Phase 3: Dashboard & Finalization (Hour 2:00-3:00) - 60 minutes

#### Step 7: Dashboard Controller (25 min)
**File: `server/src/controllers/dashboardController.js`**
```javascript
const Application = require('../models/Application');

/**
 * GET /api/dashboard/stats
 * Overall statistics for compliance dashboard
 */
exports.getStats = async (req, res, next) => {
  try {
    // Applications by status
    const byStatus = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Total applications
    const total = await Application.countDocuments();
    
    // Decided applications (for STP rate calculation)
    const decided = await Application.countDocuments({
      status: { $in: ['AUTO_APPROVED', 'APPROVED', 'REJECTED', 'AUTO_REJECTED'] },
    });
    
    // Auto-approved (straight-through)
    const autoApproved = await Application.countDocuments({
      status: 'AUTO_APPROVED',
    });
    
    // STP rate = auto-approved / total decided
    const stpRate = decided > 0 ? (autoApproved / decided) * 100 : 0;
    
    // Review rate
    const reviewed = await Application.countDocuments({
      status: { $in: ['IN_REVIEW', 'PENDING_CHECKER', 'APPROVED', 'REJECTED'] },
      decision: 'REVIEW',
    });
    const reviewRate = decided > 0 ? (reviewed / decided) * 100 : 0;
    
    // Reject rate
    const rejected = await Application.countDocuments({
      status: { $in: ['REJECTED', 'AUTO_REJECTED'] },
    });
    const rejectRate = decided > 0 ? (rejected / decided) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        total,
        decided,
        by_status: byStatus,
        stp_rate: stpRate.toFixed(2),
        review_rate: reviewRate.toFixed(2),
        reject_rate: rejectRate.toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/top-reasons
 * Top 5 reason codes across all applications
 */
exports.getTopReasons = async (req, res, next) => {
  try {
    const applications = await Application.find({
      reason_codes: { $exists: true, $ne: '' },
    }).select('reason_codes');
    
    // Count reason codes
    const reasonCounts = {};
    
    for (const app of applications) {
      const codes = app.reason_codes.split('|');
      for (const code of codes) {
        reasonCounts[code] = (reasonCounts[code] || 0) + 1;
      }
    }
    
    // Sort and get top 5
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));
    
    res.json({
      success: true,
      data: topReasons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/metrics
 * Additional metrics (avg time in review, pending checker count)
 */
exports.getMetrics = async (req, res, next) => {
  try {
    // Average time in review (for decided applications)
    const reviewedApps = await Application.find({
      status: { $in: ['APPROVED', 'REJECTED'] },
      submitted_at: { $exists: true },
      decided_at: { $exists: true },
    }).select('submitted_at decided_at');
    
    let avgTimeInReview = 0;
    if (reviewedApps.length > 0) {
      const totalTime = reviewedApps.reduce((sum, app) => {
        const timeDiff = new Date(app.decided_at) - new Date(app.submitted_at);
        return sum + timeDiff;
      }, 0);
      avgTimeInReview = totalTime / reviewedApps.length / (1000 * 60 * 60); // Convert to hours
    }
    
    // Pending checker count
    const pendingCheckerCount = await Application.countDocuments({
      status: 'PENDING_CHECKER',
    });
    
    // Applications by risk category
    const byRisk = await Application.aggregate([
      {
        $match: {
          risk_category: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$risk_category',
          count: { $sum: 1 },
        },
      },
    ]);
    
    res.json({
      success: true,
      data: {
        avg_time_in_review_hours: avgTimeInReview.toFixed(2),
        pending_checker_count: pendingCheckerCount,
        by_risk_category: byRisk,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
```

#### Step 8: Routes (15 min)
**File: `server/src/routes/reviewRoutes.js`**
```javascript
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require KYC_OFFICER role
router.use(authenticate);
router.use(authorize('KYC_OFFICER'));

router.get('/queue', reviewController.getReviewQueue);
router.get('/:id', reviewController.getApplicationForReview);
router.post('/:id/correct-field', reviewController.correctField);
router.post('/:id/recommend', reviewController.recommend);

module.exports = router;
```

**File: `server/src/routes/checkerRoutes.js`**
```javascript
const express = require('express');
const router = express.Router();
const checkerController = require('../controllers/checkerController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require COMPLIANCE_OFFICER role
router.use(authenticate);
router.use(authorize('COMPLIANCE_OFFICER'));

router.get('/queue', checkerController.getCheckerQueue);
router.get('/:id', checkerController.getApplicationForChecker);
router.post('/:id/decide', checkerController.decide);

module.exports = router;
```

**File: `server/src/routes/dashboardRoutes.js`**
```javascript
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require COMPLIANCE_OFFICER role
router.use(authenticate);
router.use(authorize('COMPLIANCE_OFFICER'));

router.get('/stats', dashboardController.getStats);
router.get('/top-reasons', dashboardController.getTopReasons);
router.get('/metrics', dashboardController.getMetrics);

module.exports = router;
```

#### Step 9: Register Routes in Main App (5 min)
**File: `server/src/app.js` or `server/src/index.js` (ADD THESE LINES)**
```javascript
// Your routes (add after auth routes)
const reviewRoutes = require('./routes/reviewRoutes');
const checkerRoutes = require('./routes/checkerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/review', reviewRoutes);
app.use('/api/checker', checkerRoutes);
app.use('/api/dashboard', dashboardRoutes);
```

#### Step 10: Unit Tests (15 min - OPTIONAL but recommended)
**File: `server/src/tests/unit/workflow.test.js`**
```javascript
const { describe, it, expect } = require('vitest');
const { canTransition, isFinalStatus } = require('../../modules/workflow/statusMachine');
const { validateMakerChecker, determineRouting } = require('../../services/makerCheckerService');

describe('Status Machine', () => {
  it('should allow valid transitions', () => {
    expect(canTransition('SUBMITTED', 'EXTRACTING')).toBe(true);
    expect(canTransition('EXTRACTING', 'AUTO_APPROVED')).toBe(true);
    expect(canTransition('IN_REVIEW', 'PENDING_CHECKER')).toBe(true);
  });
  
  it('should reject invalid transitions', () => {
    expect(canTransition('AUTO_APPROVED', 'IN_REVIEW')).toBe(false);
    expect(canTransition('REJECTED', 'APPROVED')).toBe(false);
  });
  
  it('should identify final statuses', () => {
    expect(isFinalStatus('APPROVED')).toBe(true);
    expect(isFinalStatus('REJECTED')).toBe(true);
    expect(isFinalStatus('IN_REVIEW')).toBe(false);
  });
});

describe('Maker-Checker', () => {
  it('should allow different users', () => {
    const application = { maker_user_id: 'user1' };
    expect(() => validateMakerChecker(application, 'user2')).not.toThrow();
  });
  
  it('should reject same user', () => {
    const application = { maker_user_id: 'user1' };
    expect(() => validateMakerChecker(application, 'user1')).toThrow('Maker and checker must be different');
  });
  
  it('should route correctly based on risk', () => {
    expect(determineRouting('APPROVE', 'HIGH')).toBe('PENDING_CHECKER');
    expect(determineRouting('APPROVE', 'LOW')).toBe('AUTO_APPROVED');
    expect(determineRouting('REJECT', 'HIGH')).toBe('AUTO_REJECTED');
    expect(determineRouting('REVIEW', 'MEDIUM')).toBe('IN_REVIEW');
  });
});
```

**✅ CHECKPOINT 3:00 - DONE! All endpoints working with maker-checker enforcement**

---

## 🎯 Your Success Criteria

At Hour 3:00, you MUST deliver:
1. ✅ Status state machine (validates all transitions)
2. ✅ Maker-checker validation (same user gets 403)
3. ✅ Review queue endpoint (sorted by risk + time)
4. ✅ Checker queue endpoint
5. ✅ Officer recommendation endpoint
6. ✅ Checker decision endpoint
7. ✅ Dashboard stats (STP rate, review rate, reject rate)
8. ✅ Mock core banking (generates customer_id + account_number)

**OPTIONAL (nice to have):**
9. ⚠️ Field correction endpoint
10. ⚠️ Top 5 reason codes
11. ⚠️ Audit trail integration
12. ⚠️ Unit tests

---

## 🔄 Integration with Other Developers

### With Himanshu (Dev 1 - Rules Engine):
**What you need from him:**
- Rules engine output format: `{ decision, reason_codes, name_match_score, risk_category, rekyc_due_date }`
- When to call: After extraction completes

**What you provide to him:**
- None directly (you consume his output)

**Integration point:**
```javascript
// In workflowService.processAfterExtraction()
const rulesEngine = require('../services/rulesEngine'); // Himanshu's service
const rulesResult = rulesEngine.evaluateApplication(application, documents, extractedFields, config, watchlists, existingCustomers);
```

### With Vaibhav (Dev 2 - Models & Auth):
**What you need from him:**
- Application model (can start at Hour 1:00)
- Document model
- Audit service
- Auth middleware (for route protection)

**What you provide to him:**
- None directly (you use his models)

**Integration point:**
```javascript
const Application = require('../models/Application'); // Vaibhav's model
const auditService = require('../services/auditService'); // Vaibhav's service
```

### With Rishabh (Dev 4 - Frontend):
**What you need from him:**
- Nothing! (Frontend consumes your APIs)

**What you provide to him:**
- All your API endpoints (he'll call them from React)
- Error responses in correct format: `{ success: false, error: { code, message } }`

**API contract:**
```javascript
// Success response
{ success: true, data: {...} }

// Error response
{ success: false, error: { code: 'ERROR_CODE', message: 'Human readable' } }
```

---

## 🚨 Emergency Fallbacks

**If behind at Hour 2:00:**
- ❌ Skip field correction endpoint
- ❌ Skip dashboard endpoints
- ✅ FOCUS: Review & checker endpoints, maker-checker validation

**If behind at Hour 2:30:**
- ❌ Skip dashboard entirely
- ❌ Skip unit tests
- ✅ FOCUS: Basic review flow + checker flow + maker≠checker validation

**If Vaibhav's models not ready:**
- Build your logic as pure functions (like in Phase 1)
- Mock the models with plain objects
- Integrate later when ready

**If integration failing:**
- Check model schemas match your expectations
- Check authentication middleware is working
- Use Postman to test endpoints independently

---

## 📝 Your Hourly Checklist

### Hour 1:00
- [ ] Status state machine works (canTransition function)
- [ ] Maker-checker validation logic done
- [ ] Mock core banking generates IDs
- [ ] Unit tests passing (optional)

### Hour 2:00
- [ ] Review queue endpoint returns applications
- [ ] Checker queue endpoint returns applications
- [ ] Officer recommendation endpoint works
- [ ] Checker decision endpoint works
- [ ] Maker≠checker returns 403 when same user

### Hour 3:00
- [ ] Dashboard stats endpoint returns metrics
- [ ] End-to-end: Submit → Review → Recommend → Checker → Approve
- [ ] Worked example 10 (HIGH risk → PENDING_CHECKER)
- [ ] Worked example 11 (same user → 403)
- [ ] All routes protected with auth middleware

---

## 🔍 Testing Your Work

### Manual Testing with Postman:

**1. Test Review Queue**
```bash
GET http://localhost:5000/api/review/queue
Headers: Cookie: <jwt_cookie>

Expected: Array of applications with status IN_REVIEW
```

**2. Test Officer Recommendation**
```bash
POST http://localhost:5000/api/review/A2000010/recommend
Headers: Cookie: <jwt_cookie_officer>
Body: {
  "recommendation": "APPROVE",
  "comment": "All documents verified, name match acceptable"
}

Expected: Application moves to PENDING_CHECKER
```

**3. Test Checker Decision (Same User - Should Fail)**
```bash
POST http://localhost:5000/api/checker/A2000010/decide
Headers: Cookie: <same_jwt_cookie_officer>
Body: {
  "decision": "APPROVE",
  "comment": "Risk assessment completed"
}

Expected: 403 Forbidden with maker-checker error
```

**4. Test Checker Decision (Different User - Should Work)**
```bash
POST http://localhost:5000/api/checker/A2000010/decide
Headers: Cookie: <jwt_cookie_compliance>
Body: {
  "decision": "APPROVE",
  "comment": "Risk assessment completed, approved"
}

Expected: Application moves to APPROVED, customer_id + account_number generated
```

**5. Test Dashboard**
```bash
GET http://localhost:5000/api/dashboard/stats
Headers: Cookie: <jwt_cookie_compliance>

Expected: { total, decided, by_status, stp_rate, review_rate, reject_rate }
```

---

## 🆘 Common Issues & Solutions

### Issue 1: "Cannot transition from X to Y"
**Cause:** Invalid status transition in state machine
**Solution:** Check TRANSITIONS map in statusMachine.js, verify the transition is allowed

### Issue 2: "Maker and checker must be different users"
**Cause:** Same user trying to be both maker and checker
**Solution:** This is CORRECT behavior! Use different user JWT for checker

### Issue 3: "Application must be IN_REVIEW"
**Cause:** Application is in wrong status for officer recommendation
**Solution:** Check application.status before calling processOfficerRecommendation

### Issue 4: "Field not found"
**Cause:** Trying to correct a field that doesn't exist in extracted_fields
**Solution:** Check document.extracted_fields array, verify field_name matches exactly

### Issue 5: Dashboard returns empty arrays
**Cause:** No applications in database yet
**Solution:** Run seed script or submit test applications first

---

## 🎯 Critical Requirements (MUST PASS)

1. **Maker-Checker Enforcement:**
   - [ ] Same user as maker cannot be checker (HTTP 403)
   - [ ] Error message clear: "Maker and checker must be different users"
   - [ ] Works for Application A2000011 (example 11)

2. **Status Lifecycle:**
   - [ ] All transitions follow state machine
   - [ ] Invalid transitions rejected with error
   - [ ] Final statuses cannot transition further

3. **HIGH Risk Routing:**
   - [ ] APPROVE + HIGH risk → PENDING_CHECKER
   - [ ] APPROVE + LOW/MEDIUM → AUTO_APPROVED
   - [ ] Works for Application A2000010 (example 10)

4. **Account Creation:**
   - [ ] APPROVED status generates customer_id + account_number
   - [ ] customer_id format: CUST + 8 digits
   - [ ] account_number format: 16 digits

5. **Dashboard Metrics:**
   - [ ] STP rate = auto_approved / decided
   - [ ] Review rate = reviewed / decided
   - [ ] Reject rate = rejected / decided
   - [ ] All percentages formatted to 2 decimals

---

## ✅ Final Checklist (Hour 2:55)

- [ ] Review queue sorted by risk (HIGH first)
- [ ] Checker queue shows maker's recommendation
- [ ] Officer can recommend APPROVE/REJECT/REQUEST_RESUBMISSION
- [ ] Checker can APPROVE/REJECT/SEND_BACK
- [ ] Maker≠checker enforced (403 error)
- [ ] Account created on final approval
- [ ] Dashboard shows STP rate, review rate, reject rate
- [ ] All routes protected with auth middleware
- [ ] Error responses in correct format
- [ ] Worked examples 10 & 11 pass

---

**Good luck, Paras! You've got this! 🚀**

**Your #1 priority:** Maker-checker validation. This is THE critical requirement that judges WILL test.

**Remember:** Your work is the bridge between rules engine (Himanshu) and the frontend (Rishabh). Keep your APIs clean and well-tested!

**Team coordination:** Sync with Vaibhav at Hour 1:00 (models ready) and test integration with Rishabh at Hour 2:00 (he'll call your APIs).

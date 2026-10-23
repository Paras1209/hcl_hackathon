# OnboardIQ - 4-Developer Parallel Work Distribution (3 Hours)

## 🎯 Core Strategy: Vertical Slices + Clear File Ownership

**Principle:** Each developer owns distinct folders/files to minimize merge conflicts. Work in vertical slices (full stack features) rather than horizontal layers.

---

## 👥 Optimized Team Distribution

### Developer 1 - Core Application Flow & Rules Engine (CRITICAL PATH)
**Name: Himanshu**
**Why this matters:** Rules engine is the heart - must be perfect. Combining with application flow reduces handoffs.

#### File Ownership:
```
server/src/
  ├── services/
  │   ├── rulesEngine.js          ⭐ CRITICAL
  │   ├── nameMatching.js         ⭐ CRITICAL
  │   ├── watchlistScreening.js
  │   └── riskCalculation.js
  ├── modules/kyc/
  │   ├── extractionService.js    (mock provider)
  │   ├── extractionProviders/
  │   │   └── mockProvider.js
  │   └── config/
  │       └── rulesConfig.js
  ├── controllers/
  │   └── applicationController.js
  ├── routes/
  │   └── applicationRoutes.js
  └── tests/unit/
      └── rulesEngine.test.js     ⭐ CRITICAL

server/src/utils/
  └── levenshtein.js
```

#### Deliverables (Priority Order):
**Hour 0:00-1:00:**
1. ✅ Name matching (Levenshtein + normalization)
2. ✅ Watchlist screening (sanctions + PEP)
3. ✅ Rules engine (R1-R17) - pure function
4. ✅ Unit tests (verify against 60 sample apps)

**Hour 1:00-2:00:**
5. ✅ Mock extraction provider
6. ✅ Application submission endpoint (`POST /api/applications`)
7. ✅ Application retrieval endpoint (`GET /api/applications/:id`)

**Hour 2:00-3:00:**
8. ✅ Integration with Dev 2's models
9. ✅ Batch processing endpoint
10. ✅ Generate decisions_output.csv

#### Key Interfaces to Expose:
```javascript
// services/rulesEngine.js
exports.evaluateApplication = (application, documents, extractedFields, config, watchlists, existingCustomers) => {
  return {
    decision: 'APPROVE' | 'REVIEW' | 'REJECT',
    reason_codes: ['CODE1', 'CODE2'],
    name_match_score: 0.8500,
    risk_category: 'LOW' | 'MEDIUM' | 'HIGH',
    rekyc_due_date: '2028-10-23'
  };
};
```

---

### Developer 2 - Auth, Models & Document Storage (FOUNDATION)
**Name: Vaibhav**
**Why this matters:** Everyone needs auth and models. Get these stable early.

#### File Ownership:
```
server/src/
  ├── models/
  │   ├── User.js
  │   ├── Application.js          ⭐ CRITICAL
  │   ├── Document.js
  │   ├── AuditLog.js
  │   ├── Watchlist.js
  │   ├── Configuration.js
  │   └── ExistingCustomer.js
  ├── middleware/
  │   ├── auth.js                 ⭐ CRITICAL
  │   ├── roleCheck.js
  │   ├── validation.js
  │   ├── errorHandler.js
  │   └── fileUpload.js
  ├── controllers/
  │   ├── authController.js
  │   └── documentController.js
  ├── routes/
  │   ├── authRoutes.js
  │   └── documentRoutes.js
  ├── services/
  │   ├── cloudinaryService.js
  │   └── auditService.js
  ├── config/
  │   ├── database.js
  │   ├── cloudinary.js
  │   └── env.js
  └── utils/
      ├── hash.js
      ├── jwt.js
      └── logger.js

server/scripts/
  └── seedDatabase.js             ⭐ CRITICAL (load watchlists, config)
```

#### Deliverables (Priority Order):
**Hour 0:00-1:00:**
1. ✅ All Mongoose models (with indexes)
2. ✅ Auth middleware (JWT verification)
3. ✅ Role-based access control middleware
4. ✅ Database connection & seed script
5. ✅ Load watchlists, occupations, config from CSVs

**Hour 1:00-2:00:**
6. ✅ Auth endpoints (register, login, logout, me)
7. ✅ Cloudinary service (upload, retrieve, delete)
8. ✅ Document upload endpoint (with file validation)
9. ✅ Document retrieval endpoint (with audit logging)
10. ✅ Audit service (append-only logging)

**Hour 2:00-3:00:**
11. ✅ Error handler middleware
12. ✅ Validation middleware (Zod schemas)
13. ✅ Rate limiting & security headers
14. ✅ Health check endpoint

#### Key Interfaces to Expose:
```javascript
// models/Application.js
const ApplicationSchema = new mongoose.Schema({
  application_id: { type: String, unique: true, required: true },
  status: { 
    type: String, 
    enum: ['SUBMITTED', 'EXTRACTING', 'AUTO_APPROVED', 'IN_REVIEW', ...],
    required: true 
  },
  // ... all fields from CLAUDE.md
});

// middleware/auth.js
exports.authenticate = async (req, res, next) => { /* JWT verify */ };
exports.authorize = (...roles) => (req, res, next) => { /* Role check */ };
```

---

### Developer 3 - Workflow, Review & Checker (BUSINESS LOGIC)
**Name: Paras (YOU)**
**Why this matters:** Maker-checker workflow is core requirement. Isolated from rules engine.

#### File Ownership:
```
server/src/
  ├── services/
  │   ├── workflowService.js      ⭐ CRITICAL
  │   └── makerCheckerService.js  ⭐ CRITICAL
  ├── controllers/
  │   ├── reviewController.js
  │   ├── checkerController.js
  │   └── dashboardController.js
  ├── routes/
  │   ├── reviewRoutes.js
  │   ├── checkerRoutes.js
  │   └── dashboardRoutes.js
  ├── modules/workflow/
  │   ├── statusMachine.js        (state transitions)
  │   ├── validation.js           (workflow validations)
  │   └── coreBankingMock.js
  └── tests/unit/
      └── workflow.test.js

server/src/utils/
  └── statusTransitions.js
```

#### Deliverables (Priority Order):
**Hour 0:00-1:00:**
1. ✅ Status lifecycle state machine (pure logic)
2. ✅ Workflow service (status transition functions)
3. ✅ Maker-checker validation logic
4. ✅ Mock core-banking API

**Hour 1:00-2:00:**
5. ✅ Review queue endpoint (`GET /api/review/queue`)
6. ✅ Get application for review (`GET /api/review/:id`)
7. ✅ Field correction endpoint (`POST /api/review/:id/correct-field`)
8. ✅ Recommendation endpoint (`POST /api/review/:id/recommend`)

**Hour 2:00-3:00:**
9. ✅ Checker queue endpoint (`GET /api/checker/queue`)
10. ✅ Checker decision endpoint (`POST /api/checker/:id/decide`)
11. ✅ Dashboard stats endpoint (`GET /api/dashboard/stats`)
12. ✅ Enforce maker≠checker (403 error)

#### Key Interfaces to Expose:
```javascript
// services/workflowService.js
exports.transitionStatus = async (application, newStatus, user) => {
  // Validate transition
  // Update status
  // Create audit log
  // Trigger notifications
};

exports.canTransition = (currentStatus, newStatus) => boolean;

// services/makerCheckerService.js
exports.validateMakerChecker = (application, checkerUserId) => {
  if (application.maker_user_id.equals(checkerUserId)) {
    throw new ForbiddenError('Maker and checker must be different users');
  }
};
```

---

### Developer 4 - Frontend + Notifications (USER EXPERIENCE)
**Name: Rishabh**
**Why this matters:** Frontend can develop in parallel with mocked APIs. Notifications complete the loop.

#### File Ownership:
```
client/                             ⭐ ENTIRE FRONTEND
  ├── src/
  │   ├── pages/
  │   │   ├── auth/
  │   │   │   ├── Login.jsx
  │   │   │   └── Register.jsx
  │   │   ├── applicant/
  │   │   │   ├── ApplicationForm.jsx    ⭐ CRITICAL
  │   │   │   ├── DocumentUpload.jsx
  │   │   │   ├── StatusTracking.jsx
  │   │   │   └── Resubmission.jsx
  │   │   ├── officer/
  │   │   │   ├── ReviewQueue.jsx
  │   │   │   └── ReviewWorkbench.jsx
  │   │   └── compliance/
  │   │       ├── CheckerQueue.jsx
  │   │       └── Dashboard.jsx
  │   ├── components/
  │   │   ├── Layout.jsx
  │   │   ├── ProtectedRoute.jsx
  │   │   ├── DocumentViewer.jsx
  │   │   ├── ExtractedFields.jsx
  │   │   └── StatusTimeline.jsx
  │   ├── api/
  │   │   ├── client.js          (axios setup)
  │   │   ├── auth.js
  │   │   ├── applications.js
  │   │   ├── review.js
  │   │   └── checker.js
  │   ├── utils/
  │   │   ├── formatters.js
  │   │   ├── validators.js
  │   │   └── reasonCodeMessages.js
  │   └── constants/
  │       ├── statuses.js
  │       └── roles.js

server/src/
  ├── services/
  │   ├── emailService.js         ⭐ YOUR BACKEND PIECE
  │   └── notificationService.js
  ├── jobs/
  │   ├── resubmissionExpiry.js
  │   └── reminderEmails.js
  └── templates/
      ├── applicationSubmitted.html
      ├── applicationApproved.html
      ├── resubmissionRequired.html
      └── applicationRejected.html

server/src/tests/integration/
  └── endToEnd.test.js             ⭐ YOUR INTEGRATION TESTS
```

#### Deliverables (Priority Order):
**Hour 0:00-1:00:**
1. ✅ Setup Vite + React + React Router
2. ✅ API client layer (axios with interceptors)
3. ✅ Auth pages (Login, Register)
4. ✅ Protected route wrapper
5. ✅ Layout & navigation (role-based)

**Hour 1:00-2:00:**
6. ✅ Application form (with Aadhaar validation!)
7. ✅ Document upload component (multi-file)
8. ✅ Status tracking page
9. ✅ Email service setup (Resend)
10. ✅ Email templates (4 critical ones)

**Hour 2:00-3:00:**
11. ✅ Review workbench (officer UI)
12. ✅ Checker queue (compliance UI)
13. ✅ Dashboard with metrics
14. ✅ Background job: resubmission expiry
15. ✅ End-to-end integration test

#### Key Interfaces to Consume:
```javascript
// client/src/api/applications.js
export const submitApplication = async (formData) => {
  // POST /api/applications with multipart/form-data
};

export const getApplication = async (id) => {
  // GET /api/applications/:id
};

// server/src/services/emailService.js
exports.sendApplicationSubmittedEmail = async (application, user) => {
  // Send via Resend
};
```

---

## 🔄 Integration Points & Contracts

### Shared Contracts (Define in Hour 0:00-0:15)

Create `server/src/types/contracts.js` (owned by ALL, frozen after 15 min):

```javascript
/**
 * API Response Shapes (ALL ENDPOINTS)
 */
exports.SuccessResponse = {
  success: true,
  data: {} // varies by endpoint
};

exports.ErrorResponse = {
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human readable message'
  }
};

/**
 * Rules Engine Output (Dev 1 → Dev 3)
 */
exports.RulesResult = {
  decision: 'APPROVE' | 'REVIEW' | 'REJECT',
  reason_codes: ['CODE1', 'CODE2'],
  name_match_score: 0.8500,
  risk_category: 'LOW' | 'MEDIUM' | 'HIGH',
  rekyc_due_date: '2028-10-23'
};

/**
 * Extraction Service Output (Dev 1 → Dev 3)
 */
exports.ExtractionResult = {
  doc_id: 'D2000001',
  doc_type: 'PAN_CARD',
  confidence: 0.95,
  fields: [
    { field_name: 'name', value: 'RAJESH KUMAR', confidence: 0.98 },
    { field_name: 'dob', value: '1990-05-15', confidence: 0.95 }
  ]
};

/**
 * Application Status (Dev 2 → ALL)
 */
exports.ApplicationStatus = [
  'SUBMITTED',
  'EXTRACTING',
  'AUTO_APPROVED',
  'IN_REVIEW',
  'PENDING_CHECKER',
  'APPROVED',
  'REJECTED',
  'AUTO_REJECTED',
  'RESUBMISSION_REQUESTED',
  'CLOSED_EXPIRED'
];

/**
 * Workflow Transition (Dev 3 → Dev 2)
 */
exports.StatusTransition = {
  from: 'IN_REVIEW',
  to: 'PENDING_CHECKER',
  triggeredBy: 'user_id',
  reason: 'Officer recommendation: APPROVE'
};

/**
 * Email Event (Dev 3 → Dev 4)
 */
exports.EmailEvent = {
  type: 'APPLICATION_SUBMITTED' | 'DECISION_FINAL' | 'RESUBMISSION_REQUIRED',
  application_id: 'A2000001',
  recipient_email: 'user@example.com',
  data: {} // varies by type
};
```

---

## ⏱️ 3-Hour Timeline (Parallel Execution)

### Hour 0:00-0:15 - TEAM SYNC (ALL TOGETHER)
- [ ] Review this document together
- [ ] Finalize contracts.js
- [ ] Create Git branches: `dev1/rules-engine`, `dev2/foundation`, `dev3/workflow`, `dev4/frontend`
- [ ] Set up Discord/Slack channel for blockers
- [ ] Agree on commit message format: `[dev1] feat: implement rule R5`

### Hour 0:15-1:00 - PARALLEL FOUNDATION
**Dev 1:** Rules engine (R1-R17) + name matching + watchlist screening
**Dev 2:** Models + auth + seed script + Cloudinary setup
**Dev 3:** Status machine + workflow service (pure logic, no DB yet)
**Dev 4:** React setup + auth pages + API client layer + email setup

**Sync at 1:00:** 
- Dev 2 shares: Models ready, auth works, seed script loads data
- Dev 1 shares: Rules engine passing unit tests
- Dev 3 shares: Workflow logic ready
- Dev 4 shares: Auth flow working with mock API

### Hour 1:00-2:00 - INTEGRATION PHASE
**Dev 1:** Application endpoints + mock extraction + integrate with Dev 2's models
**Dev 2:** Document endpoints + Cloudinary integration + audit service
**Dev 3:** Review & checker endpoints + integrate with Dev 2's models
**Dev 4:** Application form + document upload + email notifications

**Sync at 2:00:**
- Dev 1 shares: `POST /api/applications` works, calls rules engine
- Dev 2 shares: Document upload works with Cloudinary
- Dev 3 shares: Review/checker endpoints ready
- Dev 4 shares: Application form submits successfully

### Hour 2:00-3:00 - FINALIZATION
**Dev 1:** Batch processing + decisions_output.csv + fix any rules bugs
**Dev 2:** Dashboard aggregation + final security checks + rate limiting
**Dev 3:** Maker-checker enforcement + dashboard stats + mock core-banking
**Dev 4:** Review UI + checker UI + dashboard + integration tests

**Final Sync at 2:45:**
- Quick standup: What's blocking? What's working?
- Prioritize: What MUST be done vs nice-to-have
- Test end-to-end flow with sample applications

### Hour 3:00 - DEMO PREP
- [ ] Run all 60 sample applications through batch processor
- [ ] Verify decisions_output.csv matches expected
- [ ] Test worked examples 1-10 (especially 9, 10, 11)
- [ ] Record demo video (backup plan)
- [ ] Deploy frontend + backend
- [ ] Create Postman collection

---

## 🚨 Conflict Prevention Rules

### Git Workflow
```bash
# Each dev works in their branch
git checkout -b dev4/frontend
git commit -m "[dev4] feat: add application form"

# Sync main every 30 minutes (during break)
git checkout main
git pull origin main
git checkout dev4/frontend
git rebase main  # or merge main

# At hour 1:00 and 2:00, merge to main
git checkout main
git merge dev1/rules-engine --no-ff
git merge dev2/foundation --no-ff
git merge dev3/workflow --no-ff
git merge dev4/frontend --no-ff
git push origin main
```

### File Ownership (NO CONFLICTS)
| Developer | Owns | Never Touch |
|-----------|------|-------------|
| Dev 1 | `services/rules*`, `modules/kyc/`, `controllers/applicationController.js` | Other controllers, models, frontend |
| Dev 2 | `models/`, `middleware/`, `config/`, `scripts/`, `controllers/auth*`, `controllers/document*` | Services, frontend |
| Dev 3 | `services/workflow*`, `modules/workflow/`, `controllers/review*`, `controllers/checker*`, `controllers/dashboard*` | Models, rules services, frontend |
| Dev 4 | `client/`, `services/email*`, `services/notification*`, `jobs/`, `templates/`, `tests/integration/` | Backend logic files |

### Communication Protocol
**Use Discord/Slack with channels:**
- `#blockers` - "Dev 4: Need Application model schema ASAP"
- `#contracts` - "Dev 1: Rules engine returns this shape: {...}"
- `#status` - "Dev 2: Auth middleware ready, use it like this"
- `#integration` - "Dev 3: Testing my endpoints, Dev 2's models working great"

**Response time:** < 5 minutes during work hours

---

## 🎯 Critical Path Analysis

### Must Complete (3 hours):
1. ✅ Rules engine (Dev 1) - 60 applications match expected
2. ✅ Models + Auth (Dev 2) - Everyone needs this
3. ✅ Application submission (Dev 1 + Dev 2) - End-to-end flow
4. ✅ Review workflow (Dev 3) - Core requirement
5. ✅ Maker-checker (Dev 3) - Core requirement
6. ✅ Basic UI (Dev 4) - For demo

### Should Complete (if on schedule):
7. ⚠️ Email notifications (Dev 4)
8. ⚠️ Dashboard (Dev 3)
9. ⚠️ Batch processing (Dev 1)
10. ⚠️ Resubmission flow (Dev 3 + Dev 4)

### Can Skip (if behind):
11. ❌ Background jobs (Dev 4)
12. ❌ Dashboard metrics (Dev 3)
13. ❌ Field correction (Dev 3)
14. ❌ Integration tests (Dev 4)

---

## 📝 Developer 4 (YOU) - Detailed Checklist

### Hour 0:15-1:00 (45 min)
- [ ] 0:15-0:30: React setup, routing, protected routes
- [ ] 0:30-0:45: API client (axios + interceptors)
- [ ] 0:45-0:55: Login/Register pages (mock API first)
- [ ] 0:55-1:00: Test login flow, store JWT

**Deliverable:** Login → Dashboard (empty) navigation works

### Hour 1:00-2:00 (60 min)
- [ ] 1:00-1:20: Application form (ALL fields, Aadhaar last 4 only!)
- [ ] 1:20-1:40: Document upload (multi-file, type selection)
- [ ] 1:40-1:50: Status tracking page (timeline placeholder)
- [ ] 1:50-2:00: Connect to Dev 1's POST /api/applications

**Deliverable:** Submit application → see application_id returned

### Hour 2:00-3:00 (60 min)
- [ ] 2:00-2:15: Email service (Resend setup, test email)
- [ ] 2:15-2:30: 3 critical email templates (submitted, approved, rejected)
- [ ] 2:30-2:45: Review workbench UI (document viewer + fields)
- [ ] 2:45-3:00: Checker queue UI (basic)

**Fallback if behind at 2:30:** Skip checker UI, use Postman for checker demo

---

## 🔍 Testing Strategy (All Devs)

### Unit Tests (Each dev tests their own)
- **Dev 1:** Rules engine (R1-R17), name matching
- **Dev 2:** Auth middleware, validation
- **Dev 3:** Workflow state machine, maker-checker logic
- **Dev 4:** Email templates render correctly

### Integration Tests (Dev 4 at Hour 2:30)
```javascript
// tests/integration/endToEnd.test.js
describe('OnboardIQ End-to-End', () => {
  it('should approve clean application', async () => {
    // 1. Submit application (A2000001 data)
    // 2. Verify status EXTRACTING → AUTO_APPROVED
    // 3. Verify email sent
    // 4. Verify customer_id returned
  });

  it('should enforce maker-checker', async () => {
    // 1. Submit application (A2000011 data)
    // 2. Officer recommends approval (maker)
    // 3. Same officer tries to approve (checker) → 403
  });
});
```

### Manual Tests (All devs at 2:45)
- [ ] Application A2000001 → AUTO_APPROVED
- [ ] Application A2000009 → Field correction works
- [ ] Application A2000010 → HIGH risk → PENDING_CHECKER
- [ ] Application A2000011 → Maker≠checker enforced
- [ ] 12-digit Aadhaar rejected with clear message
- [ ] PAN masked in dashboard export
- [ ] Document view creates audit log

---

## 🚀 Success Criteria

**At Hour 3:00, you MUST have:**
1. ✅ 60 sample applications processed, output matches expected
2. ✅ Worked examples 1, 9, 10, 11 work correctly
3. ✅ Full flow: Submit → Review → Checker → Approved
4. ✅ Security: Aadhaar validation, maker≠checker, audit trail
5. ✅ Deployed: Frontend (Vercel) + Backend (Render)

**Nice to have:**
6. ⚠️ Email notifications working
7. ⚠️ Dashboard showing metrics
8. ⚠️ Batch CSV processing

---

## 📞 Emergency Protocol

**If Dev 1 blocked on rules engine at Hour 1:30:**
→ ALL HANDS: Dev 2 & 3 help debug, Dev 4 continues frontend with mock APIs

**If merge conflicts at Hour 2:00:**
→ DESIGNATED INTEGRATOR (choose one): Resolves conflicts, others keep working

**If behind schedule at Hour 2:00:**
→ TRIAGE MEETING (5 min): Cut scope, prioritize demo flow

**If deployment fails at Hour 2:45:**
→ BACKUP PLAN: Postman collection + local demo + screen recording

---

## ✅ Final Checklist (Hour 2:55)

- [ ] All 60 applications produce correct decisions
- [ ] Worked examples pass (especially 9, 10, 11)
- [ ] 12-digit Aadhaar rejected
- [ ] Maker≠checker enforced (403)
- [ ] Document views audited
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Health check returns 200
- [ ] Demo video recorded (backup)
- [ ] Postman collection exported

---

**Good luck, Team! You've got this! 🚀**

**Remember:** Communication is key. Over-communicate on Slack. Commit often. Test early. Have fun!

# CLAUDE.md

Project guide for AI assistants (Claude Code, Antigravity). Read this before every task.

## Context
- Hackathon project, team of 4 students, 5-hour limit.
- Judges score: architecture, choice-making, scalability, production-readiness.
- Product: OnboardIQ - Intelligent KYC Onboarding, Document Verification and Watchlist Screening with Maker-Checker
- Core entities: Application, Document, User (Applicant/KYC Officer/Compliance Officer), AuditLog, Watchlist (Sanctions, PEP), ExistingCustomer

## Stack
- Client: React + Vite (JavaScript)
- Server: Node.js + Express (JavaScript)
- Database: MongoDB (Mongoose) - for applications, documents, audit logs, configurations
- File Storage: Cloudinary (free tier: 25GB storage, 25GB bandwidth/month) - stores documents as raw text files with secure URLs
- Email: Resend (free tier: 100 emails/day) - status notifications, resubmission reminders
- Validation: Zod (strict input validation, all fields per FR-2)
- Logging: pino (request logs, audit trail)
- Auth: JWT in httpOnly cookie with role-based access control (Applicant, KYC Officer, Compliance Officer)
- Tests: Vitest + Supertest (critical path: auth, rules engine, maker-checker flow)
- Deploy: Vercel (frontend) + Render/Railway (backend)
- Background Jobs: node-cron (scheduled tasks: resubmission expiry, re-KYC reminders)

## Guiding principles
1. Simple over clever. Pick the boring, well-documented option.
2. Ship a working vertical slice first, then widen.
3. Every architectural choice must be explainable by a student in 30 seconds.
4. Do not over-engineer: no microservices, no Kafka, no Kubernetes. Modular monolith only.
5. **SACRED CONSTRAINTS (never violate these):**
   - Rules R1-R17 must be implemented EXACTLY as specified in case_studies.md Section 6.1
   - All 60 sample applications MUST match expected_decision, expected_reason_codes, expected_name_match_score
   - Only last 4 Aadhaar digits captured/stored/displayed; 12-digit input = rejection
   - Maker and checker must be different users (same user = HTTP 403)
   - Audit trail is append-only (no update/delete operations)
   - All thresholds from configuration, never hardcoded
   - Status lifecycle follows exact state machine (Section 6.1.1)
   - Documents served only to owner + officers; every view audited

## Folder structure
```
/client          React app (JavaScript)
  /src
    /pages       Applicant dashboard, KYC Officer workbench, Compliance dashboard
    /components  Application form, Document upload, Review UI, Audit viewer
    /api         API client layer (extraction, rules, decisions)
    /utils       Date formatting, name normalization, file validation
    /constants   Status codes, reason code messages, role permissions
/server
  /src
    /routes      URL -> controller wiring only
    /controllers HTTP in/out, no business logic
    /services    
      rulesEngine.js       Core KYC rules R1-R17 evaluation (pure function)
      extractionService.js Mock/AI extraction provider interface
      nameMatching.js      Levenshtein similarity, normalization
      watchlistScreening.js Sanctions & PEP list matching
      makerChecker.js      Workflow state transitions, dual approval
      auditService.js      Append-only audit trail
      cloudinaryService.js File upload/download via Cloudinary API
      emailService.js      Resend integration (status updates, reminders)
      notificationService.js Email template rendering, notification queue
    /models      Application, Document, User, AuditLog, Watchlist, Configuration
    /middlewares auth (JWT + role checks), validation, error handler, rate limit, file upload
    /utils       Levenshtein distance, date calculations, hash generation, logger
    /config      env loading, rule thresholds (from case_02_rules_config_V1.0.json)
    /data        CSV seed files (sanctions, PEP, occupations, existing customers)
    /jobs        Scheduled tasks (resubmission expiry check, re-KYC reminders)
    /templates   Email templates (HTML + text versions)
  /tests         Rules engine tests, name matching tests, end-to-end flow tests
/output          decisions_output.csv, extraction_output.csv (batch outputs)
```
Rule: routes -> controllers -> services -> models. Never skip a layer, never import upward.
Critical services: rulesEngine and makerChecker must be stateless and pure functions for testability.

## Backend conventions
- Stateless server. No in-memory session or state that breaks horizontal scaling.
- All config via environment variables, validated at startup. Rule thresholds loaded from case_02_rules_config_V1.0.json into Configuration collection.
- Every request body, query and params validated with Zod (strict formats: PAN ^[A-Z]{5}[0-9]{4}[A-Z]$, Aadhaar last 4 digits only ^[0-9]{4}$, mobile ^[6-9][0-9]{9}$, pincode ^[1-9][0-9]{5}$).
- Centralized error handler. Controllers throw, they do not format errors.
- Consistent response shape:
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- Passwords hashed with bcrypt. Auth via JWT in httpOnly cookie. Role checks in middleware (Applicant cannot access officer routes = HTTP 403).
- **Security constraints (MUST FOLLOW):**
  - Only last 4 Aadhaar digits captured, stored, and displayed. 12-digit Aadhaar input rejected with clear message (FR-2).
  - PAN masked as ZZKXXXXX4Q in lists and exports.
  - Documents served only to officers and document owner; every document view audited with user, role, timestamp, doc_id.
  - File uploads via Cloudinary: signed upload URLs, secure_url for access, SHA-256 hash stored in metadata
  - Validate file type (.txt only for hackathon), encoding (UTF-8), size (max 1MB)
  - Maker and checker MUST be different users (same user receives HTTP 403 on checker attempt).
- Add DB indexes: application_id (unique), status, risk_category, application_date.
- All list endpoints paginated. Review queue ordered by risk_category (HIGH first), then submission time.
- Middleware always on: Helmet, CORS (explicit origin), rate limiting, request logging (pino).
- `GET /health` must always exist and return 200 when server and DB are up.
- **Audit trail:** Append-only. Record status changes, decisions, field corrections (before/after), watchlist hits, document views. No update or delete operations on audit rows.
- **Email notifications (via Resend):**
  - Application submitted → confirmation email
  - Status change → notification to applicant
  - Resubmission requested → instructions + 7-day deadline
  - Day 6 of resubmission window → reminder email
  - Final decision → approval/rejection email
  - Officer assignment → notification to KYC officer
  - Checker queue → notification to compliance officer

## Frontend conventions
- Functional components and hooks only.
- API calls live in one `/client/src/api` layer, not inside components.
- Handle loading, error and empty states on every data-driven screen.
- No secrets in client code. Use `VITE_` env vars only for public values.
- **KYC-specific UI requirements:**
  - Application form: all fields validated client-side before submit; Aadhaar input limited to 4 digits with clear label ("Last 4 digits only").
  - Document upload: multi-file with declared type selection per file; show SHA-256 hash on successful upload.
  - Review workbench: side-by-side document text and extracted fields; highlight low-confidence fields (<0.80); inline field correction with reason input (min 10 chars).
  - Applicant tracking: status timeline with plain-language reasons (map reason codes to readable messages); resubmission upload (within 7 days).
  - Dashboard: cards for applications by status, STP rate, top 5 reason codes, avg time in review; date filter.
  - Never show: confidence scores to applicants, watchlist entry details to applicants, other applicants' data.

## Dependencies
- Do NOT add a package without a one-line justification and one alternative considered.
- Prefer what is already installed.
- **Required packages:**
  - bcrypt (password hashing)
  - jsonwebtoken (JWT auth)
  - zod (validation with runtime type checking)
  - pino / pino-pretty (structured logging)
  - helmet (security headers)
  - cors (CORS config)
  - express-rate-limit (rate limiting)
  - mongoose (MongoDB ODM)
  - multer (file upload handling to memory/temp)
  - cloudinary (file storage SDK)
  - crypto (built-in, for SHA-256 hashing)
  - fast-levenshtein (Levenshtein distance for name matching)
  - resend (email notifications)
  - node-cron (scheduled background jobs)
  - dotenv (environment variables)
  - vitest + supertest (testing)
  - csv-parser / papaparse (CSV parsing for data files)
  - express-async-errors (automatic async error handling)

## Environment Variables (.env)
```bash
# Server
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/onboardiq

# JWT
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRES_IN=7d

# Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CLOUDINARY_FOLDER=onboardiq-documents

# Resend (free tier: 100 emails/day, 3k emails/month)
RESEND_API_KEY=<your-resend-api-key>
FROM_EMAIL=onboarding@yourdomain.com

# Extraction Provider
EXTRACTION_PROVIDER=mock  # or 'ai' for AI track

# Core Banking API (mock)
CORE_BANKING_API_URL=http://localhost:5000/api/mock/core-banking
CORE_BANKING_API_KEY=mock-key-12345

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=1048576  # 1MB in bytes
ALLOWED_FILE_TYPES=.txt  # comma-separated

# Background Jobs
ENABLE_CRON_JOBS=true
```

**Cloudinary alternatives (all free tier):**
- **Cloudinary** (RECOMMENDED): 25GB storage, image/video transformations, CDN, simple API
- **Uploadcare**: 3GB storage, 30GB bandwidth, good for documents
- **ImageKit**: 20GB bandwidth, real-time transformations
- **Backblaze B2** + Cloudflare CDN: 10GB storage, very cheap beyond free tier

**Resend alternatives:**
- **Resend** (RECOMMENDED): 100 emails/day, modern API, great DX
- **SendGrid**: 100 emails/day, more features but complex setup
- **Mailgun**: 100 emails/day (trial), then paid
- **Brevo (Sendinblue)**: 300 emails/day, includes SMS

**Why Cloudinary + Resend:**
- Both have excellent free tiers sufficient for hackathon + demo
- Simple APIs (5 lines to upload/send)
- No credit card required for signup
- Reliable (judges won't see infrastructure issues)
- Both have generous rate limits for evaluation (100 applications)

## Core data models (Mongoose schemas)

### Application
```
{
  application_id: String (unique, e.g. A2000001),
  application_date: Date,
  user_id: ObjectId (ref User, the Applicant),
  status: Enum (SUBMITTED, EXTRACTING, AUTO_APPROVED, IN_REVIEW, PENDING_CHECKER, APPROVED, REJECTED, AUTO_REJECTED, RESUBMISSION_REQUESTED, CLOSED_EXPIRED),
  
  // Form data
  full_name, dob, gender, pan_number, aadhaar_last4, mobile, email,
  address, city, state, pincode, occupation_code, annual_income,
  
  // Computed by rules engine
  decision: Enum (APPROVE, REVIEW, REJECT),
  reason_codes: [String],
  name_match_score: Number,
  risk_category: Enum (LOW, MEDIUM, HIGH),
  rekyc_due_date: Date,
  
  // Maker-checker
  maker_user_id: ObjectId (ref User, KYC Officer who reviewed),
  maker_recommendation: String,
  maker_comment: String,
  checker_user_id: ObjectId (ref User, Compliance Officer who approved/rejected),
  checker_decision: String,
  checker_comment: String,
  
  // Timestamps
  created_at, updated_at, submitted_at, decided_at,
  
  // Core banking (on final approval)
  customer_id: String,
  account_number: String
}
```

### Document
```
{
  doc_id: String (unique, e.g. D2000001),
  application_id: String (ref Application),
  file_name: String (e.g. D2000001.txt),
  
  // Cloudinary storage
  cloudinary_public_id: String (e.g. onboardiq-documents/D2000001),
  cloudinary_secure_url: String (HTTPS URL with access control),
  cloudinary_resource_type: String ('raw' for text files),
  file_hash: String (SHA-256 of original content),
  file_size: Number (bytes),
  
  declared_doc_type: Enum (PAN_CARD, AADHAAR_CARD, ELECTRICITY_BILL, BANK_STATEMENT, DRIVING_LICENCE),
  
  // Extracted by extraction service
  classified_doc_type: Enum (same + OTHER),
  doc_type_confidence: Number,
  extracted_fields: [{
    field_name: String,
    value: String,
    confidence: Number,
    source: Enum (EXTRACTION, OFFICER) // OFFICER if corrected
  }],
  
  uploaded_at: Date,
  processed_at: Date
}
```

### User
```
{
  user_id: String (unique),
  email: String (unique),
  password_hash: String,
  role: Enum (APPLICANT, KYC_OFFICER, COMPLIANCE_OFFICER),
  full_name: String,
  created_at: Date
}
```

### AuditLog (append-only)
```
{
  audit_id: String (unique),
  application_id: String,
  user_id: ObjectId,
  role: String,
  event_type: Enum (STATUS_CHANGE, DECISION, FIELD_CORRECTION, DOCUMENT_VIEW, WATCHLIST_HIT),
  
  // Context
  old_value: String,
  new_value: String,
  reason: String,
  doc_id: String (for DOCUMENT_VIEW),
  
  timestamp: Date (indexed)
}
```

### Configuration (loaded from case_02_rules_config_V1.0.json)
```
{
  config_key: String (unique, e.g. "min_field_confidence"),
  value: Mixed (0.80, ["MR", "MRS"], etc.),
  description: String,
  updated_at: Date
}
```

### Watchlist (loaded from sanctions/PEP CSVs)
```
{
  list_type: Enum (SANCTIONS, PEP),
  list_id: String (SAN0001, PEP0001),
  name: String (indexed),
  alias: String,
  dob: Date,
  nationality: String,
  program: String,
  position: String,
  category: String
}
```

### ExistingCustomer (loaded from CSV, for duplicate detection)
```
{
  customer_id: String,
  full_name: String,
  pan_number: String (indexed),
  dob: Date
}
```

## Background Jobs (node-cron)

### Daily jobs (runs at midnight):
1. **Resubmission Expiry Check** (`jobs/resubmissionExpiry.js`)
   - Find applications in RESUBMISSION_REQUESTED status where 7 days passed
   - Update status to CLOSED_EXPIRED
   - Send final notification email
   - Record status change in audit log

2. **Re-KYC Reminder** (`jobs/rekycReminder.js`) - OPTIONAL
   - Find approved accounts where rekyc_due_date is within 30 days
   - Send reminder email to customer
   - Flag account for compliance review

3. **Day 6 Resubmission Reminder** (`jobs/resubmissionReminder.js`)
   - Find applications in RESUBMISSION_REQUESTED for 6 days
   - Send urgent reminder email (1 day left)

### Hourly jobs:
4. **Checker Queue Alert** (`jobs/checkerAlert.js`) - OPTIONAL
   - If PENDING_CHECKER items > 10 or oldest item > 24 hours
   - Email compliance officers about SLA breach

## Email Templates (Resend)

All emails include: application_id, applicant name, status, timestamp, link to dashboard

### Applicant emails:
1. **Application Submitted** - Confirmation with timeline expectations
2. **Auto Approved** - Congratulations, account details (customer_id, account_number)
3. **In Review** - "Application under review, you'll hear from us within 2 business days"
4. **Resubmission Requested** - List of issues, what documents to upload, 7-day deadline
5. **Resubmission Day 6 Reminder** - Urgent: 1 day left to resubmit
6. **Application Approved** - Congratulations, account details
7. **Application Rejected** - Reason codes with plain-language explanations
8. **Application Expired** - No resubmission received, can reapply

### Officer emails:
9. **New Review Assigned** - KYC officer notified of new REVIEW case
10. **Checker Queue Alert** - Compliance officer notified of pending approvals
11. **High-Risk Application** - Compliance officer notified immediately of HIGH risk cases

**Email service implementation:**
```javascript
// services/emailService.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html, text) {
  return await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject,
    html,
    text, // fallback
  });
}
```

**Cloudinary service implementation:**
```javascript
// services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadDocument(fileBuffer, docId) {
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  const result = await cloudinary.uploader.upload_stream(
    {
      folder: process.env.CLOUDINARY_FOLDER,
      public_id: docId,
      resource_type: 'raw',
      context: { sha256: hash },
    },
    (error, result) => {
      if (error) throw error;
      return result;
    }
  ).end(fileBuffer);
  
  return { secure_url: result.secure_url, public_id: result.public_id, hash };
}

async function getDocument(publicId) {
  return cloudinary.url(publicId, { resource_type: 'raw' });
}

async function deleteDocument(publicId) {
  return await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}
```

## Git workflow
- Branch per feature: `feat/<name>`, `fix/<name>`. Never commit straight to `main`.
- Small commits, meaningful messages (`feat: add task creation endpoint`).
- Every PR description states: what changed, why, and what alternative was considered.

## Key API Endpoints

### Authentication
- `POST /api/auth/register` - Register user (role selected)
- `POST /api/auth/login` - Login, return JWT in httpOnly cookie
- `POST /api/auth/logout` - Clear cookie
- `GET /api/auth/me` - Current user info

### Application (Applicant)
- `POST /api/applications` - Submit application + documents (multipart)
- `GET /api/applications/:id` - Get own application with status timeline
- `GET /api/applications/:id/track` - Status + plain-language reasons
- `POST /api/applications/:id/resubmit` - Upload new documents (if RESUBMISSION_REQUESTED, within 7 days)

### Documents (Applicant + Officers)
- `GET /api/documents/:doc_id` - Get document text (owner or officer only; audit logged)
- `GET /api/documents/:doc_id/extracted` - Get extracted fields with confidence

### Extraction Service (Internal)
- `POST /api/v1/documents/:doc_id/extract` - Extraction provider interface (returns doc_type + fields in long format)

### Review Workbench (KYC Officer)
- `GET /api/review/queue` - REVIEW queue (ordered by risk DESC, then submission time)
- `GET /api/review/:application_id` - Application + documents + extracted fields
- `POST /api/review/:application_id/correct-field` - Correct extracted field with reason (re-runs rules)
- `POST /api/review/:application_id/recommend` - Maker recommendation (APPROVE/REJECT/REQUEST_RESUBMISSION) + comment

### Checker (Compliance Officer)
- `GET /api/checker/queue` - PENDING_CHECKER queue
- `GET /api/checker/:application_id` - Application + maker's work + evidence
- `POST /api/checker/:application_id/decide` - Checker decision (APPROVE/REJECT/SEND_BACK) + comment (enforces maker≠checker)

### Dashboard (Compliance Officer)
- `GET /api/dashboard/stats` - Applications by status, STP rate, review/reject rates
- `GET /api/dashboard/top-reasons` - Top 5 reason codes
- `GET /api/dashboard/metrics` - Avg time in review, pending checker count

### Audit (Compliance Officer)
- `GET /api/audit/:application_id` - Full audit trail for application
- `GET /api/audit/export` - CSV export of audit logs (date filter)

### Admin / Batch (Internal)
- `POST /api/batch/process` - Batch command: process applications CSV, return decisions_output.csv
- `GET /health` - Health check (200 if server + DB up)

## How the AI should work with us
- For any architectural decision: give 3 options with tradeoffs, recommend one, and state when the recommendation would be wrong. Wait for approval before implementing.
- Explain non-obvious code choices in 1-2 lines.
- If a decision is made, remind us to log it in DECISIONS.md.
- Ask before changing folder structure, the data model, or auth.
- Prefer editing existing files over creating new ones.
- Write at least one test for each critical-path endpoint (auth, core feature).
- **KYC rules are sacred:** Never deviate from rules R1-R17 in case_studies.md Section 6.1. All thresholds must come from configuration, never hardcoded.
- **Status lifecycle:** Follow the exact state machine in Section 6.1.1. Invalid transitions are bugs.

## Application workflow (from architecture diagram)
1. **Onboard & Register:** Applicant fills KYC application form → SUBMITTED
2. **Upload Docs:** Upload 3+ text files with declared doc_type → store securely with SHA-256
3. **Extract Fields:** Call extraction service (mock or AI) → doc_type classification + field extraction with confidence
4. **Compare & Match:** Rules engine evaluates R1-R17 → name matching (Levenshtein), watchlist screening (sanctions & PEP), duplicate check
5. **Evaluate Rules (R1-R17):** Compute decision (APPROVE/REVIEW/REJECT), reason_codes, name_match_score, risk_category, rekyc_due_date
6. **Decision Branch:**
   - **AUTO_APPROVED:** APPROVE + (LOW or MEDIUM risk) → final, account opened via mock core-banking API
   - **REJECT:** Any of R4-R10 triggered → AUTO_REJECTED (final, with reasons)
   - **REVIEW:** Any of R1-R3, R11-R17 triggered → IN_REVIEW queue (KYC Officer)
7. **Officer Review (Maker):**
   - View document text vs extracted fields (low confidence highlighted)
   - Correct fields with reason (re-runs rules)
   - Recommend: APPROVE / REJECT / REQUEST_RESUBMISSION (comment ≥10 chars)
   - Goes to PENDING_CHECKER
8. **Officer Outcome:**
   - Eligible for automated approval: If officer approves + risk LOW/MEDIUM → AUTO_APPROVED
   - Req checks approval: If officer approves + risk HIGH, or any REVIEW recommendation → PENDING_CHECKER
   - Notification to user: If REQUEST_RESUBMISSION → RESUBMISSION_REQUESTED (7-day window)
9. **Compliance Officer (Checker):**
   - Review evidence, maker's work
   - Decision: APPROVE (→APPROVED, final) / REJECT (→REJECTED, final) / SEND_BACK (→IN_REVIEW)
   - **Maker-checker rule:** Same user cannot be maker and checker (HTTP 403)
10. **Final Outcomes:**
    - **APPROVED/AUTO_APPROVED:** Account opened, record final status + audit
    - **REJECTED/AUTO_REJECTED:** Record with reasons + audit
    - **CLOSED_EXPIRED:** No resubmission within 7 days (final)

**Dashboard (officer-authorized):** Applications by status, STP rate, review/reject rates, top 5 reason codes, avg time in review, pending checker count.

## Definition of done (per feature)
- Works locally and on the deployed URL.
- Input validated (both client and server), errors handled, no console.log left behind.
- Test on the critical path passes (rules engine exact match with expected_decision columns in sample CSV), lint passes.
- **KYC-specific acceptance:**
  - All 60 sample applications match expected_decision, expected_reason_codes, expected_name_match_score, expected_risk_category.
  - Batch command produces decisions_output.csv that reconciles with sample file expected columns.
  - Maker-checker: same user as maker cannot approve as checker (403 error).
  - Audit trail: every document view logged with user/role/timestamp.
  - Security: 12-digit Aadhaar rejected, PAN masked in lists, only owner/officers see documents.
  - Email notifications: confirmation sent on submission, notification on status changes.
  - Cloudinary: documents uploaded successfully, secure URLs generated, SHA-256 verified.
- README or API docs updated if behavior changed.

## Additional features (priority order for 5-hour hackathon)

### MUST HAVE (Core functionality - cannot demo without these):
1. ✅ Application form with validation (Aadhaar last 4 only)
2. ✅ Document upload (3+ files, declared types)
3. ✅ Extraction service (mock provider required)
4. ✅ Rules engine (R1-R17 exactly as specified)
5. ✅ Name matching (Levenshtein with normalization)
6. ✅ Watchlist screening (sanctions + PEP)
7. ✅ Status lifecycle (state machine with validation)
8. ✅ Maker-checker flow (different users enforced)
9. ✅ Audit trail (append-only, all events logged)
10. ✅ Role-based access control (3 roles with permissions)
11. ✅ Review workbench (document + fields side-by-side)
12. ✅ Applicant tracking (status timeline with reasons)
13. ✅ Batch processing (decisions_output.csv generation)

### SHOULD HAVE (Demo impact - judges will notice):
14. ✅ Email notifications (confirmation, decision, resubmission)
15. ✅ Cloudinary file storage (production-ready approach)
16. ✅ Dashboard (compliance officer metrics)
17. ✅ Field correction by officer (re-runs rules)
18. ✅ Resubmission flow (7-day window)
19. ✅ Background job: resubmission expiry
20. ⚠️ Risk-based routing (HIGH risk → checker, LOW/MEDIUM → auto-approve)
21. ⚠️ Configuration management (rules_config.json loaded to DB)
22. ⚠️ Mock core-banking API (returns customer_id + account_number)

### NICE TO HAVE (Bonus points if time permits):
23. ⚠️ AI extraction provider (Full Stack AI Engineer track)
24. ⚠️ Day 6 resubmission reminder email
25. ⚠️ Checker queue SLA alerts
26. ⚠️ Re-KYC reminders (30 days before due)
27. ⚠️ Officer assignment notifications
28. ⚠️ Document download (for officers)
29. ⚠️ Audit trail CSV export
30. ⚠️ Search/filter on review queue
31. ⚠️ Pagination on all lists
32. ⚠️ Dark mode (UI polish)
33. ⚠️ Mobile responsive design
34. ⚠️ Prompt injection test (eval set document)
35. ⚠️ Confidence calibration report (AI track)
36. ⚠️ LLM reviewer summary (AI track)

### OUT OF SCOPE (explicitly not included):
- Image/PDF upload (case study provides text files)
- Real OCR (use provided extraction mock)
- Multi-language support (English only)
- User registration flow (seed users in DB)
- Password reset via email
- Two-factor authentication
- Export to Excel/PDF (CSV only)
- Advanced analytics (BI dashboards)
- Webhooks for external systems
- GraphQL API (REST only)
- Real-time collaboration (multiple officers on same case)

## Testing checklist (before demo)

### Functional tests:
- [ ] All 60 sample applications produce expected decisions
- [ ] Worked examples 1-10 (applications A2000001 to A2000010) reproduce exact outcomes
- [ ] Application A2000009: Field correction re-runs rules correctly
- [ ] Application A2000011 (example 11): Same user cannot be maker and checker (403)
- [ ] Application A2000010 (example 10): HIGH risk waits in PENDING_CHECKER
- [ ] 12-digit Aadhaar rejected with clear error message
- [ ] PAN format validation (4th character must be 'P')
- [ ] Name matching: example 4 shows score 0.7647
- [ ] Sanctions match: example 6 shows SAN0002
- [ ] PEP match: example 7 shows PEP0001
- [ ] Document type mismatch detected (declared vs classified)
- [ ] Low confidence fields (<0.80) trigger REVIEW
- [ ] Resubmission expires after 7 days → CLOSED_EXPIRED
- [ ] Email sent on application submission
- [ ] Email sent on final decision

### Security tests:
- [ ] Applicant cannot access /api/review endpoints (403)
- [ ] Applicant cannot view other applicants' documents (403)
- [ ] Officer cannot view documents without audit log entry
- [ ] PAN masked in dashboard export
- [ ] Only last 4 Aadhaar digits stored in database
- [ ] JWT required for all protected endpoints
- [ ] Invalid JWT returns 401
- [ ] CORS blocks requests from unauthorized origins
- [ ] Rate limiting blocks excessive requests

### Performance tests (optional):
- [ ] Batch processing: 100 eval applications in <30 seconds
- [ ] Rules engine: single application in <100ms
- [ ] Document upload: 1MB file in <2 seconds
- [ ] Dashboard loads in <1 second (with 60 applications)
- [ ] Review queue loads in <500ms

### Browser compatibility:
- [ ] Chrome (primary)
- [ ] Firefox (test if time permits)
- [ ] Edge (test if time permits)
- [ ] Mobile responsive (test on phone)

# OnboardIQ Quick Reference

## Essential Commands

### Development
```bash
# Start MongoDB
mongod --dbpath ./data/db

# Backend (development)
cd server
npm run dev  # nodemon src/index.js

# Frontend (development)
cd client
npm run dev  # Vite dev server

# Run tests
cd server
npm test  # Vitest

# Seed database
npm run seed  # Load watchlists, occupations, config
```

### Deployment
```bash
# Backend (Render/Railway)
npm start  # node src/index.js

# Frontend (Vercel)
npm run build  # Vite build
```

## Key Endpoints

### Authentication
```bash
POST /api/auth/register
{
  "email": "test@example.com",
  "password": "password123",
  "role": "APPLICANT",  # or KYC_OFFICER, COMPLIANCE_OFFICER
  "full_name": "Test User"
}

POST /api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}
# Returns: JWT in httpOnly cookie

GET /api/auth/me
# Returns: Current user info
```

### Applications
```bash
POST /api/applications
Content-Type: multipart/form-data
# Fields: all application form fields + files[]

GET /api/applications/:id
# Returns: Application with status, timeline

POST /api/applications/:id/resubmit
# Upload new documents (if RESUBMISSION_REQUESTED)
```

### Review (KYC Officer)
```bash
GET /api/review/queue
# Returns: REVIEW queue (sorted by risk, time)

POST /api/review/:id/correct-field
{
  "field_name": "pan_number",
  "new_value": "ZZKPG1234Q",
  "reason": "OCR error, corrected from document"
}

POST /api/review/:id/recommend
{
  "recommendation": "APPROVE",  # or REJECT, REQUEST_RESUBMISSION
  "comment": "All documents verified, name match acceptable"
}
```

### Checker (Compliance Officer)
```bash
GET /api/checker/queue
# Returns: PENDING_CHECKER queue

POST /api/checker/:id/decide
{
  "decision": "APPROVE",  # or REJECT, SEND_BACK
  "comment": "Risk assessment completed, approved"
}
```

### Batch Processing
```bash
POST /api/batch/process
{
  "applications_file": "case_02_applications_sample_V1.0.csv",
  "documents_file": "case_02_documents_sample_V1.0.csv",
  "extraction_file": "case_02_extraction_mock_sample_V1.0.csv"
}
# Returns: CSV output saved to /output/decisions_output.csv
```

## Data Models (Quick Reference)

### Application Status Lifecycle
```
SUBMITTED
  ↓
EXTRACTING
  ↓
  ├→ AUTO_APPROVED (APPROVE + LOW/MEDIUM risk)
  ├→ AUTO_REJECTED (REJECT)
  └→ IN_REVIEW (REVIEW)
      ↓
      ├→ RESUBMISSION_REQUESTED
      │    ↓
      │    ├→ SUBMITTED (resubmitted)
      │    └→ CLOSED_EXPIRED (7 days passed)
      └→ PENDING_CHECKER
          ↓
          ├→ APPROVED (final)
          ├→ REJECTED (final)
          └→ IN_REVIEW (sent back)
```

### Decision Logic
```
REJECT if any of R4-R10 triggered:
- R4: Age < 18
- R5: PAN invalid
- R6: PAN mismatch
- R7: DOB mismatch
- R8: Aadhaar mismatch
- R9: Name match < 0.75
- R10: Sanctions MATCH

REVIEW if any of R1-R3, R11-R17 triggered:
- R1: Document missing
- R2: Doc type mismatch
- R3: Low confidence
- R11: Name match 0.75-0.90 (minor)
- R12: Driving licence expired
- R13: Address proof stale (>90 days)
- R14: Address mismatch
- R15: Sanctions POSSIBLE match
- R16: PEP match
- R17: Duplicate customer

APPROVE otherwise (no rules triggered)
```

### Risk Category Calculation
```
HIGH if:
- PEP_MATCH triggered
- SANCTIONS_POSSIBLE_MATCH triggered
- Occupation risk_level = HIGH

MEDIUM if:
- Occupation risk_level = MEDIUM
- Annual income ≥ ₹25,00,000

LOW otherwise
```

## Configuration Parameters

### Rule Thresholds (case_02_rules_config_V1.0.json)
```json
{
  "min_field_confidence": 0.80,
  "name_match_threshold_pass": 0.90,
  "name_match_threshold_reject": 0.75,
  "watchlist_match_threshold": 0.90,
  "watchlist_possible_threshold": 0.80,
  "min_age_years": 18,
  "pan_pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$",
  "pan_holder_type_char": "P",
  "address_proof_max_age_days": 90,
  "title_tokens_remove": ["MR", "MRS", "MS", "MISS", "DR", "SHRI", "SMT", "KUMARI"],
  "medium_risk_income_threshold": 2500000,
  "rekyc_period_high_years": 2,
  "rekyc_period_medium_years": 8,
  "rekyc_period_low_years": 10,
  "resubmission_window_days": 7,
  "checker_sla_hours": 24
}
```

## Name Matching Algorithm

### Normalization Steps
1. Convert to uppercase
2. Replace "." and "-" with space
3. Remove all characters except A-Z and space
4. Remove title tokens (MR, MRS, MS, MISS, DR, SHRI, SMT, KUMARI)
5. Collapse multiple spaces to single space
6. Sort tokens alphabetically
7. Join with single space

### Example
```
Input:  "Mr. Rajesh-Kumar Sharma"
Step 1: "MR. RAJESH-KUMAR SHARMA"
Step 2: "MR  RAJESH KUMAR SHARMA"
Step 3: "MR  RAJESH KUMAR SHARMA"
Step 4: "RAJESH KUMAR SHARMA"
Step 5: "RAJESH KUMAR SHARMA"
Step 6: "KUMAR RAJESH SHARMA"
Step 7: "KUMAR RAJESH SHARMA"
```

### Similarity Calculation
```javascript
const levenshtein = require('fast-levenshtein');

function similarity(str1, str2) {
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  if (norm1 === '' && norm2 === '') return 1.0;
  
  const distance = levenshtein.get(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return 1.0 - (distance / maxLength);
}

// name_match_score = lowest similarity between:
// - declared full_name vs PAN card name
// - declared full_name vs Aadhaar card name
```

## Watchlist Screening

### Sanctions Match Logic
```javascript
function screenSanctions(fullName, dob, sanctionsList) {
  const results = [];
  
  for (const entry of sanctionsList) {
    const nameSimilarity = similarity(fullName, entry.name);
    const aliasSimilarity = entry.alias ? similarity(fullName, entry.alias) : 0;
    const maxSimilarity = Math.max(nameSimilarity, aliasSimilarity);
    
    if (maxSimilarity >= 0.90) {
      if (!entry.dob || entry.dob === dob) {
        results.push({ type: 'MATCH', entry, similarity: maxSimilarity });
      } else {
        results.push({ type: 'POSSIBLE', entry, similarity: maxSimilarity });
      }
    } else if (maxSimilarity >= 0.80) {
      results.push({ type: 'POSSIBLE', entry, similarity: maxSimilarity });
    }
  }
  
  return results;
}
```

## Email Templates

### 1. Application Submitted
**Subject:** Application Received - OnboardIQ KYC

```
Dear [Applicant Name],

Your KYC application (ID: [application_id]) has been received successfully.

We're verifying your documents and will update you on the status within 2 business days.

Track your application: [FRONTEND_URL]/applications/[application_id]

Best regards,
OnboardIQ Team
```

### 2. Application Approved
**Subject:** Account Approved - Welcome to Deccan Digital Bank!

```
Dear [Applicant Name],

Great news! Your account has been approved.

Account Details:
- Customer ID: [customer_id]
- Account Number: [account_number]
- Account Type: Savings Account

You can now access all banking services through our mobile app and website.

Best regards,
Deccan Digital Bank
```

### 3. Resubmission Required
**Subject:** Additional Documents Required - Action Needed

```
Dear [Applicant Name],

We need additional information to process your application (ID: [application_id]).

Issues Identified:
[reason_codes mapped to plain language]

Please upload corrected documents within 7 days: [FRONTEND_URL]/applications/[application_id]/resubmit

Deadline: [deadline_date]

Best regards,
OnboardIQ Team
```

### 4. Application Rejected
**Subject:** Application Status Update

```
Dear [Applicant Name],

Unfortunately, we are unable to approve your application at this time.

Reason(s):
[reason_codes mapped to plain language]

You may reapply after addressing these issues.

For questions, contact support@bank.com

Best regards,
OnboardIQ Team
```

## Common Errors & Solutions

### Error: "12-digit Aadhaar not allowed"
**Cause:** User entered full Aadhaar instead of last 4 digits
**Solution:** Validation should reject with message: "Please enter only the last 4 digits of your Aadhaar"

### Error: "Maker and checker must be different users"
**Cause:** Same user trying to approve their own recommendation
**Solution:** Return HTTP 403, check in controller: `if (application.maker_user_id === req.user.id) throw new Error('...')`

### Error: "PAN format invalid"
**Cause:** PAN doesn't match pattern or 4th character is not 'P'
**Solution:** Validate: `^[A-Z]{5}[0-9]{4}[A-Z]$` and `pan[3] === 'P'`

### Error: "Document view not audited"
**Cause:** Forgot to create audit log on document fetch
**Solution:** Always call `auditService.logDocumentView(user, docId)` before serving document

### Error: "Rules engine not matching expected_decision"
**Cause:** Configuration thresholds wrong or rule logic incorrect
**Solution:** 
1. Check config loaded: `Configuration.find({})`
2. Test one rule at a time with known application
3. Compare intermediate values (name_match_score, similarities)
4. Check rule evaluation order (all rules run, no short-circuit except field availability)

## Testing with Sample Data

### Load Sample Applications
```bash
# Use batch endpoint
curl -X POST http://localhost:5000/api/batch/process \
  -F "applications=@case_02_applications_sample_V1.0.csv" \
  -F "documents=@case_02_documents_sample_V1.0.csv" \
  -F "extraction=@case_02_extraction_mock_sample_V1.0.csv"

# Check output
cat output/decisions_output.csv
```

### Verify Worked Examples
```bash
# Example 4: Name mismatch score 0.7647
# Application A2000004
# Expected: REVIEW, NAME_MISMATCH_MINOR, score 0.7647

# Example 6: Sanctions match
# Application A2000006
# Expected: REJECT, SANCTIONS_MATCH, matched SAN0002

# Example 9: Field correction
# Application A2000009
# Correct PAN field → decision changes

# Example 10: HIGH risk needs checker
# Application A2000010
# Expected: PENDING_CHECKER (not AUTO_APPROVED)

# Example 11: Maker-checker enforcement
# Application A2000011
# Same user as maker → 403 on checker attempt
```

## Performance Benchmarks

### Target Response Times
- Application submission: < 3 seconds (including extraction)
- Rules engine (single app): < 100ms
- Review queue load: < 500ms
- Dashboard load: < 1 second
- Batch processing (60 apps): < 30 seconds

### Database Indexes (Create These)
```javascript
// Applications collection
db.applications.createIndex({ application_id: 1 }, { unique: true });
db.applications.createIndex({ status: 1, risk_category: 1, submitted_at: 1 });
db.applications.createIndex({ pan_number: 1 });
db.applications.createIndex({ application_date: 1 });

// Documents collection
db.documents.createIndex({ doc_id: 1 }, { unique: true });
db.documents.createIndex({ application_id: 1 });

// Audit logs
db.audit_logs.createIndex({ application_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ user_id: 1, timestamp: -1 });

// Watchlists
db.watchlists.createIndex({ list_type: 1, name: 1 });
db.watchlists.createIndex({ list_type: 1, alias: 1 });

// Existing customers
db.existing_customers.createIndex({ pan_number: 1 }, { unique: true });
```

## Troubleshooting Checklist

Before asking for help, check:
- [ ] MongoDB running? (`mongod` or check Docker)
- [ ] .env file present with all variables?
- [ ] Cloudinary credentials correct? (test with upload)
- [ ] Resend API key valid? (test with simple email)
- [ ] Configuration loaded? (`Configuration.find({})`)
- [ ] Watchlists loaded? (`Watchlist.countDocuments()`)
- [ ] JWT secret set? (check .env)
- [ ] CORS origin correct? (match frontend URL)
- [ ] File upload size limit sufficient? (1MB = 1048576 bytes)
- [ ] All npm packages installed? (`npm install`)
- [ ] Port 5000 available? (check with `lsof -i :5000`)

## Useful Commands

### MongoDB Queries
```javascript
// Count applications by status
db.applications.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);

// Find applications stuck in EXTRACTING
db.applications.find({ 
  status: "EXTRACTING",
  submitted_at: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
});

// Get audit trail for application
db.audit_logs.find({ application_id: "A2000001" }).sort({ timestamp: 1 });

// Find high-risk pending checker
db.applications.find({ 
  status: "PENDING_CHECKER",
  risk_category: "HIGH"
});
```

### Seed Test Users
```javascript
// Create test users (run in seed script)
const users = [
  { email: 'applicant@test.com', role: 'APPLICANT', full_name: 'Test Applicant' },
  { email: 'officer@test.com', role: 'KYC_OFFICER', full_name: 'Test Officer' },
  { email: 'compliance@test.com', role: 'COMPLIANCE_OFFICER', full_name: 'Test Compliance' }
];

// All passwords: 'password123' (hashed with bcrypt)
```

---

**Pro Tips:**
1. Keep CLAUDE.md, DECISIONS.md, and case_studies.md open in separate tabs
2. Test rules engine first (most complex, most critical)
3. Use Postman collections for API testing (faster than UI)
4. Log liberally during dev (use pino), remove before demo
5. Have a working demo video as backup (screen recording)
6. Test with all 60 sample applications before claiming "done"
7. Commit often: `feat: implement rule R7 (DOB mismatch)`
8. Deploy early (don't wait until last hour)

**Remember:** The case study is the source of truth. When in doubt, refer to `docs/case_studies.md` Section 6.

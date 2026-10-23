# OnboardIQ Integration Tests

Comprehensive integration test suite for the OnboardIQ KYC Onboarding System.

## Test Structure

```
tests/integration/
├── setup.js              # Test utilities and sample data helpers
├── rulesEngine.test.js   # Rules R1-R17 evaluation tests
├── workflow.test.js      # Workflow and maker-checker tests
├── extraction.test.js    # Document extraction tests
├── api.test.js           # API endpoint tests
├── batch.test.js         # Batch processing tests
└── README.md             # This file
```

## Running Tests

```bash
# Run all integration tests
cd server
npm run test:vitest src/tests/integration

# Run specific test file
npm run test:vitest src/tests/integration/rulesEngine.test.js

# Run with coverage
npm run test:vitest -- --coverage

# Watch mode
npm run test:watch
```

## Test Coverage

### 1. Rules Engine Tests (`rulesEngine.test.js`)

Tests all 17 business rules from case_studies.md Section 6.1:

| Rule | Description | Tested Scenarios |
|------|-------------|------------------|
| R1 | Document Missing | Missing PAN, Aadhaar, or address proof |
| R2 | Document Type Mismatch | Declared type differs from classified type |
| R3 | Low Extraction Confidence | Doc type or field confidence < 0.80 |
| R4 | Age Below 18 | Applicants under 18 years old |
| R5 | PAN Invalid | Invalid PAN format or holder type |
| R6 | PAN Mismatch | PAN on card differs from declared |
| R7 | DOB Mismatch | DOB on card differs from declared |
| R8 | Aadhaar Mismatch | Aadhaar last 4 differs from declared |
| R9 | Name Mismatch | name_match_score < 0.75 |
| R10 | Sanctions Match | Sanctions list match found |
| R11 | Name Mismatch Minor | 0.75 ≤ name_match_score < 0.90 |
| R12 | Document Expired | Driving licence expired |
| R13 | Address Proof Stale | Address proof > 90 days old |
| R14 | Address Mismatch | Pincode differs from address proof |
| R15 | Sanctions Possible Match | Similar name with different DOB |
| R16 | PEP Match | PEP list match found |
| R17 | Duplicate Customer | PAN exists in existing customers |

**Worked Examples Tested:**
- E1: Clean approval (AUTO_APPROVE)
- E2: Age below 18 (AUTO_REJECT)
- E3: PAN mismatch (REJECT)
- E4: Name mismatch minor (REVIEW)
- E5: Address proof stale (REVIEW)
- E6: Sanctions match (REJECT)
- E7: PEP match (REVIEW, HIGH risk)
- E8: Document type mismatch (REVIEW)
- E9: Low extraction confidence (REVIEW)
- E10: HIGH risk approval (PENDING_CHECKER)

### 2. Workflow Tests (`workflow.test.js`)

Tests status lifecycle and maker-checker workflow:

- **Status Transitions:**
  - SUBMITTED → EXTRACTING
  - EXTRACTING → AUTO_APPROVED (LOW/MEDIUM risk)
  - EXTRACTING → AUTO_REJECTED (REJECT decision)
  - EXTRACTING → IN_REVIEW (REVIEW decision)
  - EXTRACTING → PENDING_CHECKER (HIGH risk)
  - IN_REVIEW → PENDING_CHECKER
  - IN_REVIEW → RESUBMISSION_REQUESTED
  - PENDING_CHECKER → APPROVED
  - PENDING_CHECKER → REJECTED
  - PENDING_CHECKER → IN_REVIEW (sent back)

- **Maker≠Checker Enforcement:**
  - Same user trying to maker and checker → 403
  - Different users → Approval allowed

- **Risk-Based Routing:**
  - LOW/MEDIUM risk APPROVE → AUTO_APPROVED
  - HIGH risk APPROVE → PENDING_CHECKER
  - REVIEW decision → IN_REVIEW
  - REJECT decision → AUTO_REJECTED

### 3. Extraction Tests (`extraction.test.js`)

Tests document classification and field extraction:

- **Document Classification:**
  - PAN_CARD
  - AADHAAR_CARD
  - ELECTRICITY_BILL
  - BANK_STATEMENT
  - DRIVING_LICENCE
  - OTHER (unknown documents)
  - Prompt injection detection

- **Field Extraction:**
  - PAN number, name, DOB from PAN card
  - Aadhaar last 4, name, DOB, gender from Aadhaar
  - Document date, pincode from address proofs
  - Valid until, pincode from driving licence

- **Confidence Scoring:**
  - High confidence for clear OCR
  - Lower confidence for poor quality

### 4. API Tests (`api.test.js`)

Tests API endpoints:

- **Health Check:**
  - GET /health returns service status

- **Authentication:**
  - POST /api/auth/register
  - POST /api/auth/login
  - Password validation
  - Duplicate email prevention

- **Application Submission:**
  - POST /api/applications
  - 12-digit Aadhaar rejection
  - PAN format validation
  - Minimum 3 documents requirement

- **Review Workbench:**
  - GET /api/review/queue
  - POST /api/review/recommend
  - POST /api/review/field-correction

- **Checker Endpoints:**
  - GET /api/checker/queue
  - POST /api/checker/approve
  - POST /api/checker/reject
  - POST /api/checker/send-back

- **Dashboard:**
  - GET /api/dashboard/stats
  - GET /api/dashboard/reason-codes

- **Audit Trail:**
  - Status change logging
  - Document view logging
  - Field correction logging

### 5. Batch Tests (`batch.test.js`)

Tests batch processing:

- **File Parsing:**
  - Applications CSV
  - Documents CSV
  - Document text JSONL
  - Extraction mock CSV

- **Batch Processing:**
  - Process all 60 sample applications
  - Generate decisions_output.csv
  - Match expected decisions for worked examples
  - Performance within time limit

- **Output Generation:**
  - Create output directory
  - Write CSV with correct format
  - Handle missing extraction data

## Test Data

Sample data is loaded from the `dataset/` directory:

- `case_02_applications_sample_V1.0.csv` - 60 sample applications
- `case_02_documents_sample_V1.0.csv` - 178 document records
- `case_02_document_text_sample_V1.0.jsonl` - Document OCR text
- `case_02_extraction_mock_sample_V1.0.csv` - Mock extraction output
- `case_02_sanctions_list_V1.0.csv` - Sanctions list
- `case_02_pep_list_V1.0.csv` - PEP list
- `case_02_existing_customers_V1.0.csv` - Existing customers

## Writing New Tests

1. Add test file to `tests/integration/`
2. Import test helpers from `setup.js`:
   ```javascript
   const { parseCSV, getSampleApplication, createTestDocuments } = require('./setup');
   ```
3. Use Vitest assertions:
   ```javascript
   expect(result).toBe(expected);
   expect(array).toContain(item);
   ```
4. Follow existing test patterns for consistency

## CI/CD Integration

Tests are run on every push:

```bash
# In .github/workflows/ci.yml
- name: Run Tests
  run: cd server && npm run test:vitest
```

## Troubleshooting

**Test fails with "Cannot find module"**
```bash
# Ensure dependencies are installed
cd server
npm install
```

**Test timeout**
```bash
# Increase timeout
npm run test:vitest -- --test-timeout=30000
```

**Coverage not working**
```bash
# Run with coverage flag
npm run test:vitest -- --coverage
```

## Coverage Report

Run tests with coverage to generate HTML report:

```bash
npm run test:vitest -- --coverage
```

Report will be available at `coverage/lcov-report/index.html`.

## Best Practices

1. **Test One Thing:** Each test should verify one behavior
2. **Use Descriptive Names:** `R1: Should REVIEW if PAN card is missing`
3. **Clean State:** Each test should be independent
4. **Mock Dependencies:** Use mocks for external services
5. **Test Edge Cases:** Include error handling and edge cases
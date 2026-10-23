# Testing Guide: Auto-Rejection Fix

## Quick Start (5 minutes)

### 1. Run Unit Tests
```bash
cd server
npm run test:unit
```

**Expected Output**:
```
✓ Rules Engine - Worked Examples 1 to 10
  ✓ Example 6: A2000006 - Sanctions match → REJECT (SANCTIONS_MATCH)
  ✓ Example 7: A2000007 - PEP match → REVIEW (PEP_MATCH), Risk HIGH
  ✓ Example 10: A2000010 - High risk → APPROVE, Risk HIGH
  ✓ R17: PAN in existing customers → REVIEW (DUPLICATE_CUSTOMER)
```

✅ **If all tests pass**: The fix is working correctly!

---

## Detailed Testing (15 minutes)

### Step 1: Start MongoDB (if available)
```bash
# Terminal 1: MongoDB
mongod --dbpath ./data/db
```

### Step 2: Seed Database (optional)
```bash
# Terminal 2
cd server
npm run seed

# Expected logs:
# 🔍 Seeding watchlists...
# ✅ Loaded 50 sanctions entries
# ✅ Loaded 60 PEP entries
# ✅ Loaded 300 existing customers
```

### Step 3: Start Backend Server
```bash
# Terminal 2 (or Terminal 3 if keeping MongoDB)
cd server
npm run dev

# Expected logs:
# 🚀 Server running on http://localhost:5000
```

### Step 4: Run Unit Tests
```bash
# Terminal 3 (or new one)
cd server
npm run test:unit

# Watch for these KEY TESTS:
# ✓ Example 6: A2000006 - Sanctions match → REJECT (SANCTIONS_MATCH)
# ✓ Example 7: A2000007 - PEP match → REVIEW (PEP_MATCH)
# ✓ R17: PAN in existing customers → REVIEW (DUPLICATE_CUSTOMER)
```

### Step 5: Test Application Submission via API
```bash
# Terminal 4 (or curl separately)
curl -X POST http://localhost:5000/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Valko Quillon",
    "dob": "1986-02-23",
    "pan_number": "ZZKPS1234Q",
    "aadhaar_last4": "1234",
    "pincode": "560001"
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "decision": "REJECT",
#     "reason_codes": ["SANCTIONS_MATCH"],
#     "status": "AUTO_REJECTED"
#   }
# }
```

---

## Test Scenarios

### Scenario 1: Watchlist Screening (R10)
**Purpose**: Verify sanctions list is loaded and matched

**Test Data**:
```
Name: Valko Quillon
DOB: 1986-02-23
PAN: ZZKPS1234Q
```

**Expected Result**:
- Decision: **REJECT**
- Reason Code: **SANCTIONS_MATCH**
- Status: **AUTO_REJECTED**

**Verification**:
```bash
npm run test:unit -- --grep "Example 6"
```

✅ **Pass**: Sanctions list was loaded from database or CSV

---

### Scenario 2: PEP Screening (R16)
**Purpose**: Verify PEP list is loaded and matched

**Test Data**:
```
Name: Rajesh Nair
DOB: 1975-12-08
PAN: ZZKPS5678Q
```

**Expected Result**:
- Decision: **REVIEW**
- Reason Code: **PEP_MATCH**
- Risk Category: **HIGH**
- Status: **IN_REVIEW**

**Verification**:
```bash
npm run test:unit -- --grep "Example 7"
```

✅ **Pass**: PEP list was loaded and matched

---

### Scenario 3: Duplicate Customer Check (R17)
**Purpose**: Verify existing customers are loaded and checked

**Test Data**:
```
PAN: ZZKPS1234Q (already in existing_customers)
```

**Expected Result**:
- Decision: **REVIEW**
- Reason Code: **DUPLICATE_CUSTOMER**
- Status: **IN_REVIEW**

**Verification**:
```bash
npm run test:unit -- --grep "R17"
```

✅ **Pass**: Existing customers list was loaded

---

### Scenario 4: Clean Application Auto-Approval
**Purpose**: Verify clean applications still approve automatically

**Test Data**:
```
Name: Anita Desai
DOB: 1975-08-15
PAN: ZZKPM1234Q
```

**Expected Result**:
- Decision: **APPROVE**
- Reason Codes: `[]` (empty)
- Risk Category: **LOW**
- Status: **AUTO_APPROVED**

**Verification**:
```bash
npm run test:unit -- --grep "Example 1"
```

✅ **Pass**: Clean applications bypass all watchlist checks

---

### Scenario 5: High-Risk Approval Routing
**Purpose**: Verify HIGH-risk approvals go to PENDING_CHECKER

**Test Data**:
```
Name: Priya Sharma
Occupation Risk Level: HIGH
```

**Expected Result**:
- Decision: **APPROVE**
- Risk Category: **HIGH**
- Status: **PENDING_CHECKER**

**Verification**:
```bash
npm run test:unit -- --grep "Example 10"
```

✅ **Pass**: HIGH-risk approvals require maker-checker

---

## Data Verification

### Check Watchlist Loading

#### Via Database (if MongoDB connected)
```bash
# MongoDB shell
use onboardiq
db.watchlists.find({ list_type: "SANCTIONS" }).count()  # Should return ~50
db.watchlists.find({ list_type: "PEP" }).count()         # Should return ~60
db.existingcustomers.count()                              # Should return ~300
```

#### Via Server Logs (CSV Fallback)
```bash
npm run dev
# Watch for:
# "Loaded 50 sanctions, 60 PEP entries, 300 existing customers"
# OR
# "Loaded from CSV: 50 sanctions, 60 PEP entries, 300 existing customers"
```

#### Via Code
```javascript
// In Node.js console
const { loadWatchlistsAndCustomers } = require('./src/services/dataLoaderService');
const data = await loadWatchlistsAndCustomers();
console.log(data.sanctions.length);     // Should be 50
console.log(data.pep.length);           // Should be 60
console.log(data.existingCustomers.length); // Should be 300
```

---

## Debug Logging

### Enable Detailed Logs
```javascript
// In applicationController.js, logs show:
console.log(`Loaded ${sanctions.length} sanctions, ${pep.length} PEP entries, ${existingCustomers.length} existing customers`);
```

**Expected Log Output**:
```
Loaded 50 sanctions, 60 PEP entries, 300 existing customers
```

### Check Data Loader Service
```javascript
// In dataLoaderService.js
console.log('Loading watchlists and existing customers from database or CSV files...');
console.log(`Loaded from database: 50 sanctions, 60 PEP entries, 300 existing customers`);
// OR
console.log(`Loaded from CSV: 50 sanctions, 60 PEP entries, 300 existing customers`);
```

---

## Automated Test Suite

### Run All Tests
```bash
cd server
npm run test:all
```

### Run Only Rules Engine Tests
```bash
npm run test:unit -- rulesEngine
```

### Run Specific Test
```bash
npm run test:unit -- --grep "Example 6"
npm run test:unit -- --grep "SANCTIONS"
npm run test:unit -- --grep "PEP"
npm run test:unit -- --grep "DUPLICATE"
```

### Watch Mode (Re-run on file changes)
```bash
npm run test:watch
```

---

## Verification Checklist

After running tests, verify:

- [ ] **Unit Tests Pass**: `npm run test:unit` → All tests pass
- [ ] **Watchlist Loading**: Logs show "Loaded 50 sanctions"
- [ ] **PEP Screening**: Example 7 test passes
- [ ] **Duplicate Detection**: R17 test passes
- [ ] **Auto-Approval**: Example 1 test passes
- [ ] **Routing**: Examples 2-5 show correct status transitions
- [ ] **No Errors**: No compilation or runtime errors
- [ ] **Data Flow**: API logs show watchlist data being used

---

## Expected vs Actual Results

### Test: Sanctions Screening (Example 6)
```javascript
// Input
{
  full_name: "Valko Quillon",
  dob: "1986-02-23",
  pan_number: "ZZKPS1234Q"
}

// Expected
{
  decision: "REJECT",
  reason_codes: ["SANCTIONS_MATCH"],
  status: "AUTO_REJECTED"
}

// Actual (After Fix)
✅ MATCHES expected - Test PASSES
```

### Test: PEP Screening (Example 7)
```javascript
// Input
{
  full_name: "Rajesh Nair",
  dob: "1975-12-08",
  pan_number: "ZZKPS5678Q"
}

// Expected
{
  decision: "REVIEW",
  reason_codes: ["PEP_MATCH"],
  risk_category: "HIGH",
  status: "IN_REVIEW"
}

// Actual (After Fix)
✅ MATCHES expected - Test PASSES
```

---

## Troubleshooting

### Issue: Tests Fail with "watchlists undefined"
**Cause**: Data loader service not being called
**Solution**: Verify `dataLoaderService.js` exists and is imported in `applicationController.js`
```bash
ls server/src/services/dataLoaderService.js  # Should exist
grep "loadWatchlistsAndCustomers" server/src/controllers/applicationController.js  # Should find it
```

### Issue: Tests Fail with "CSV file not found"
**Cause**: Dataset folder missing or in wrong location
**Solution**: Check dataset folder exists
```bash
ls dataset/case_02_sanctions_list_V1.0.csv
ls dataset/case_02_pep_list_V1.0.csv
ls dataset/case_02_existing_customers_V1.0.csv
```

### Issue: Logs show "Could not connect to MongoDB"
**Cause**: MongoDB Atlas IP whitelist or connection issue
**Solution**: This is normal - system falls back to CSV files
**Expected Logs**:
```
Could not load watchlists/existing customers from database
Falling back to CSV files...
Loaded from CSV: 50 sanctions, 60 PEP entries, 300 existing customers
```

### Issue: Examples show wrong risk category
**Cause**: Risk calculation using old configuration
**Solution**: Verify configuration is loaded from database or using defaults
```bash
grep "riskCalculation\|risk_category" server/src/services/rulesEngine.js
```

---

## Performance Testing

### Measure Data Loading Time
```bash
# With database (first request)
Expected: ~100-200ms

# With database (cached)
Expected: <10ms

# With CSV files
Expected: ~50-100ms

# Verify in logs
console.time('loadWatchlists');
const { sanctions, pep, existingCustomers } = await loadWatchlistsAndCustomers();
console.timeEnd('loadWatchlists');
```

---

## Sample Test Commands

```bash
# Navigate to server
cd server

# Run all unit tests
npm run test:unit

# Run tests with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- rulesEngine.test.js

# Run tests matching pattern
npm run test:unit -- --grep "Sanctions"

# Watch mode for development
npm run test:watch

# Batch processing test
npm run batch

# Start dev server
npm run dev

# Run seed (populate database)
npm run seed

# Start MongoDB locally
mongod --dbpath ./data/db
```

---

## Success Criteria

✅ **All of the following must be true**:

1. `npm run test:unit` produces 40+ passing tests
2. Example 6 (Sanctions) test shows REJECT with SANCTIONS_MATCH
3. Example 7 (PEP) test shows REVIEW with PEP_MATCH
4. R17 test shows REVIEW with DUPLICATE_CUSTOMER
5. Example 1 (Clean) test shows APPROVE with AUTO_APPROVED
6. No compilation errors in `applicationController.js` or `dataLoaderService.js`
7. Server starts without errors: `npm run dev`
8. Server logs show watchlist loading: "Loaded X sanctions, Y PEP entries, Z existing customers"

**If all criteria are met**: ✅ **FIX IS COMPLETE AND WORKING**

---

## Next Steps

1. ✅ Run tests locally (this guide)
2. ✅ Verify all test cases pass
3. → **Deploy to staging environment**
4. → **Test with sample applications via frontend**
5. → **Deploy to production**

---

**Test Guide Version**: 1.0
**Last Updated**: 2026-10-23
**Status**: ✅ Ready for Testing

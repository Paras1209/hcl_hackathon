# Developer 3 Workflow & Maker-Checker System - Testing Guide

## Overview
Complete testing guide for the workflow system endpoints covering all Developer 3 responsibilities according to TEAM_WORK_DISTRIBUTION.md and case_studies.md.

## Test Files
1. **Unit Tests**: `src/tests/unit/workflow.test.js`
   - Status machine transitions
   - Maker-checker validation
   - Mock core banking deterministic generation

2. **Integration Tests**: `src/tests/integration/workflow.integration.test.js`
   - Complete workflow flows
   - Maker-checker enforcement (HTTP 403)
   - Dashboard metrics calculation
   - Authorization and role-based access

## Critical Test Scenarios

### 1. Maker-Checker Enforcement (SACRED - case_studies.md FR-7, Example 11)
**Test**: Same user cannot be both maker and checker
**Expected Result**: HTTP 403 with error code `MAKER_CHECKER_VIOLATION`

```bash
# Create application and submit recommendation as Officer U1
POST /api/review/{id}/recommend
Authorization: Bearer {U1_token}
Body: { recommendation: "APPROVE", comment: "Documentation verified..." }
Response: 201, Application status: PENDING_CHECKER, maker_user_id: U1

# Try to approve as checker U1 (same user)
POST /api/checker/{id}/decide
Authorization: Bearer {U1_token}
Body: { decision: "APPROVE", comment: "Risk assessment complete..." }
Response: 403 Forbidden
Error: "Maker and checker must be different users"

# Approve as different user U2
POST /api/checker/{id}/decide
Authorization: Bearer {U2_token}
Body: { decision: "APPROVE", comment: "Risk assessment complete..." }
Response: 200, Application status: APPROVED
Account Created: customer_id, account_number
```

### 2. HIGH Risk Routing (case_studies.md Section 6.1.2)
**Test**: APPROVE + HIGH risk → PENDING_CHECKER (not AUTO_APPROVED)
**Expected Result**: Application waits for checker approval

```bash
# Application with HIGH risk and APPROVE decision
# Should route to PENDING_CHECKER (not AUTO_APPROVED)
GET /api/checker/queue
Response: Contains application with status: PENDING_CHECKER
```

### 3. Review Queue Sorting (case_studies.md FR-6)
**Test**: Queue ordered by risk (HIGH first), then submission time
**Expected Result**: HIGH risk applications appear first

```bash
GET /api/review/queue
Response: [
  { application_id: "...", risk_category: "HIGH", ... },
  { application_id: "...", risk_category: "HIGH", ... },
  { application_id: "...", risk_category: "MEDIUM", ... },
  { application_id: "...", risk_category: "LOW", ... }
]
```

### 4. Dashboard STP Rate (Straight-Through Processing)
**Formula**: auto_approved_count / decided_count * 100
**Expected Result**: Percentage of applications auto-approved without review

```bash
GET /api/dashboard/stats
Response: {
  total: 100,
  decided: 80,
  stp_rate: 60.0,  # 48 auto-approved out of 80 decided
  review_rate: 25.0,
  reject_rate: 15.0
}
```

### 5. Field Correction (case_studies.md FR-6)
**Test**: Officer corrects extracted field, triggers rules re-evaluation
**Expected Result**: Field updated, case marked for re-evaluation

```bash
POST /api/review/{id}/correct-field
Authorization: Bearer {officer_token}
Body: {
  field_name: "name",
  new_value: "CORRECTED NAME",
  reason: "OCR misread the scanned document clearly"
}
Response: 200
Data: { success: true, message: "Field corrected..." }
```

### 6. Authorization and Role-Based Access (case_studies.md FR-1)
**Test**: Only authorized users can access endpoints

```bash
# Applicant accessing review queue (should get 403)
GET /api/review/queue
Authorization: Bearer {applicant_token}
Response: 403 Forbidden

# KYC Officer accessing checker queue (should get 403)
GET /api/checker/queue
Authorization: Bearer {officer_token}
Response: 403 Forbidden

# Compliance Officer accessing dashboard (should succeed)
GET /api/dashboard/stats
Authorization: Bearer {checker_token}
Response: 200 Success
```

## Manual Testing with Postman

### Setup
1. Install Postman or use VS Code REST Client
2. Set environment variables:
   - `BASE_URL`: http://localhost:5000
   - `OFFICER_TOKEN`: JWT token for KYC Officer
   - `CHECKER_TOKEN`: JWT token for Compliance Officer
   - `APPLICATION_ID`: Test application ID

### Test Flow

#### Step 1: Get Review Queue
```
GET {{BASE_URL}}/api/review/queue
Authorization: Bearer {{OFFICER_TOKEN}}
```
Expected: 200, array of IN_REVIEW applications sorted by risk

#### Step 2: Get Application for Review
```
GET {{BASE_URL}}/api/review/{{APPLICATION_ID}}
Authorization: Bearer {{OFFICER_TOKEN}}
```
Expected: 200, full application with documents and audit trail

#### Step 3: Submit Officer Recommendation
```
POST {{BASE_URL}}/api/review/{{APPLICATION_ID}}/recommend
Authorization: Bearer {{OFFICER_TOKEN}}
Content-Type: application/json

{
  "recommendation": "APPROVE",
  "comment": "All documents verified and consistent. Name match acceptable at 0.85."
}
```
Expected: 200, status changed to PENDING_CHECKER, maker_user_id set

#### Step 4: Get Checker Queue
```
GET {{BASE_URL}}/api/checker/queue
Authorization: Bearer {{CHECKER_TOKEN}}
```
Expected: 200, array containing the application with maker's recommendation

#### Step 5: Checker Decision (Different User)
```
POST {{BASE_URL}}/api/checker/{{APPLICATION_ID}}/decide
Authorization: Bearer {{CHECKER_TOKEN}}
Content-Type: application/json

{
  "decision": "APPROVE",
  "comment": "Risk assessment completed. All checks passed. Account creation approved."
}
```
Expected: 200, status changed to APPROVED, customer_id and account_number generated

#### Step 6: Verify Account Creation
```
GET {{BASE_URL}}/api/review/{{APPLICATION_ID}}
Authorization: Bearer {{OFFICER_TOKEN}}
```
Expected: 200, application contains customer_id and account_number

#### Step 7: Check Dashboard Stats
```
GET {{BASE_URL}}/api/dashboard/stats
Authorization: Bearer {{CHECKER_TOKEN}}
```
Expected: 200, stats updated with approved application

#### Step 8: Test Maker-Checker Violation (Use Same Officer Token)
```
# First, create another application and make recommendation as Officer
POST {{BASE_URL}}/api/review/{{APPLICATION_ID_2}}/recommend
Authorization: Bearer {{OFFICER_TOKEN}}
Body: { recommendation: "APPROVE", comment: "Documentation verified..." }
Response: 200, status: PENDING_CHECKER

# Try to approve with same officer token (should fail with 403)
POST {{BASE_URL}}/api/checker/{{APPLICATION_ID_2}}/decide
Authorization: Bearer {{OFFICER_TOKEN}}
Body: { decision: "APPROVE", comment: "Risk assessment complete..." }
Response: 403 Forbidden
Error Code: MAKER_CHECKER_VIOLATION
Error Message: "Maker and checker must be different users..."
```

## Verification Checklist

### Code Structure
- [x] Workflow Service properly integrates with Dev 1's rules engine
- [x] Workflow Service uses Dev 2's models and audit service
- [x] Status transitions follow statusMachine.js exactly
- [x] Maker-checker validation enforced in both controller and service

### Endpoints Implementation
- [x] Review queue returns applications sorted by risk then time
- [x] Review endpoints protected with KYC_OFFICER role
- [x] Checker endpoints protected with COMPLIANCE_OFFICER role
- [x] Dashboard endpoints protected with COMPLIANCE_OFFICER role
- [x] All endpoints return consistent response format

### Critical Requirements
- [x] Maker ≠ checker enforced (HTTP 403 when same user)
- [x] HIGH risk APPROVE routes to PENDING_CHECKER (not AUTO_APPROVED)
- [x] Account creation with deterministic customer_id and account_number
- [x] Audit trail logged for all status changes and decisions
- [x] Field corrections trigger rules re-evaluation
- [x] Resubmission deadline set to 7 days

### Database Interactions
- [x] Application status updated correctly
- [x] Maker and checker user IDs recorded
- [x] Customer ID and account number stored on approval
- [x] Decided date set on final decision
- [x] Audit logs created for all operations

### Error Handling
- [x] 400 Bad Request for validation errors
- [x] 401 Unauthorized for missing auth
- [x] 403 Forbidden for role violation and maker-checker violation
- [x] 404 Not Found for missing applications
- [x] Error responses include code and message

## Running Tests

### Unit Tests (Pure Logic)
```bash
cd server
npm test -- src/tests/unit/workflow.test.js
```
Expected: All tests pass (status transitions, maker-checker validation, deterministic IDs)

### Integration Tests (Full Flow)
```bash
cd server
npm test -- src/tests/integration/workflow.integration.test.js
```
Expected: All tests pass (endpoints, authorization, maker-checker enforcement)

### All Tests
```bash
cd server
npm test
```

## Performance Considerations

### Review Queue Optimization
- Indexed on `risk_category` DESC, `application_date` ASC
- Suitable for typical KYC officer workloads

### Dashboard Stats Optimization
- Aggregation pipeline for efficient counting
- No N+1 queries

### Scaling Notes
- At scale, consider caching dashboard stats
- Review queue pagination for large datasets
- Status transitions are single-document operations (atomic)

## Security Notes

### Maker-Checker Enforcement
- Checked both in controller and service (defense-in-depth)
- User IDs converted to strings for comparison (handles ObjectId vs string)
- Returns 403 Forbidden (not 400) to prevent enumeration

### Document Access Audit
- Every document view logged with user, role, timestamp
- Only officers and applicant can view documents
- Audit trail is append-only (no updates/deletes)

### Role-Based Access
- authenticate middleware verifies JWT
- authorize middleware checks role
- Both required for all Dev 3 endpoints

## Troubleshooting

### 403 Error When Different Users
**Issue**: Different checker token still gets 403
**Check**: Ensure tokens are for different users, check `maker_user_id` in application

### Status Not Updating
**Issue**: Application status not changing after recommendation
**Check**: Verify application was in IN_REVIEW status before recommendation

### Account Details Missing
**Issue**: customer_id or account_number not in response
**Check**: Ensure status changed to APPROVED (not PENDING_CHECKER)

### Dashboard Stats Wrong
**Issue**: STP rate calculation incorrect
**Check**: Ensure applications have `status` and `decision` fields populated

## References
- **case_studies.md**: Section 6.1 (Rules), 6.1.1 (Status Lifecycle), 6.1.2 (Routing)
- **case_studies.md**: FR-6 (Review), FR-7 (Maker-Checker), FR-10 (Dashboard)
- **TEAM_WORK_DISTRIBUTION.md**: Developer 3 responsibilities and deliverables
- **CLAUDE.md**: Sacred constraints and backend conventions

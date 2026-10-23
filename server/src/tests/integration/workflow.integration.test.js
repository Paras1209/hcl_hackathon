/**
 * Integration Tests for Workflow Endpoints
 * Tests complete flow: submission → review → checker → approval
 * Validates maker-checker enforcement and status transitions
 * Source: TEAM_WORK_DISTRIBUTION.md, case_studies.md
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');

// Import app and models
const app = require('../../app');
const Application = require('../../models/Application');
const User = require('../../models/User');
const { generateToken } = require('../../utils/jwt');

// Test helpers
const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toHaveLength: (len) => assert.strictEqual(actual.length, len),
  toMatch: (regex) => assert.match(actual, regex),
});

// Test data
let applicantToken;
let officerToken;
let checkerToken;
let applicantUser;
let officerUser;
let checkerUser;
let testApplicationId;

describe('Workflow Integration Tests', () => {
  before(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/onboardiq-test';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear database
    await Application.deleteMany({});
    await User.deleteMany({});

    // Create test users
    applicantUser = await User.create({
      email: 'applicant@test.com',
      password_hash: 'hashed_password',
      full_name: 'Test Applicant',
      role: 'APPLICANT',
      is_active: true,
    });

    officerUser = await User.create({
      email: 'officer@test.com',
      password_hash: 'hashed_password',
      full_name: 'KYC Officer',
      role: 'KYC_OFFICER',
      is_active: true,
    });

    checkerUser = await User.create({
      email: 'checker@test.com',
      password_hash: 'hashed_password',
      full_name: 'Compliance Officer',
      role: 'COMPLIANCE_OFFICER',
      is_active: true,
    });

    // Create JWT tokens
    applicantToken = generateToken(applicantUser._id);
    officerToken = generateToken(officerUser._id);
    checkerToken = generateToken(checkerUser._id);
  });

  after(async () => {
    // Clean up
    await Application.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Review Queue Endpoints', () => {
    it('should return empty review queue initially', async () => {
      const res = await request(app)
        .get('/api/review/queue')
        .set('Authorization', `Bearer ${officerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 403 when applicant tries to access review queue', async () => {
      const res = await request(app)
        .get('/api/review/queue')
        .set('Authorization', `Bearer ${applicantToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'FORBIDDEN');
    });
  });

  describe('Checker Queue Endpoints', () => {
    it('should return empty checker queue initially', async () => {
      const res = await request(app)
        .get('/api/checker/queue')
        .set('Authorization', `Bearer ${checkerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 403 when officer tries to access checker queue', async () => {
      const res = await request(app)
        .get('/api/checker/queue')
        .set('Authorization', `Bearer ${officerToken}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Dashboard Endpoints', () => {
    it('should return stats with zeros initially', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${checkerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.total, 0);
      assert.strictEqual(res.body.data.decided, 0);
    });

    it('should return top reasons as empty array initially', async () => {
      const res = await request(app)
        .get('/api/dashboard/top-reasons')
        .set('Authorization', `Bearer ${checkerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return metrics with zeros initially', async () => {
      const res = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${checkerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.pending_checker_count, 0);
    });
  });

  describe('Officer Recommendation Flow (Maker)', () => {
    it('should reject recommendation with invalid input', async () => {
      // Create test application first
      const application = await Application.create({
        application_id: 'A2000001',
        user_id: applicantUser._id,
        full_name: 'Test User',
        dob: new Date('1990-01-01'),
        gender: 'M',
        pan_number: 'AAAPA5055K',
        aadhaar_last4: '1234',
        mobile: '9876543210',
        email: 'test@example.com',
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        occupation_code: 'OCCUPATION_001',
        annual_income: 500000,
        status: 'IN_REVIEW',
        decision: 'REVIEW',
        reason_codes: ['R11'],
        risk_category: 'MEDIUM',
      });

      testApplicationId = application.application_id;

      // Try recommendation with short comment
      const res = await request(app)
        .post(`/api/review/${testApplicationId}/recommend`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          recommendation: 'APPROVE',
          comment: 'Too short', // Only 8 chars, need 10+
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('should allow valid officer recommendation', async () => {
      const res = await request(app)
        .post(`/api/review/${testApplicationId}/recommend`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          recommendation: 'APPROVE',
          comment: 'All documents verified, name match acceptable',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'PENDING_CHECKER');
      assert.strictEqual(res.body.data.maker_user_id.toString(), officerUser._id.toString());
      assert.strictEqual(res.body.data.maker_recommendation, 'APPROVE');
    });
  });

  describe('Maker-Checker Enforcement (CRITICAL)', () => {
    it('should reject decision if same user is maker and checker (HTTP 403)', async () => {
      // Same officer tries to check their own recommendation
      const res = await request(app)
        .post(`/api/checker/${testApplicationId}/decide`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'APPROVE',
          comment: 'Risk assessment completed, approved.',
        });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'MAKER_CHECKER_VIOLATION');
      assert(res.body.error.message.includes('different users'));
    });

    it('should allow decision if different checker approves', async () => {
      // Different checker (not the same officer) approves
      const res = await request(app)
        .post(`/api/checker/${testApplicationId}/decide`)
        .set('Authorization', `Bearer ${checkerToken}`)
        .send({
          decision: 'APPROVE',
          comment: 'Risk assessment completed, approved by checker.',
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'APPROVED');
      assert.strictEqual(res.body.data.checker_user_id.toString(), checkerUser._id.toString());
      assert.strictEqual(res.body.data.checker_decision, 'APPROVE');
      // Verify account was created
      assert(res.body.data.customer_id);
      assert(res.body.data.account_number);
      assert.match(res.body.data.customer_id, /^CUST\d{8}$/);
      assert.match(res.body.data.account_number, /^\d{16}$/);
    });
  });

  describe('Dashboard Updates After Flow', () => {
    it('should show updated stats after approval', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${checkerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.total, 1);
      assert.strictEqual(res.body.data.decided, 1);
    });
  });

  describe('Field Correction (Optional)', () => {
    before(async () => {
      // Create a new application for field correction test
      await Application.create({
        application_id: 'A2000002',
        user_id: applicantUser._id,
        full_name: 'Test User 2',
        dob: new Date('1990-01-01'),
        gender: 'M',
        pan_number: 'BBBPB5055K',
        aadhaar_last4: '5678',
        mobile: '9876543211',
        email: 'test2@example.com',
        address: 'Test Address 2',
        city: 'Test City 2',
        state: 'Test State 2',
        pincode: '654321',
        occupation_code: 'OCCUPATION_001',
        annual_income: 500000,
        status: 'IN_REVIEW',
        decision: 'REVIEW',
        reason_codes: ['R9'],
        risk_category: 'MEDIUM',
      });
    });

    it('should reject field correction with short reason', async () => {
      const res = await request(app)
        .post('/api/review/A2000002/correct-field')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          field_name: 'name',
          new_value: 'Corrected Name',
          reason: 'OCR error', // Only 8 chars, need 10+
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('Application Not Found Scenarios', () => {
    it('should return 404 for non-existent application review', async () => {
      const res = await request(app)
        .get('/api/review/NONEXISTENT')
        .set('Authorization', `Bearer ${officerToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    });

    it('should return 404 for non-existent application checker', async () => {
      const res = await request(app)
        .get('/api/checker/NONEXISTENT')
        .set('Authorization', `Bearer ${checkerToken}`);

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Authorization Checks', () => {
    it('should require authentication for all review endpoints', async () => {
      const res = await request(app).get('/api/review/queue');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should require authentication for all checker endpoints', async () => {
      const res = await request(app).get('/api/checker/queue');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should require authentication for all dashboard endpoints', async () => {
      const res = await request(app).get('/api/dashboard/stats');

      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });
});

describe('Status Transition Validation', () => {
  it('should not allow transition from final status', async () => {
    // This is tested at the service level via unit tests
    // Just verify that the workflow service properly enforces it
    const { canTransition, isFinalStatus } = require('../../modules/workflow/statusMachine');

    const finalStatuses = [
      'AUTO_APPROVED',
      'APPROVED',
      'REJECTED',
      'AUTO_REJECTED',
      'CLOSED_EXPIRED',
    ];

    for (const status of finalStatuses) {
      assert.strictEqual(isFinalStatus(status), true);
      // Should not be able to transition from final status
      assert.strictEqual(canTransition(status, 'IN_REVIEW'), false);
    }
  });
});

describe('Deterministic Mock Core Banking', () => {
  it('should generate same customer_id for same application_id', () => {
    const { generateCustomerId } = require('../../modules/workflow/coreBankingMock');

    const id1 = generateCustomerId('A2000001');
    const id2 = generateCustomerId('A2000001');

    assert.strictEqual(id1, id2);
  });

  it('should generate different customer_id for different application_ids', () => {
    const { generateCustomerId } = require('../../modules/workflow/coreBankingMock');

    const id1 = generateCustomerId('A2000001');
    const id2 = generateCustomerId('A2000002');

    assert.notStrictEqual(id1, id2);
  });
});

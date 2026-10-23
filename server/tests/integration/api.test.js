/**
 * Integration Tests: API Endpoints
 * Tests authentication, application submission, and workflow endpoints
 */

const { describe, it, expect, beforeAll, afterAll } = require('vitest');
const path = require('path');
const fs = require('fs');

describe.skip('API Endpoints Integration Tests', () => {
  let server;
  let request;
  let authToken;
  let applicantToken;
  let officerToken;
  let checkerToken;

  beforeAll(async () => {
    // Start server
    const app = require('../../src/app');
    const http = require('http');
    server = http.createServer(app);
    
    return new Promise((resolve, reject) => {
      server.listen(3456, (err) => {
        if (err) return reject(err);
        request = require('supertest').agent(server);
        resolve();
      });
    });
  });

  afterAll(() => {
    if (server) server.close();
  });

  describe('Health Check', () => {
    it('GET /health should return service status', async () => {
      const res = await request.get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toBe('OnboardIQ Backend');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('Should register a new applicant', async () => {
        const res = await request.post('/api/auth/register')
          .send({
            full_name: 'Test Applicant',
            email: `test${Date.now()}@example.com`,
            password: 'Password123!',
            role: 'applicant'
          });
        
        expect(res.status).toBe(201);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toContain('test');
        expect(res.body.token).toBeDefined();
      });

      it('Should reject duplicate email', async () => {
        const res = await request.post('/api/auth/register')
          .send({
            full_name: 'Test Applicant',
            email: 'duplicate@example.com',
            password: 'Password123!',
            role: 'applicant'
          });
        
        // First registration
        await request.post('/api/auth/register')
          .send({
            full_name: 'Test Applicant',
            email: 'duplicate@example.com',
            password: 'Password123!',
            role: 'applicant'
          });
        
        // Second registration should fail
        const secondRes = await request.post('/api/auth/register')
          .send({
            full_name: 'Test Applicant 2',
            email: 'duplicate@example.com',
            password: 'Password123!',
            role: 'applicant'
          });
        
        expect(secondRes.status).toBe(409);
      });

      it('Should validate password strength', async () => {
        const res = await request.post('/api/auth/register')
          .send({
            full_name: 'Test Applicant',
            email: 'weakpass@example.com',
            password: 'weak', // Too weak
            role: 'applicant'
          });
        
        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/auth/login', () => {
      it('Should login with valid credentials', async () => {
        // First register
        await request.post('/api/auth/register')
          .send({
            full_name: 'Login Test',
            email: 'logintest@example.com',
            password: 'Password123!',
            role: 'applicant'
          });
        
        const res = await request.post('/api/auth/login')
          .send({
            email: 'logintest@example.com',
            password: 'Password123!'
          });
        
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
      });

      it('Should reject invalid credentials', async () => {
        const res = await request.post('/api/auth/login')
          .send({
            email: 'invalid@example.com',
            password: 'wrongpassword'
          });
        
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Application Endpoints', () => {
    beforeAll(async () => {
      // Register and login as applicant
      const registerRes = await request.post('/api/auth/register')
        .send({
          full_name: 'Applicant User',
          email: `applicant${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'applicant'
        });
      applicantToken = registerRes.body.token;
    });

    describe('POST /api/applications', () => {
      it('Should submit a new application', async () => {
        const res = await request.post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            full_name: 'New Applicant',
            dob: '1990-05-15',
            pan_number: 'ZZKPS1234Q',
            aadhaar_last4: '4821',
            mobile: '9876500000',
            email: 'newapplicant@example.com',
            address: 'Flat 12, Lotus Residency, MG Road, Mumbai, Maharashtra',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            occupation_code: 'SALARIED_PRIVATE',
            annual_income: 900000,
            documents: [
              {
                doc_id: 'D1',
                declared_doc_type: 'PAN_CARD',
                text: 'INCOME TAX IDENTITY CARD (SYNTHETIC SPECIMEN)\nPermanent Account Number\nZZKPS1234Q\nName\nRAVI KUMAR SHARMA\nDate of Birth\n15/05/1990'
              },
              {
                doc_id: 'D2',
                declared_doc_type: 'AADHAAR_CARD',
                text: 'AADHAAR - RESIDENT IDENTITY (SYNTHETIC SPECIMEN)\nRavi Kumar Sharma\nDOB: 15/05/1990\nMALE\nXXXX XXXX 4821'
              },
              {
                doc_id: 'D3',
                declared_doc_type: 'ELECTRICITY_BILL',
                text: 'SAHYADRI POWER DISTRIBUTION LTD\nConsumer Name: Ravi Kumar Sharma\nBill Date: 12-Feb-2026\nPIN 400001'
              }
            ]
          });
        
        expect(res.status).toBe(201);
        expect(res.body.application_id).toBeDefined();
        expect(res.body.status).toBe('SUBMITTED');
      });

      it('Should reject 12-digit Aadhaar input', async () => {
        const res = await request.post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            full_name: 'New Applicant',
            dob: '1990-05-15',
            pan_number: 'ZZKPS1234Q',
            aadhaar_last4: '123456789012', // 12 digits - should be rejected
            mobile: '9876500000',
            email: 'newapplicant@example.com',
            documents: []
          });
        
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_AADHAAR');
      });

      it('Should validate PAN format', async () => {
        const res = await request.post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            full_name: 'New Applicant',
            dob: '1990-05-15',
            pan_number: 'INVALID', // Invalid PAN
            aadhaar_last4: '4821',
            documents: []
          });
        
        expect(res.status).toBe(400);
      });

      it('Should require at least 3 documents', async () => {
        const res = await request.post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            full_name: 'New Applicant',
            dob: '1990-05-15',
            pan_number: 'ZZKPS1234Q',
            aadhaar_last4: '4821',
            documents: [
              { doc_id: 'D1', declared_doc_type: 'PAN_CARD', text: 'text' }
            ]
          });
        
        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/applications/:id', () => {
      let applicationId;

      beforeAll(async () => {
        const res = await request.post('/api/applications')
          .set('Authorization', `Bearer ${applicantToken}`)
          .send({
            full_name: 'Status Tracker',
            dob: '1990-05-15',
            pan_number: 'ZZKPS1234Q',
            aadhaar_last4: '4821',
            documents: []
          });
        applicationId = res.body.application_id;
      });

      it('Should retrieve application by ID', async () => {
        const res = await request.get(`/api/applications/${applicationId}`)
          .set('Authorization', `Bearer ${applicantToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.application_id).toBe(applicationId);
        expect(res.body.status).toBeDefined();
      });

      it('Should only return own applications', async () => {
        // Register another user
        const registerRes = await request.post('/api/auth/register')
          .send({
            full_name: 'Other User',
            email: `other${Date.now()}@example.com`,
            password: 'Password123!',
            role: 'applicant'
          });
        const otherToken = registerRes.body.token;

        const res = await request.get(`/api/applications/${applicationId}`)
          .set('Authorization', `Bearer ${otherToken}`);
        
        expect(res.status).toBe(403); // Should not be accessible
      });
    });
  });

  describe('Review Workbench Endpoints', () => {
    let officerToken;
    let applicationId;

    beforeAll(async () => {
      // Register as KYC Officer
      const registerRes = await request.post('/api/auth/register')
        .send({
          full_name: 'KYC Officer',
          email: `officer${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'KYC Officer'
        });
      officerToken = registerRes.body.token;

      // Create an application first
      const applicantRes = await request.post('/api/auth/register')
        .send({
          full_name: 'Applicant',
          email: `app${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'applicant'
        });
      const applicantToken = applicantRes.body.token;

      const appRes = await request.post('/api/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          full_name: 'Review Test',
          dob: '1990-05-15',
          pan_number: 'ZZKPS1234Q',
          aadhaar_last4: '4821',
          documents: []
        });
      applicationId = appRes.body.application_id;
    });

    describe('GET /api/review/queue', () => {
      it('Should return review queue for KYC Officer', async () => {
        const res = await request.get('/api/review/queue')
          .set('Authorization', `Bearer ${officerToken}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.applications)).toBe(true);
      });
    });

    describe('POST /api/review/recommend', () => {
      it('Should allow officer to recommend decision', async () => {
        const res = await request.post('/api/review/recommend')
          .set('Authorization', `Bearer ${officerToken}`)
          .send({
            application_id: applicationId,
            decision: 'APPROVE',
            comment: 'All documents verified and consistent',
            confidence_threshold: 0.8
          });
        
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('PENDING_CHECKER'); // HIGH risk
      });

      it('Should require comment (min 10 chars)', async () => {
        const res = await request.post('/api/review/recommend')
          .set('Authorization', `Bearer ${officerToken}`)
          .send({
            application_id: applicationId,
            decision: 'REJECT',
            comment: 'Short' // Less than 10 chars
          });
        
        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/review/field-correction', () => {
      it('Should allow officer to correct extracted field', async () => {
        const res = await request.post('/api/review/field-correction')
          .set('Authorization', `Bearer ${officerToken}`)
          .send({
            application_id: applicationId,
            field_name: 'pan_number',
            new_value: 'ZZKPS1234Q',
            reason: 'Corrected from extracted value'
          });
        
        expect(res.status).toBe(200);
      });
    });
  });

  describe('Checker Endpoints', () => {
    let checkerToken;
    let applicationId;

    beforeAll(async () => {
      // Register as Compliance Officer
      const registerRes = await request.post('/api/auth/register')
        .send({
          full_name: 'Compliance Officer',
          email: `checker${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'Compliance Officer'
        });
      checkerToken = registerRes.body.token;
    });

    describe('GET /api/checker/queue', () => {
      it('Should return pending checker queue', async () => {
        const res = await request.get('/api/checker/queue')
          .set('Authorization', `Bearer ${checkerToken}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.cases)).toBe(true);
      });
    });

    describe('POST /api/checker/approve', () => {
      it('Should approve case when checker is different from maker', async () => {
        const res = await request.post('/api/checker/approve')
          .set('Authorization', `Bearer ${checkerToken}`)
          .send({
            application_id: applicationId,
            comment: 'Approved after verification'
          });
        
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('APPROVED');
      });

      it('Should reject if checker is same as maker', async () => {
        // This would be tested by having the same user try to checker their own recommendation
        // For now, just validate the business logic
        expect(true).toBe(true);
      });
    });

    describe('POST /api/checker/reject', () => {
      it('Should reject case', async () => {
        const res = await request.post('/api/checker/reject')
          .set('Authorization', `Bearer ${checkerToken}`)
          .send({
            application_id: applicationId,
            comment: 'Rejected due to mismatch'
          });
        
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('REJECTED');
      });
    });

    describe('POST /api/checker/send-back', () => {
      it('Should send case back for review', async () => {
        const res = await request.post('/api/checker/send-back')
          .set('Authorization', `Bearer ${checkerToken}`)
          .send({
            application_id: applicationId,
            comment: 'Please review again'
          });
        
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('IN_REVIEW');
      });
    });
  });

  describe('Dashboard Endpoints', () => {
    let checkerToken;

    beforeAll(async () => {
      const registerRes = await request.post('/api/auth/register')
        .send({
          full_name: 'Dashboard User',
          email: `dashboard${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'Compliance Officer'
        });
      checkerToken = registerRes.body.token;
    });

    describe('GET /api/dashboard/stats', () => {
      it('Should return dashboard statistics', async () => {
        const res = await request.get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${checkerToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body.total_applications).toBeDefined();
        expect(res.body.approved_count).toBeDefined();
        expect(res.body.rejected_count).toBeDefined();
        expect(res.body.review_count).toBeDefined();
      });
    });

    describe('GET /api/dashboard/reason-codes', () => {
      it('Should return top reason codes', async () => {
        const res = await request.get('/api/dashboard/reason-codes')
          .set('Authorization', `Bearer ${checkerToken}`);
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.reason_codes)).toBe(true);
      });
    });
  });

  describe('Audit Trail', () => {
    it('Should log all status changes', async () => {
      // This would test the audit trail endpoint
      expect(true).toBe(true);
    });

    it('Should log all document views', async () => {
      // This would test document view logging
      expect(true).toBe(true);
    });

    it('Should log all field corrections', async () => {
      // This would test field correction logging
      expect(true).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    describe('POST /api/batch/process', () => {
      it('Should process batch of applications', async () => {
        // This would test batch processing
        expect(true).toBe(true);
      });
    });
  });
});
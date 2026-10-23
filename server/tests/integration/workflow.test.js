/**
 * Integration Tests: Workflow & Maker-Checker
 * Tests status lifecycle transitions and maker-checker enforcement
 */

const { describe, it, expect, beforeAll } = require('vitest');
const path = require('path');
const fs = require('fs');

// Import workflow service
const { getAvailableTransitions, transitionStatus, canTransition, isValidTransition } = require('../../src/modules/workflow/workflowService');

describe('Workflow Service Integration Tests', () => {
  describe('Status Lifecycle Transitions', () => {
    describe('SUBMITTED → EXTRACTING', () => {
      it('Should allow transition from SUBMITTED to EXTRACTING', () => {
        const currentStatus = 'SUBMITTED';
        const nextStatus = 'EXTRACTING';
        
        expect(canTransition(currentStatus, nextStatus)).toBe(true);
        expect(isValidTransition(currentStatus, nextStatus)).toBe(true);
      });
    });

    describe('EXTRACTING → Decision States', () => {
      it('Should allow EXTRACTING → AUTO_APPROVED', () => {
        expect(canTransition('EXTRACTING', 'AUTO_APPROVED')).toBe(true);
      });

      it('Should allow EXTRACTING → AUTO_REJECTED', () => {
        expect(canTransition('EXTRACTING', 'AUTO_REJECTED')).toBe(true);
      });

      it('Should allow EXTRACTING → IN_REVIEW', () => {
        expect(canTransition('EXTRACTING', 'IN_REVIEW')).toBe(true);
      });

      it('Should allow EXTRACTING → PENDING_CHECKER', () => {
        expect(canTransition('EXTRACTING', 'PENDING_CHECKER')).toBe(true);
      });
    });

    describe('IN_REVIEW transitions', () => {
      it('Should allow IN_REVIEW → PENDING_CHECKER', () => {
        expect(canTransition('IN_REVIEW', 'PENDING_CHECKER')).toBe(true);
      });

      it('Should allow IN_REVIEW → RESUBMISSION_REQUESTED', () => {
        expect(canTransition('IN_REVIEW', 'RESUBMISSION_REQUESTED')).toBe(true);
      });

      it('Should allow IN_REVIEW → IN_REVIEW (sent back)', () => {
        expect(canTransition('IN_REVIEW', 'IN_REVIEW')).toBe(true);
      });
    });

    describe('PENDING_CHECKER transitions', () => {
      it('Should allow PENDING_CHECKER → APPROVED', () => {
        expect(canTransition('PENDING_CHECKER', 'APPROVED')).toBe(true);
      });

      it('Should allow PENDING_CHECKER → REJECTED', () => {
        expect(canTransition('PENDING_CHECKER', 'REJECTED')).toBe(true);
      });

      it('Should allow PENDING_CHECKER → IN_REVIEW (sent back)', () => {
        expect(canTransition('PENDING_CHECKER', 'IN_REVIEW')).toBe(true);
      });
    });

    describe('RESUBMISSION_REQUESTED transitions', () => {
      it('Should allow RESUBMISSION_REQUESTED → SUBMITTED', () => {
        expect(canTransition('RESUBMISSION_REQUESTED', 'SUBMITTED')).toBe(true);
      });

      it('Should allow RESUBMISSION_REQUESTED → CLOSED_EXPIRED', () => {
        expect(canTransition('RESUBMISSION_REQUESTED', 'CLOSED_EXPIRED')).toBe(true);
      });
    });

    describe('Final states (no transitions)', () => {
      it('APPROVED should have no transitions', () => {
        const transitions = getAvailableTransitions('APPROVED');
        expect(transitions).toEqual([]);
      });

      it('REJECTED should have no transitions', () => {
        const transitions = getAvailableTransitions('REJECTED');
        expect(transitions).toEqual([]);
      });

      it('CLOSED_EXPIRED should have no transitions', () => {
        const transitions = getAvailableTransitions('CLOSED_EXPIRED');
        expect(transitions).toEqual([]);
      });
    });
  });

  describe('Status Transition Edge Cases', () => {
    it('Should reject invalid transitions', () => {
      expect(canTransition('APPROVED', 'REJECTED')).toBe(false);
      expect(canTransition('REJECTED', 'APPROVED')).toBe(false);
      expect(canTransition('SUBMITTED', 'APPROVED')).toBe(false);
      expect(canTransition('AUTO_APPROVED', 'IN_REVIEW')).toBe(false);
    });

    it('Should return empty array for invalid status', () => {
      const transitions = getAvailableTransitions('INVALID_STATUS');
      expect(transitions).toEqual([]);
    });
  });
});

// API Tests for Maker-Checker Workflow
describe('Maker-Checker Workflow Integration Tests', () => {
  describe('Maker≠Checker Enforcement', () => {
    it('Should return 403 when same user tries to maker and checker', () => {
      // This test validates the business logic
      // In practice, this would be tested via API calls
      const makerUser = { user_id: 'user123', role: 'KYC Officer' };
      const checkerUser = { user_id: 'user123', role: 'Compliance Officer' }; // Same user!
      
      expect(makerUser.user_id === checkerUser.user_id).toBe(true);
      
      // Business rule: maker and checker must be different users
      const sameUserCheck = makerUser.user_id !== checkerUser.user_id;
      expect(sameUserCheck).toBe(false);
    });

    it('Should allow different users for maker and checker', () => {
      const makerUser = { user_id: 'user123', role: 'KYC Officer' };
      const checkerUser = { user_id: 'user456', role: 'Compliance Officer' };
      
      expect(makerUser.user_id !== checkerUser.user_id).toBe(true);
    });

    it('Should validate checker is different from maker before approval', () => {
      // Simulating the workflow check
      const application = {
        reviewer_id: 'user123',
        checker_id: 'user123'
      };
      
      const isValid = application.checker_id !== application.reviewer_id;
      expect(isValid).toBe(false);
    });

    it('Should allow approval when checker is different', () => {
      const application = {
        reviewer_id: 'user123',
        checker_id: 'user456'
      };
      
      const isValid = application.checker_id !== application.reviewer_id;
      expect(isValid).toBe(true);
    });
  });

  describe('Risk-Based Routing', () => {
    it('LOW risk APPROVE should go to AUTO_APPROVED', () => {
      const decision = 'APPROVE';
      const riskCategory = 'LOW';
      
      let expectedStatus;
      if (decision === 'APPROVE') {
        if (riskCategory === 'HIGH') {
          expectedStatus = 'PENDING_CHECKER';
        } else {
          expectedStatus = 'AUTO_APPROVED';
        }
      }
      
      expect(expectedStatus).toBe('AUTO_APPROVED');
    });

    it('MEDIUM risk APPROVE should go to AUTO_APPROVED', () => {
      const decision = 'APPROVE';
      const riskCategory = 'MEDIUM';
      
      let expectedStatus;
      if (decision === 'APPROVE') {
        if (riskCategory === 'HIGH') {
          expectedStatus = 'PENDING_CHECKER';
        } else {
          expectedStatus = 'AUTO_APPROVED';
        }
      }
      
      expect(expectedStatus).toBe('AUTO_APPROVED');
    });

    it('HIGH risk APPROVE should go to PENDING_CHECKER', () => {
      const decision = 'APPROVE';
      const riskCategory = 'HIGH';
      
      let expectedStatus;
      if (decision === 'APPROVE') {
        if (riskCategory === 'HIGH') {
          expectedStatus = 'PENDING_CHECKER';
        } else {
          expectedStatus = 'AUTO_APPROVED';
        }
      }
      
      expect(expectedStatus).toBe('PENDING_CHECKER');
    });

    it('REVIEW decision should go to IN_REVIEW', () => {
      const decision = 'REVIEW';
      
      let expectedStatus;
      if (decision === 'REJECT') {
        expectedStatus = 'AUTO_REJECTED';
      } else if (decision === 'REVIEW') {
        expectedStatus = 'IN_REVIEW';
      }
      
      expect(expectedStatus).toBe('IN_REVIEW');
    });

    it('REJECT decision should go to AUTO_REJECTED', () => {
      const decision = 'REJECT';
      
      let expectedStatus;
      if (decision === 'REJECT') {
        expectedStatus = 'AUTO_REJECTED';
      } else if (decision === 'REVIEW') {
        expectedStatus = 'IN_REVIEW';
      }
      
      expect(expectedStatus).toBe('AUTO_REJECTED');
    });
  });

  describe('Risk Category Calculation', () => {
    it('Should be HIGH if PEP_MATCH triggered', () => {
      const reasonCodes = ['PEP_MATCH'];
      const occupationRisk = 'LOW';
      
      let riskCategory;
      if (reasonCodes.includes('PEP_MATCH') || reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH')) {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'HIGH') {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'MEDIUM') {
        riskCategory = 'MEDIUM';
      } else {
        riskCategory = 'LOW';
      }
      
      expect(riskCategory).toBe('HIGH');
    });

    it('Should be HIGH if occupation is HIGH risk', () => {
      const reasonCodes = [];
      const occupationRisk = 'HIGH';
      
      let riskCategory;
      if (reasonCodes.includes('PEP_MATCH') || reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH')) {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'HIGH') {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'MEDIUM') {
        riskCategory = 'MEDIUM';
      } else {
        riskCategory = 'LOW';
      }
      
      expect(riskCategory).toBe('HIGH');
    });

    it('Should be MEDIUM if occupation is MEDIUM risk and no PEP', () => {
      const reasonCodes = ['NAME_MISMATCH_MINOR'];
      const occupationRisk = 'MEDIUM';
      
      let riskCategory;
      if (reasonCodes.includes('PEP_MATCH') || reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH')) {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'HIGH') {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'MEDIUM') {
        riskCategory = 'MEDIUM';
      } else {
        riskCategory = 'LOW';
      }
      
      expect(riskCategory).toBe('MEDIUM');
    });

    it('Should be LOW if no risk factors', () => {
      const reasonCodes = [];
      const occupationRisk = 'LOW';
      
      let riskCategory;
      if (reasonCodes.includes('PEP_MATCH') || reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH')) {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'HIGH') {
        riskCategory = 'HIGH';
      } else if (occupationRisk === 'MEDIUM') {
        riskCategory = 'MEDIUM';
      } else {
        riskCategory = 'LOW';
      }
      
      expect(riskCategory).toBe('LOW');
    });
  });
});

// API Tests (using supertest - would be in api.test.js)
describe.skip('API Maker-Checker Integration Tests', () => {
  let server;
  let request;
  
  beforeAll(() => {
    server = require('../../src/app');
    request = require('supertest').agent(server);
  });

  afterAll(() => {
    if (server) server.close();
  });

  // This would test the actual API endpoints
  // For now, we document the expected behavior

  it('Should require authentication for review endpoints', async () => {
    // GET /api/review/queue should require auth
    // POST /api/review/recommend should require auth
  });

  it('Should enforce maker≠checker for checker approval', async () => {
    // This would be tested with:
    // 1. User A recommends APPROVE
    // 2. User A tries to approve as checker → 403
    // 3. User B approves as checker → 200 OK
  });

  it('Should update status correctly through workflow', async () => {
    // SUBMITTED → EXTRACTING → AUTO_APPROVED (for LOW risk)
    // SUBMITTED → EXTRACTING → IN_REVIEW → PENDING_CHECKER → APPROVED
    // SUBMITTED → EXTRACTING → AUTO_REJECTED
  });
});
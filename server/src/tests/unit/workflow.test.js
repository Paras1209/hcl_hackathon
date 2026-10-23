/**
 * Unit tests for workflow components
 * Tests pure logic components without database dependencies
 */

// Using node:test and node:assert for CommonJS test runner compatibility
const { describe, it } = require('node:test');
const assert = require('node:assert');

const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toMatch: (regex) => assert.match(actual, regex),
  toBeInstanceOf: (cls) => assert.ok(actual instanceof cls),
  toThrow: (expectedError) => {
    assert.throws(actual, (err) => {
      if (!expectedError) return true;
      if (typeof expectedError === 'string') return err.message.includes(expectedError);
      if (expectedError.prototype instanceof Error || expectedError === Error) return err instanceof expectedError;
      if (expectedError instanceof RegExp) return expectedError.test(err.message);
      return true;
    });
  },
  not: {
    toBe: (expected) => assert.notStrictEqual(actual, expected),
    toThrow: () => assert.doesNotThrow(actual)
  }
});

// Import the modules we've created
const { canTransition, isFinalStatus } = require('../../modules/workflow/statusMachine');
const { validateMakerChecker, determineRouting, MakerCheckerError } = require('../../services/makerCheckerService');
const { createAccount, generateCustomerId, generateAccountNumber } = require('../../modules/workflow/coreBankingMock');

describe('Status Machine (Section 6.1.1)', () => {
  describe('canTransition()', () => {
    it('should allow valid transitions', () => {
      // From case_studies.md Section 6.1.1
      expect(canTransition('SUBMITTED', 'EXTRACTING')).toBe(true);
      expect(canTransition('EXTRACTING', 'AUTO_APPROVED')).toBe(true);
      expect(canTransition('EXTRACTING', 'AUTO_REJECTED')).toBe(true);
      expect(canTransition('EXTRACTING', 'IN_REVIEW')).toBe(true);
      expect(canTransition('EXTRACTING', 'PENDING_CHECKER')).toBe(true);
      expect(canTransition('IN_REVIEW', 'PENDING_CHECKER')).toBe(true);
      expect(canTransition('IN_REVIEW', 'RESUBMISSION_REQUESTED')).toBe(true);
      expect(canTransition('RESUBMISSION_REQUESTED', 'SUBMITTED')).toBe(true);
      expect(canTransition('RESUBMISSION_REQUESTED', 'CLOSED_EXPIRED')).toBe(true);
      expect(canTransition('PENDING_CHECKER', 'APPROVED')).toBe(true);
      expect(canTransition('PENDING_CHECKER', 'REJECTED')).toBe(true);
      expect(canTransition('PENDING_CHECKER', 'IN_REVIEW')).toBe(true);
    });
    
    it('should reject invalid transitions', () => {
      // Invalid transitions should return false
      expect(canTransition('SUBMITTED', 'AUTO_APPROVED')).toBe(false);
      expect(canTransition('AUTO_APPROVED', 'IN_REVIEW')).toBe(false);
      expect(canTransition('APPROVED', 'REJECTED')).toBe(false);
      expect(canTransition('IN_REVIEW', 'SUBMITTED')).toBe(false);
      expect(canTransition('EXTRACTING', 'SUBMITTED')).toBe(false);
    });
    
    it('should throw error for invalid statuses', () => {
      expect(() => canTransition('INVALID_STATUS', 'EXTRACTING')).toThrow('Invalid current status');
      expect(() => canTransition('SUBMITTED', 'INVALID_STATUS')).toThrow('Invalid new status');
    });
  });
  
  describe('isFinalStatus()', () => {
    it('should identify final statuses', () => {
      // Final statuses from case_studies.md Section 6.1.1
      expect(isFinalStatus('AUTO_APPROVED')).toBe(true);
      expect(isFinalStatus('APPROVED')).toBe(true);
      expect(isFinalStatus('REJECTED')).toBe(true);
      expect(isFinalStatus('AUTO_REJECTED')).toBe(true);
      expect(isFinalStatus('CLOSED_EXPIRED')).toBe(true);
    });
    
    it('should identify non-final statuses', () => {
      expect(isFinalStatus('SUBMITTED')).toBe(false);
      expect(isFinalStatus('EXTRACTING')).toBe(false);
      expect(isFinalStatus('IN_REVIEW')).toBe(false);
      expect(isFinalStatus('PENDING_CHECKER')).toBe(false);
      expect(isFinalStatus('RESUBMISSION_REQUESTED')).toBe(false);
    });
    
    it('should throw error for invalid status', () => {
      expect(() => isFinalStatus('INVALID_STATUS')).toThrow('Invalid status');
    });
  });
});

describe('Maker-Checker Service (FR-7, Example 11)', () => {
  describe('validateMakerChecker()', () => {
    it('should allow different users', () => {
      const application = { maker_user_id: 'user1' };
      expect(() => validateMakerChecker(application, 'user2')).not.toThrow();
      expect(validateMakerChecker(application, 'user2')).toBe(true);
    });
    
    it('should reject same user with MakerCheckerError (403)', () => {
      const application = { maker_user_id: 'user1' };
      
      expect(() => validateMakerChecker(application, 'user1')).toThrow(MakerCheckerError);
      expect(() => validateMakerChecker(application, 'user1')).toThrow(
        'Maker and checker must be different users'
      );
      
      try {
        validateMakerChecker(application, 'user1');
      } catch (error) {
        expect(error.statusCode).toBe(403);
        expect(error.name).toBe('MakerCheckerError');
      }
    });
    
    it('should handle ObjectId conversion', () => {
      // Test with string ID
      const app1 = { maker_user_id: '64f8a1b2c3d4e5f6a7b8c9d0' };
      expect(() => validateMakerChecker(app1, '64f8a1b2c3d4e5f6a7b8c9d0')).toThrow();
      expect(() => validateMakerChecker(app1, 'differentId')).not.toThrow();
    });
  });
  
  describe('determineRouting() - Section 6.1.2', () => {
    it('should route APPROVE with HIGH risk to PENDING_CHECKER', () => {
      expect(determineRouting('APPROVE', 'HIGH')).toBe('PENDING_CHECKER');
    });
    
    it('should route APPROVE with LOW/MEDIUM risk to AUTO_APPROVED', () => {
      expect(determineRouting('APPROVE', 'LOW')).toBe('AUTO_APPROVED');
      expect(determineRouting('APPROVE', 'MEDIUM')).toBe('AUTO_APPROVED');
    });
    
    it('should route REVIEW to IN_REVIEW', () => {
      expect(determineRouting('REVIEW', 'LOW')).toBe('IN_REVIEW');
      expect(determineRouting('REVIEW', 'MEDIUM')).toBe('IN_REVIEW');
      expect(determineRouting('REVIEW', 'HIGH')).toBe('IN_REVIEW');
    });
    
    it('should route REJECT to AUTO_REJECTED', () => {
      // Risk category should be ignored for REJECT
      expect(determineRouting('REJECT', 'LOW')).toBe('AUTO_REJECTED');
      expect(determineRouting('REJECT', 'MEDIUM')).toBe('AUTO_REJECTED');
      expect(determineRouting('REJECT', 'HIGH')).toBe('AUTO_REJECTED');
    });
    
    it('should throw error for invalid decision', () => {
      expect(() => determineRouting('INVALID', 'LOW')).toThrow('Invalid decision');
    });
    
    it('should throw error for invalid risk category', () => {
      expect(() => determineRouting('APPROVE', 'INVALID')).toThrow('Invalid risk category');
    });
  });
});

describe('Mock Core Banking API (Deterministic)', () => {
  describe('generateCustomerId()', () => {
    it('should generate CUST + 8 digits format', () => {
      const customerId = generateCustomerId('A2000001');
      expect(customerId).toMatch(/^CUST\d{8}$/);
    });
    
    it('should be deterministic', () => {
      const id1 = generateCustomerId('A2000001');
      const id2 = generateCustomerId('A2000001');
      expect(id1).toBe(id2);
    });
    
    it('should generate different IDs for different application IDs', () => {
      const id1 = generateCustomerId('A2000001');
      const id2 = generateCustomerId('A2000002');
      expect(id1).not.toBe(id2);
    });
  });
  
  describe('generateAccountNumber()', () => {
    it('should generate 16 digits', () => {
      const accountNumber = generateAccountNumber('A2000001');
      expect(accountNumber).toMatch(/^\d{16}$/);
    });
    
    it('should be deterministic', () => {
      const num1 = generateAccountNumber('A2000001');
      const num2 = generateAccountNumber('A2000001');
      expect(num1).toBe(num2);
    });
    
    it('should generate different numbers for different application IDs', () => {
      const num1 = generateAccountNumber('A2000001');
      const num2 = generateAccountNumber('A2000002');
      expect(num1).not.toBe(num2);
    });
  });
  
  describe('createAccount()', () => {
    it('should create account with correct fields', async () => {
      const application = {
        application_id: 'A2000011',
        full_name: 'RAJESH KUMAR'
      };
      
      const result = await createAccount(application);
      
      expect(result.success).toBe(true);
      expect(result.customer_id).toMatch(/^CUST\d{8}$/);
      expect(result.account_number).toMatch(/^\d{16}$/);
      expect(result.account_type).toBe('SAVINGS');
      expect(result.opened_date).toBeInstanceOf(Date);
    });
    
    it('should generate same IDs for same application', async () => {
      const application = {
        application_id: 'A2000010',
        full_name: 'FATIMA KHAN'
      };
      
      const result1 = await createAccount(application);
      const result2 = await createAccount(application);
      
      expect(result1.customer_id).toBe(result2.customer_id);
      expect(result1.account_number).toBe(result2.account_number);
    });
  });
});

// Test the worked examples from case_studies.md
describe('Worked Examples Validation', () => {
  it('Example 10: HIGH risk should route to PENDING_CHECKER', () => {
    // A2000010: Fatima Khan, HIGH risk
    expect(determineRouting('APPROVE', 'HIGH')).toBe('PENDING_CHECKER');
  });
  
  it('Example 11: Maker-checker enforcement', () => {
    const application = { maker_user_id: 'U1' };
    expect(() => validateMakerChecker(application, 'U1')).toThrow('Maker and checker must be different');
    expect(() => validateMakerChecker(application, 'U2')).not.toThrow();
  });
});
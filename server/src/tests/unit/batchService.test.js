/**
 * Batch Service Unit Test
 * Tests /output/decisions_output.csv format and reconciliation
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { formatDecisionsToCsv, processBatch } = require('../../services/batchService');

describe('Batch Processing and CSV Output', () => {
  it('should format decisions to CSV matching Section 6.3 specifications', () => {
    const decisions = [
      {
        application_id: 'A2000001',
        decision: 'APPROVE',
        reason_codes: [],
        name_match_score: 1.0,
        risk_category: 'LOW',
        rekyc_due_date: '2036-03-04',
      },
      {
        application_id: 'A2000002',
        decision: 'REJECT',
        reason_codes: ['AGE_BELOW_18'],
        name_match_score: 1.0,
        risk_category: null,
        rekyc_due_date: null,
      },
      {
        application_id: 'A2000004',
        decision: 'REVIEW',
        reason_codes: ['NAME_MISMATCH_MINOR'],
        name_match_score: 0.7647,
        risk_category: 'LOW',
        rekyc_due_date: '2036-03-04',
      },
    ];

    const csv = formatDecisionsToCsv(decisions);
    const lines = csv.split('\n');

    assert.strictEqual(lines[0], 'application_id,decision,reason_codes,name_match_score,risk_category,rekyc_due_date');
    assert.strictEqual(lines[1], 'A2000001,APPROVE,,1.0000,LOW,2036-03-04');
    assert.strictEqual(lines[2], 'A2000002,REJECT,AGE_BELOW_18,1.0000,,');
    assert.strictEqual(lines[3], 'A2000004,REVIEW,NAME_MISMATCH_MINOR,0.7647,LOW,2036-03-04');
  });

  it('should execute processBatch and write decisions_output.csv file', () => {
    const testOutputPath = path.join(__dirname, '../../../output/test_decisions_output.csv');

    const applications = [
      {
        application_id: 'A2000001',
        application_date: '2026-03-04',
        full_name: 'Ravi Kumar Sharma',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821',
        pincode: '400001',
        occupation_risk_level: 'LOW',
        annual_income: 900000,
      },
    ];

    const documents = [
      { application_id: 'A2000001', doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
      { application_id: 'A2000001', doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
      { application_id: 'A2000001', doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' },
    ];

    const extractions = {
      D1: {
        classified_doc_type: 'PAN_CARD',
        doc_type_confidence: 0.95,
        fields: {
          pan_number: { value: 'ZZKPS1234Q', confidence: 0.95 },
          name: { value: 'Ravi Kumar Sharma', confidence: 0.95 },
          dob: { value: '1990-05-15', confidence: 0.95 },
        },
      },
      D2: {
        classified_doc_type: 'AADHAAR_CARD',
        doc_type_confidence: 0.95,
        fields: {
          aadhaar_last4: { value: '4821', confidence: 0.95 },
          name: { value: 'Ravi Kumar Sharma', confidence: 0.95 },
          dob: { value: '1990-05-15', confidence: 0.95 },
        },
      },
      D3: {
        classified_doc_type: 'ELECTRICITY_BILL',
        doc_type_confidence: 0.95,
        fields: {
          document_date: { value: '2026-02-12', confidence: 0.95 },
          pincode: { value: '400001', confidence: 0.95 },
        },
      },
    };

    const result = processBatch(applications, documents, extractions, {}, { sanctions: [], pep: [] }, [], testOutputPath);

    assert.strictEqual(result.decisions.length, 1);
    assert.strictEqual(result.decisions[0].decision, 'APPROVE');
    assert.strictEqual(fs.existsSync(testOutputPath), true);

    // Cleanup test file
    fs.unlinkSync(testOutputPath);
  });
});

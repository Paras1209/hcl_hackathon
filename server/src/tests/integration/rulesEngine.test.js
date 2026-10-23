/**
 * Integration Tests: Rules Engine (R1-R17)
 * Tests all business rules from case_studies.md Section 6.1
 */

const { describe, it, expect, beforeAll } = require('vitest');
const path = require('path');
const fs = require('fs');
const { evaluateApplication } = require('../../services/rulesEngine');
const { parseCSV, parseJSONL, WORKED_EXAMPLES, getApplicationDocuments, getDocumentText } = require('./setup');

const DATASET_DIR = path.join(__dirname, '..', '..', '..', '..', 'dataset');
const SAMPLE_APPS_FILE = path.join(DATASET_DIR, 'case_02_applications_sample_V1.0.csv');
const SAMPLE_DOC_TEXT_FILE = path.join(DATASET_DIR, 'case_02_document_text_sample_V1.0.jsonl');
const SAMPLE_EXTRACTION_FILE = path.join(DATASET_DIR, 'case_02_extraction_mock_sample_V1.0.csv');

// Load extraction mock data
let extractionMockData = {};
if (fs.existsSync(SAMPLE_EXTRACTION_FILE)) {
  const extractions = parseCSV(SAMPLE_EXTRACTION_FILE);
  for (const row of extractions) {
    if (!extractionMockData[row.doc_id]) {
      extractionMockData[row.doc_id] = [];
    }
    extractionMockData[row.doc_id].push(row);
  }
}

// Load document texts
let documentTexts = {};
if (fs.existsSync(SAMPLE_DOC_TEXT_FILE)) {
  const docs = parseJSONL(SAMPLE_DOC_TEXT_FILE);
  for (const doc of docs) {
    documentTexts[doc.doc_id] = doc;
  }
}

// Load applications
let applications = [];
if (fs.existsSync(SAMPLE_APPS_FILE)) {
  applications = parseCSV(SAMPLE_APPS_FILE);
}

// Get application by ID
function getApp(appId) {
  return applications.find(a => a.application_id === appId);
}

// Get documents for application
function getDocs(appId) {
  const app = getApp(appId);
  if (!app) return [];
  return getApplicationDocuments(appId).map(doc => ({
    doc_id: doc.doc_id,
    declared_doc_type: doc.declared_doc_type
  }));
}

// Get extraction for documents
function getExtractions(docIds) {
  const result = {};
  for (const docId of docIds) {
    if (extractionMockData[docId]) {
      result[docId] = extractionMockData[docId];
    }
  }
  return result;
}

describe('Rules Engine Integration Tests', () => {
  describe('Worked Examples (case_studies.md Section 6.4)', () => {
    // Example 1: Clean approval
    it('E1: A2000001 - Clean approval should AUTO_APPROVE', () => {
      const appId = 'A2000001';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {}, // default config
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('APPROVE');
      expect(evaluation.reason_codes).toEqual([]);
      expect(evaluation.name_match_score).toBe('1.0000');
      expect(evaluation.risk_category).toBe('LOW');
      expect(evaluation.rekyc_due_date).toBe('2036-03-04');
    });

    // Example 2: Age below 18
    it('E2: A2000002 - Age below 18 should AUTO_REJECT', () => {
      const appId = 'A2000002';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('AGE_BELOW_18');
      expect(evaluation.risk_category).toBeUndefined();
      expect(evaluation.rekyc_due_date).toBeUndefined();
    });

    // Example 3: PAN mismatch
    it('E3: A2000003 - PAN mismatch should REJECT', () => {
      const appId = 'A2000003';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('PAN_MISMATCH');
    });

    // Example 4: Name mismatch minor
    it('E4: A2000004 - Name mismatch minor should REVIEW', () => {
      const appId = 'A2000004';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('NAME_MISMATCH_MINOR');
      expect(evaluation.name_match_score).toBe('0.7647');
      expect(evaluation.risk_category).toBe('LOW');
    });

    // Example 5: Address proof stale
    it('E5: A2000005 - Address proof stale should REVIEW', () => {
      const appId = 'A2000005';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('ADDRESS_PROOF_STALE');
    });

    // Example 6: Sanctions match
    it('E6: A2000006 - Sanctions match should REJECT', () => {
      const appId = 'A2000006';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      // Load sanctions list
      const sanctionsFile = path.join(DATASET_DIR, 'case_02_sanctions_list_V1.0.csv');
      const sanctions = parseCSV(sanctionsFile);
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions, pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('SANCTIONS_MATCH');
    });

    // Example 7: PEP match
    it('E7: A2000007 - PEP match should REVIEW with HIGH risk', () => {
      const appId = 'A2000007';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      // Load PEP list
      const pepFile = path.join(DATASET_DIR, 'case_02_pep_list_V1.0.csv');
      const pep = parseCSV(pepFile);
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep },
        []
      );
      
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('PEP_MATCH');
      expect(evaluation.risk_category).toBe('HIGH');
      expect(evaluation.rekyc_due_date).toBe('2028-03-04');
    });

    // Example 8: Document type mismatch
    it('E8: A2000008 - Document type mismatch should REVIEW', () => {
      const appId = 'A2000008';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('DOCUMENT_TYPE_MISMATCH');
      expect(evaluation.reason_codes).toContain('DOCUMENT_MISSING');
    });

    // Example 9: Low extraction confidence
    it('E9: A2000009 - Low extraction confidence should REVIEW', () => {
      const appId = 'A2000009';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income)
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('LOW_EXTRACTION_CONFIDENCE');
    });

    // Example 10: HIGH risk approval (needs checker)
    it('E10: A2000010 - HIGH risk approval should PENDING_CHECKER', () => {
      const appId = 'A2000010';
      const app = getApp(appId);
      const docs = getDocs(appId);
      const extractions = getExtractions(docs.map(d => d.doc_id));
      
      const evaluation = evaluateApplication(
        {
          application_id: appId,
          application_date: app.application_date,
          full_name: app.full_name,
          dob: app.dob,
          gender: app.gender,
          pan_number: app.pan_number,
          aadhaar_last4: app.aadhaar_last4,
          mobile: app.mobile,
          email: app.email,
          address: app.address,
          city: app.city,
          state: app.state,
          pincode: app.pincode,
          occupation_code: app.occupation_code,
          annual_income: Number(app.annual_income),
          occupation_risk_level: 'HIGH' // JEWELLER_BULLION_DEALER is HIGH
        },
        docs,
        extractions,
        {},
        { sanctions: [], pep: [] },
        []
      );
      
      expect(evaluation.decision).toBe('APPROVE');
      expect(evaluation.risk_category).toBe('HIGH');
      expect(evaluation.rekyc_due_date).toBe('2028-03-04');
    });
  });

  describe('Rule R1: Document Missing', () => {
    it('R1: Should REVIEW if PAN card is missing', () => {
      const app = {
        application_id: 'TEST001',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D2', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' }]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('DOCUMENT_MISSING');
    });

    it('R1: Should REVIEW if Aadhaar is missing', () => {
      const app = {
        application_id: 'TEST002',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' }]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('DOCUMENT_MISSING');
    });
  });

  describe('Rule R2: Document Type Mismatch', () => {
    it('R2: Should REVIEW if declared type differs from classified type', () => {
      const app = {
        application_id: 'TEST003',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D3: [{ doc_id: 'D3', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' }]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('DOCUMENT_TYPE_MISMATCH');
    });
  });

  describe('Rule R3: Low Extraction Confidence', () => {
    it('R3: Should REVIEW if doc type confidence is below 0.80', () => {
      const app = {
        application_id: 'TEST004',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '0.75' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D3: [{ doc_id: 'D3', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' }]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('LOW_EXTRACTION_CONFIDENCE');
    });

    it('R3: Should REVIEW if required field confidence is below 0.80', () => {
      const app = {
        application_id: 'TEST005',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [
          { doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' },
          { doc_id: 'D1', field_name: 'pan_number', value: 'ZZKPS1234Q', confidence: '0.95' },
          { doc_id: 'D1', field_name: 'name', value: 'Test User', confidence: '0.95' },
          { doc_id: 'D1', field_name: 'dob', value: '1990-05-15', confidence: '0.95' }
        ],
        D2: [
          { doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' },
          { doc_id: 'D2', field_name: 'aadhaar_last4', value: '4821', confidence: '0.95' }
        ],
        D3: [
          { doc_id: 'D3', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' },
          { doc_id: 'D3', field_name: 'pincode', value: '400001', confidence: '0.70' }
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('LOW_EXTRACTION_CONFIDENCE');
    });
  });

  describe('Rule R4: Age Below 18', () => {
    it('R4: Should REJECT if age is below 18', () => {
      const app = {
        application_id: 'TEST006',
        application_date: '2026-03-04',
        full_name: 'Minor User',
        dob: '2015-05-15', // Age 10
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('AGE_BELOW_18');
    });
  });

  describe('Rule R5: PAN Invalid', () => {
    it('R5: Should REJECT if PAN format is invalid', () => {
      const app = {
        application_id: 'TEST007',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'INVALID123', // Invalid format
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('PAN_INVALID');
    });

    it('R5: Should REJECT if 4th char of PAN is not P', () => {
      const app = {
        application_id: 'TEST008',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKAX1234Q', // 4th char is X, not P
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('PAN_INVALID');
    });
  });

  describe('Rule R6: PAN Mismatch', () => {
    it('R6: Should REJECT if PAN on card differs from declared', () => {
      const app = {
        application_id: 'TEST009',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q', // Declared
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [
          { doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' },
          { doc_id: 'D1', field_name: 'pan_number', value: 'ZZMPN1234Q', confidence: '1.0' } // Different
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('PAN_MISMATCH');
    });
  });

  describe('Rule R7: DOB Mismatch', () => {
    it('R7: Should REJECT if DOB on card differs from declared', () => {
      const app = {
        application_id: 'TEST010',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15', // Declared
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [
          { doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' },
          { doc_id: 'D1', field_name: 'dob', value: '1985-05-15', confidence: '1.0' } // Different
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('DOB_MISMATCH');
    });
  });

  describe('Rule R8: Aadhaar Mismatch', () => {
    it('R8: Should REJECT if Aadhaar last 4 differs from declared', () => {
      const app = {
        application_id: 'TEST011',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821' // Declared
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D2: [
          { doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' },
          { doc_id: 'D2', field_name: 'aadhaar_last4', value: '9999', confidence: '1.0' } // Different
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('AADHAAR_MISMATCH');
    });
  });

  describe('Rule R9: Name Mismatch', () => {
    it('R9: Should REJECT if name_match_score < 0.75', () => {
      const app = {
        application_id: 'TEST012',
        application_date: '2026-03-04',
        full_name: 'AAAAAAAAAAAAAAAAAAAAA', // Very different name
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' }
      ];
      
      const extractions = {
        D1: [
          { doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' },
          { doc_id: 'D1', field_name: 'name', value: 'Test User', confidence: '1.0' }
        ],
        D2: [
          { doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' },
          { doc_id: 'D2', field_name: 'name', value: 'Test User', confidence: '1.0' }
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('NAME_MISMATCH');
    });
  });

  describe('Rule R10: Sanctions Match', () => {
    it('R10: Should REJECT if sanctions match found', () => {
      const app = {
        application_id: 'TEST013',
        application_date: '2026-03-04',
        full_name: 'Valko Quillon', // From sample data
        dob: '1986-02-23',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const sanctions = [
        { list_id: 'SAN0001', name: 'SANCTIONS PERSON', dob: '', nationality: 'XA' },
        { list_id: 'SAN0002', name: 'Valko Quillon', dob: '1986-02-23', nationality: 'XB' }
      ];
      
      const evaluation = evaluateApplication(app, docs, extractions, {}, { sanctions, pep: [] }, []);
      expect(evaluation.decision).toBe('REJECT');
      expect(evaluation.reason_codes).toContain('SANCTIONS_MATCH');
    });
  });

  describe('Rule R11: Name Mismatch Minor', () => {
    it('R11: Should REVIEW if name_match_score is 0.75 to 0.90', () => {
      const app = {
        application_id: 'TEST014',
        application_date: '2026-03-04',
        full_name: 'Ravi Kumar Sharma',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [
          { doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' },
          { doc_id: 'D1', field_name: 'name', value: 'Ravi K Sharma', confidence: '1.0' } // Slightly different
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('NAME_MISMATCH_MINOR');
      expect(evaluation.risk_category).toBe('LOW');
    });
  });

  describe('Rule R12: Document Expired', () => {
    it('R12: Should REVIEW if driving licence is expired', () => {
      const app = {
        application_id: 'TEST015',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821',
        pincode: '400001'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'DRIVING_LICENCE' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D3: [
          { doc_id: 'D3', field_name: 'doc_type', value: 'DRIVING_LICENCE', confidence: '1.0' },
          { doc_id: 'D3', field_name: 'valid_until', value: '2025-01-01', confidence: '1.0' }, // Expired
          { doc_id: 'D3', field_name: 'pincode', value: '400001', confidence: '1.0' }
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('DOCUMENT_EXPIRED');
    });
  });

  describe('Rule R13: Address Proof Stale', () => {
    it('R13: Should REVIEW if electricity bill is more than 90 days old', () => {
      const app = {
        application_id: 'TEST016',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821',
        pincode: '400001'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D3: [
          { doc_id: 'D3', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' },
          { doc_id: 'D3', field_name: 'document_date', value: '2025-11-04', confidence: '1.0' }, // 90+ days old
          { doc_id: 'D3', field_name: 'pincode', value: '400001', confidence: '1.0' }
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('ADDRESS_PROOF_STALE');
    });
  });

  describe('Rule R14: Address Mismatch', () => {
    it('R14: Should REVIEW if pincode on address proof differs', () => {
      const app = {
        application_id: 'TEST017',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821',
        pincode: '400001'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D1: [{ doc_id: 'D1', field_name: 'doc_type', value: 'PAN_CARD', confidence: '1.0' }],
        D2: [{ doc_id: 'D2', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: '1.0' }],
        D3: [
          { doc_id: 'D3', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '1.0' },
          { doc_id: 'D3', field_name: 'document_date', value: '2026-02-01', confidence: '1.0' },
          { doc_id: 'D3', field_name: 'pincode', value: '400002', confidence: '1.0' } // Different
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('ADDRESS_MISMATCH');
    });
  });

  describe('Rule R15: Sanctions Possible Match', () => {
    it('R15: Should REVIEW if sanctions possible match found', () => {
      const app = {
        application_id: 'TEST018',
        application_date: '2026-03-04',
        full_name: 'John Doe',
        dob: '1990-01-01',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const sanctions = [
        { list_id: 'SAN0003', name: 'John D', dob: '1990-01-02', nationality: 'XC' } // Similar but different DOB
      ];
      
      const evaluation = evaluateApplication(app, docs, extractions, {}, { sanctions, pep: [] }, []);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('SANCTIONS_POSSIBLE_MATCH');
    });
  });

  describe('Rule R16: PEP Match', () => {
    it('R16: Should REVIEW if PEP match found', () => {
      const app = {
        application_id: 'TEST019',
        application_date: '2026-03-04',
        full_name: 'Politically Exposed Person',
        dob: '1960-01-01',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const pep = [
        { pep_id: 'PEP0001', name: 'Politically Exposed Person', dob: '1960-01-01', position: 'Minister', category: 'DOMESTIC' }
      ];
      
      const evaluation = evaluateApplication(app, docs, extractions, {}, { sanctions: [], pep }, []);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('PEP_MATCH');
      expect(evaluation.risk_category).toBe('HIGH');
    });
  });

  describe('Rule R17: Duplicate Customer', () => {
    it('R17: Should REVIEW if PAN exists in existing customers', () => {
      const app = {
        application_id: 'TEST020',
        application_date: '2026-03-04',
        full_name: 'Existing Customer',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q', // Same as existing
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {};
      
      const existingCustomers = [
        { customer_id: 'CUST001', full_name: 'Existing Customer', pan_number: 'ZZKPS1234Q', dob: '1990-05-15' }
      ];
      
      const evaluation = evaluateApplication(app, docs, extractions, {}, { sanctions: [], pep: [] }, existingCustomers);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes).toContain('DUPLICATE_CUSTOMER');
    });
  });

  describe('Multiple Rules Triggered', () => {
    it('Should return all triggered reason codes', () => {
      const app = {
        application_id: 'TEST021',
        application_date: '2026-03-04',
        full_name: 'Test User',
        dob: '1990-05-15',
        pan_number: 'ZZKPS1234Q',
        aadhaar_last4: '4821'
      };
      
      const docs = [
        { doc_id: 'D1', declared_doc_type: 'PAN_CARD' }, // Missing Aadhaar
        { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' }
      ];
      
      const extractions = {
        D3: [
          { doc_id: 'D3', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: '0.70' } // Low confidence
        ]
      };
      
      const evaluation = evaluateApplication(app, docs, extractions);
      expect(evaluation.decision).toBe('REVIEW');
      expect(evaluation.reason_codes.length).toBeGreaterThanOrEqual(2);
      expect(evaluation.reason_codes).toContain('LOW_EXTRACTION_CONFIDENCE');
    });
  });
});
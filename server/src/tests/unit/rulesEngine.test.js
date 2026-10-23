/**
 * Unit Tests for Rules Engine & Name Matching
 * Tests Worked Examples 1 - 10 from case_studies.md Section 6.4
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { normalizeName, calculateSimilarity, computeNameMatchScore } = require('../../services/nameMatching');
const { evaluateApplication } = require('../../services/rulesEngine');
const { calculateRekycDueDate, calculateRiskCategory } = require('../../services/riskCalculation');
const { screenSanctions, screenPEP } = require('../../services/watchlistScreening');

describe('Name Normalization and Matching', () => {
  it('should normalize name correctly removing titles and sorting tokens', () => {
    const raw = 'Mr. Rajesh-Kumar Sharma';
    const normalized = normalizeName(raw);
    assert.strictEqual(normalized, 'KUMAR RAJESH SHARMA');
  });

  it('should calculate similarity for Worked Example 4 (Ravi Kumar Sharma vs Ravi K Sharma = 0.7647)', () => {
    const name1 = 'Ravi Kumar Sharma';
    const name2 = 'Ravi K Sharma';

    const norm1 = normalizeName(name1);
    const norm2 = normalizeName(name2);

    assert.strictEqual(norm1, 'KUMAR RAVI SHARMA'); // 17 chars
    assert.strictEqual(norm2, 'K RAVI SHARMA');     // 13 chars

    const sim = calculateSimilarity(name1, name2);
    assert.strictEqual(Number(sim.toFixed(4)), 0.7647);
  });
});

describe('Rules Engine - Worked Examples 1 to 10', () => {
  const baseApplication = {
    application_date: '2026-03-04',
    address: 'Flat 12, Lotus Residency, MG Road, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    occupation_code: 'SALARIED_PRIVATE',
    occupation_risk_level: 'LOW',
    annual_income: 900000,
  };

  const createCleanDocs = (app) => [
    { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
    { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
    { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' },
  ];

  const createCleanExtractions = (app) => ({
    D1: {
      classified_doc_type: 'PAN_CARD',
      doc_type_confidence: 0.95,
      fields: {
        pan_number: { value: app.pan_number, confidence: 0.95 },
        name: { value: app.full_name, confidence: 0.95 },
        dob: { value: app.dob, confidence: 0.95 },
      },
    },
    D2: {
      classified_doc_type: 'AADHAAR_CARD',
      doc_type_confidence: 0.95,
      fields: {
        aadhaar_last4: { value: app.aadhaar_last4, confidence: 0.95 },
        name: { value: app.full_name, confidence: 0.95 },
        dob: { value: app.dob, confidence: 0.95 },
      },
    },
    D3: {
      classified_doc_type: 'ELECTRICITY_BILL',
      doc_type_confidence: 0.95,
      fields: {
        document_date: { value: '2026-02-12', confidence: 0.95 }, // 20 days prior
        pincode: { value: app.pincode, confidence: 0.95 },
      },
    },
  });

  // Example 1: Clean Application
  it('Example 1: A2000001 - Clean application -> APPROVE', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000001',
      full_name: 'Ravi Kumar Sharma',
      dob: '1990-05-15',
      pan_number: 'ZZKPS1234Q',
      aadhaar_last4: '4821',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'APPROVE');
    assert.deepStrictEqual(result.reason_codes, []);
    assert.strictEqual(result.name_match_score, 1.0000);
    assert.strictEqual(result.risk_category, 'LOW');
    assert.strictEqual(result.rekyc_due_date, '2036-03-04');
  });

  // Example 2: Age below 18
  it('Example 2: A2000002 - Age 17 -> REJECT (AGE_BELOW_18)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000002',
      full_name: 'Kavya Iyer',
      dob: '2008-09-10', // Age 17 on 2026-03-04
      pan_number: 'ZZKPI5678R',
      aadhaar_last4: '1234',
      occupation_code: 'STUDENT',
      occupation_risk_level: 'LOW',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'REJECT');
    assert.deepStrictEqual(result.reason_codes, ['AGE_BELOW_18']);
    assert.strictEqual(result.name_match_score, 1.0000);
    assert.strictEqual(result.risk_category, null);
    assert.strictEqual(result.rekyc_due_date, null);
  });

  // Example 3: PAN Mismatch
  it('Example 3: A2000003 - PAN mismatch -> REJECT (PAN_MISMATCH)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000003',
      full_name: 'Sunil Verma',
      dob: '1985-04-12',
      pan_number: 'ZZMPN3456S', // Declared
      aadhaar_last4: '5566',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);
    // Document shows different PAN
    extractions.D1.fields.pan_number.value = 'ZZMPN3465S';

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'REJECT');
    assert.ok(result.reason_codes.includes('PAN_MISMATCH'));
  });

  // Example 4: Minor Name Mismatch
  it('Example 4: A2000004 - Minor Name Mismatch -> REVIEW (NAME_MISMATCH_MINOR)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000004',
      full_name: 'Ravi Kumar Sharma',
      dob: '1990-05-15',
      pan_number: 'ZZKPS1234Q',
      aadhaar_last4: '4821',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);
    // PAN card has 'Ravi K Sharma'
    extractions.D1.fields.name.value = 'Ravi K Sharma';

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'REVIEW');
    assert.deepStrictEqual(result.reason_codes, ['NAME_MISMATCH_MINOR']);
    assert.strictEqual(result.name_match_score, 0.7647);
    assert.strictEqual(result.risk_category, 'LOW');
    assert.strictEqual(result.rekyc_due_date, '2036-03-04');
  });

  // Example 5: Stale Address Proof (120 days old)
  it('Example 5: A2000005 - Address proof dated 120 days ago -> REVIEW (ADDRESS_PROOF_STALE)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000005',
      full_name: 'Anil Deshmukh',
      dob: '1992-07-20',
      pan_number: 'ZZAPD9876T',
      aadhaar_last4: '9900',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);
    // Electricity bill dated 2025-11-04 (120 days before 2026-03-04)
    extractions.D3.fields.document_date.value = '2025-11-04';

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('ADDRESS_PROOF_STALE'));
    assert.strictEqual(result.risk_category, 'LOW');
  });

  // Example 6: Sanctions Match
  it('Example 6: A2000006 - Sanctions match -> REJECT (SANCTIONS_MATCH)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000006',
      full_name: 'Valko Quillon',
      dob: '1986-02-23',
      pan_number: 'ZZPVQ1122U',
      aadhaar_last4: '7788',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);

    const watchlists = {
      sanctions: [
        { list_id: 'SAN0002', name: 'Valko Quillon', dob: '1986-02-23', program: 'GLOBAL' }
      ],
      pep: []
    };

    const result = evaluateApplication(app, docs, extractions, {}, watchlists);

    assert.strictEqual(result.decision, 'REJECT');
    assert.ok(result.reason_codes.includes('SANCTIONS_MATCH'));
  });

  // Example 7: PEP Match
  it('Example 7: A2000007 - PEP match -> REVIEW (PEP_MATCH), Risk HIGH', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000007',
      full_name: 'Zoya Menon',
      dob: '1982-10-15',
      pan_number: 'ZZKPZ3344V',
      aadhaar_last4: '3344',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);

    const watchlists = {
      sanctions: [],
      pep: [
        { pep_id: 'PEP0001', name: 'Zoya Menon', dob: '1982-10-15', position: 'Minister' }
      ]
    };

    const result = evaluateApplication(app, docs, extractions, {}, watchlists);

    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('PEP_MATCH'));
    assert.strictEqual(result.risk_category, 'HIGH');
    assert.strictEqual(result.rekyc_due_date, '2028-03-04'); // +2 years
  });

  // Example 8: Doc declared AADHAAR is BANK_STATEMENT
  it('Example 8: A2000008 - Mismatch doc type -> REVIEW (DOCUMENT_MISSING|DOCUMENT_TYPE_MISMATCH)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000008',
      full_name: 'Meera Nair',
      dob: '1995-01-30',
      pan_number: 'ZZKPM5566W',
      aadhaar_last4: '1122',
    };

    // D2 declared as AADHAAR_CARD but classified as BANK_STATEMENT
    const docs = [
      { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
      { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
      { doc_id: 'D3', declared_doc_type: 'ELECTRICITY_BILL' },
    ];

    const extractions = {
      D1: {
        classified_doc_type: 'PAN_CARD',
        doc_type_confidence: 0.95,
        fields: {
          pan_number: { value: app.pan_number, confidence: 0.95 },
          name: { value: app.full_name, confidence: 0.95 },
          dob: { value: app.dob, confidence: 0.95 },
        },
      },
      D2: {
        classified_doc_type: 'BANK_STATEMENT',
        doc_type_confidence: 0.95,
        fields: {
          document_date: { value: '2026-02-10', confidence: 0.90 },
          pincode: { value: '400001', confidence: 0.90 },
        },
      },
      D3: {
        classified_doc_type: 'ELECTRICITY_BILL',
        doc_type_confidence: 0.95,
        fields: {
          document_date: { value: '2026-02-12', confidence: 0.95 },
          pincode: { value: app.pincode, confidence: 0.95 },
        },
      },
    };

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('DOCUMENT_MISSING'));
    assert.ok(result.reason_codes.includes('DOCUMENT_TYPE_MISMATCH'));
  });

  // Example 9: Low confidence extraction skips PAN_MISMATCH
  it('Example 9: A2000009 - Low confidence extraction -> REVIEW (LOW_EXTRACTION_CONFIDENCE)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000009',
      full_name: 'Pooja Hegde',
      dob: '1991-11-22',
      pan_number: 'ZZTPS9012Y',
      aadhaar_last4: '6677',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);
    // OCR read wrong PAN with low confidence 0.62
    extractions.D1.fields.pan_number = { value: 'ZZTP59O12Y', confidence: 0.62 };

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('LOW_EXTRACTION_CONFIDENCE'));
    // PAN_MISMATCH must NOT be triggered because field is unusable!
    assert.strictEqual(result.reason_codes.includes('PAN_MISMATCH'), false);
  });

  // Example 10: High Risk Occupation (Bullion Dealer)
  it('Example 10: A2000010 - High risk occupation -> APPROVE, Risk HIGH, Re-KYC 2028-03-04', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000010',
      full_name: 'Fatima Khan',
      dob: '1989-08-14',
      pan_number: 'ZZKPF7788Z',
      aadhaar_last4: '8899',
      occupation_code: 'JEWELLER_BULLION_DEALER',
      occupation_risk_level: 'HIGH',
    };

    // Address proof is DRIVING_LICENCE
    const docs = [
      { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
      { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
      { doc_id: 'D3', declared_doc_type: 'DRIVING_LICENCE' },
    ];

    const extractions = {
      D1: {
        classified_doc_type: 'PAN_CARD',
        doc_type_confidence: 0.95,
        fields: {
          pan_number: { value: app.pan_number, confidence: 0.95 },
          name: { value: app.full_name, confidence: 0.95 },
          dob: { value: app.dob, confidence: 0.95 },
        },
      },
      D2: {
        classified_doc_type: 'AADHAAR_CARD',
        doc_type_confidence: 0.95,
        fields: {
          aadhaar_last4: { value: app.aadhaar_last4, confidence: 0.95 },
          name: { value: app.full_name, confidence: 0.95 },
          dob: { value: app.dob, confidence: 0.95 },
        },
      },
      D3: {
        classified_doc_type: 'DRIVING_LICENCE',
        doc_type_confidence: 0.95,
        fields: {
          valid_until: { value: '2030-05-20', confidence: 0.95 },
          pincode: { value: app.pincode, confidence: 0.95 },
        },
      },
    };

    const result = evaluateApplication(app, docs, extractions);

    assert.strictEqual(result.decision, 'APPROVE');
    assert.deepStrictEqual(result.reason_codes, []);
    assert.strictEqual(result.risk_category, 'HIGH');
    assert.strictEqual(result.rekyc_due_date, '2028-03-04');
  });

  // R12: Driving Licence Expired
  it('R12: Driving licence expired -> REVIEW (DOCUMENT_EXPIRED)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000012',
      full_name: 'Tarun Saxena',
      dob: '1987-03-10',
      pan_number: 'ZZKPT1122A',
      aadhaar_last4: '2233',
    };

    const docs = [
      { doc_id: 'D1', declared_doc_type: 'PAN_CARD' },
      { doc_id: 'D2', declared_doc_type: 'AADHAAR_CARD' },
      { doc_id: 'D3', declared_doc_type: 'DRIVING_LICENCE' },
    ];

    const extractions = {
      D1: {
        classified_doc_type: 'PAN_CARD',
        doc_type_confidence: 0.95,
        fields: {
          pan_number: { value: app.pan_number, confidence: 0.95 },
          name: { value: app.full_name, confidence: 0.95 },
          dob: { value: app.dob, confidence: 0.95 },
        },
      },
      D2: {
        classified_doc_type: 'AADHAAR_CARD',
        doc_type_confidence: 0.95,
        fields: {
          aadhaar_last4: { value: app.aadhaar_last4, confidence: 0.95 },
          name: { value: app.full_name, confidence: 0.95 },
          dob: { value: app.dob, confidence: 0.95 },
        },
      },
      D3: {
        classified_doc_type: 'DRIVING_LICENCE',
        doc_type_confidence: 0.95,
        fields: {
          valid_until: { value: '2025-01-01', confidence: 0.95 }, // Expired before 2026-03-04
          pincode: { value: app.pincode, confidence: 0.95 },
        },
      },
    };

    const result = evaluateApplication(app, docs, extractions);
    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('DOCUMENT_EXPIRED'));
  });

  // R14: Pincode Mismatch
  it('R14: Address proof pincode differs -> REVIEW (ADDRESS_MISMATCH)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000014',
      full_name: 'Pooja Bhatt',
      dob: '1993-05-18',
      pan_number: 'ZZKPB4455C',
      aadhaar_last4: '9988',
      pincode: '400001',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);
    extractions.D3.fields.pincode.value = '400050'; // Different pincode

    const result = evaluateApplication(app, docs, extractions);
    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('ADDRESS_MISMATCH'));
  });

  // R17: Duplicate Customer
  it('R17: PAN in existing customers -> REVIEW (DUPLICATE_CUSTOMER)', () => {
    const app = {
      ...baseApplication,
      application_id: 'A2000017',
      full_name: 'Ravi Kumar Sharma',
      dob: '1990-05-15',
      pan_number: 'ZZKPS1234Q',
      aadhaar_last4: '4821',
    };

    const docs = createCleanDocs(app);
    const extractions = createCleanExtractions(app);

    const existingCustomers = [
      { customer_id: 'CUST1001', full_name: 'Ravi Kumar Sharma', pan_number: 'ZZKPS1234Q' }
    ];

    const result = evaluateApplication(app, docs, extractions, {}, { sanctions: [], pep: [] }, existingCustomers);
    assert.strictEqual(result.decision, 'REVIEW');
    assert.ok(result.reason_codes.includes('DUPLICATE_CUSTOMER'));
  });
});

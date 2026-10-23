/**
 * Integration Test Setup
 * Loads sample data and config for integration testing
 */

const path = require('path');
const fs = require('fs');

// Test data paths
const DATASET_DIR = path.join(__dirname, '..', '..', 'dataset');
const SAMPLE_APPS_FILE = path.join(DATASET_DIR, 'case_02_applications_sample_V1.0.csv');
const SAMPLE_DOCS_FILE = path.join(DATASET_DIR, 'case_02_documents_sample_V1.0.csv');
const SAMPLE_DOC_TEXT_FILE = path.join(DATASET_DIR, 'case_02_document_text_sample_V1.0.jsonl');
const SAMPLE_EXTRACTION_FILE = path.join(DATASET_DIR, 'case_02_extraction_mock_sample_V1.0.csv');

// Expected values for worked examples (from case_studies.md)
const WORKED_EXAMPLES = {
  A2000001: {
    expected: { decision: 'APPROVE', reasonCodes: [], nameMatchScore: '1.0000', risk: 'LOW', rekyc: '2036-03-04' },
    description: 'Clean application - should AUTO_APPROVE'
  },
  A2000002: {
    expected: { decision: 'REJECT', reasonCodes: ['AGE_BELOW_18'], nameMatchScore: '1.0000' },
    description: 'Age below 18 - should AUTO_REJECT'
  },
  A2000003: {
    expected: { decision: 'REJECT', reasonCodes: ['PAN_MISMATCH'], nameMatchScore: '1.0000' },
    description: 'PAN mismatch - should REJECT'
  },
  A2000004: {
    expected: { decision: 'REVIEW', reasonCodes: ['NAME_MISMATCH_MINOR'], nameMatchScore: '0.7647', risk: 'LOW', rekyc: '2036-03-04' },
    description: 'Minor name mismatch - should go to REVIEW'
  },
  A2000005: {
    expected: { decision: 'REVIEW', reasonCodes: ['ADDRESS_PROOF_STALE'], nameMatchScore: '1.0000', risk: 'LOW' },
    description: 'Stale address proof - should REVIEW'
  },
  A2000006: {
    expected: { decision: 'REJECT', reasonCodes: ['SANCTIONS_MATCH'], nameMatchScore: '1.0000' },
    description: 'Sanctions match - should REJECT'
  },
  A2000007: {
    expected: { decision: 'REVIEW', reasonCodes: ['PEP_MATCH'], nameMatchScore: '1.0000', risk: 'HIGH', rekyc: '2028-03-04' },
    description: 'PEP match - should REVIEW with HIGH risk'
  },
  A2000008: {
    expected: { decision: 'REVIEW', reasonCodes: ['DOCUMENT_MISSING', 'DOCUMENT_TYPE_MISMATCH'], nameMatchScore: '1.0000', risk: 'LOW' },
    description: 'Document type mismatch - should REVIEW'
  },
  A2000009: {
    expected: { decision: 'REVIEW', reasonCodes: ['LOW_EXTRACTION_CONFIDENCE'], nameMatchScore: '1.0000', risk: 'LOW' },
    description: 'Low extraction confidence - should REVIEW'
  },
  A2000010: {
    expected: { decision: 'APPROVE', reasonCodes: [], nameMatchScore: '1.0000', risk: 'HIGH', rekyc: '2028-03-04' },
    description: 'HIGH risk approval - should go to PENDING_CHECKER'
  },
  A2000011: {
    expected: { decision: 'REVIEW', reasonCodes: ['NAME_MISMATCH_MINOR'], nameMatchScore: '0.7647', risk: 'LOW', rekyc: '2036-03-04' },
    description: 'Maker-checker test case'
  }
};

// Helper to parse CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

// Helper to parse JSONL
function parseJSONL(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').map(line => JSON.parse(line));
}

// Helper to get sample application data
function getSampleApplication(appId) {
  const apps = parseCSV(SAMPLE_APPS_FILE);
  return apps.find(a => a.application_id === appId);
}

// Helper to get documents for an application
function getApplicationDocuments(appId) {
  const docs = parseCSV(SAMPLE_DOCS_FILE);
  return docs.filter(d => d.application_id === appId);
}

// Helper to get document text
function getDocumentText(docId) {
  const texts = parseJSONL(SAMPLE_DOC_TEXT_FILE);
  return texts.find(t => t.doc_id === docId);
}

// Helper to get extraction data for documents
function getDocumentExtractions(docIds) {
  if (!fs.existsSync(SAMPLE_EXTRACTION_FILE)) {
    return {};
  }
  const extractions = parseCSV(SAMPLE_EXTRACTION_FILE);
  const result = {};
  docIds.forEach(docId => {
    const docExtractions = extractions.filter(e => e.doc_id === docId);
    if (docExtractions.length > 0) {
      result[docId] = docExtractions;
    }
  });
  return result;
}

// Helper to create test documents
function createTestDocuments(appId, docTypes) {
  const docs = [];
  const sampleDoc = getApplicationDocuments(appId)[0];
  
  docTypes.forEach((type, index) => {
    const docId = `D300000${index + 1}`;
    docs.push({
      doc_id: docId,
      application_id: appId,
      file_name: `${docId}.txt`,
      declared_doc_type: type,
      text: sampleDoc ? getDocumentText(sampleDoc.doc_id)?.text || '' : createMockDocumentText(type)
    });
  });
  
  return docs;
}

// Helper to create mock document text
function createMockDocumentText(docType) {
  const texts = {
    PAN_CARD: `INCOME TAX IDENTITY CARD (SYNTHETIC SPECIMEN)
SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT
Permanent Account Number
ZZKPS1234Q
Name
RAVI KUMAR SHARMA
Father's Name
MOHAN SHARMA
Date of Birth
15/05/1990
Signature
Hackathon synthetic data - fictional person and issuer - for software testing only`,
    
    AADHAAR_CARD: `AADHAAR - RESIDENT IDENTITY (SYNTHETIC SPECIMEN)
SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT
Ravi Kumar Sharma
DOB: 15/05/1990
MALE
Address: Flat 12, Lotus Residency, MG Road, Mumbai, Maharashtra
- 400001
XXXX XXXX 4821
Hackathon synthetic data - fictional person and issuer - for software testing only`,
    
    ELECTRICITY_BILL: `SAHYADRI POWER DISTRIBUTION LTD (fictional)
Electricity Bill - Synthetic Specimen
SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT
Consumer No.: EB902980759
Consumer Name: Ravi Kumar Sharma
Bill Date: 12-Feb-2026
Billing Period: 30 days
Units Consumed: 214 kWh
Amount Due: Rs. 1,842.00
Supply Address: Flat 12, Lotus Residency, MG Road, Mumbai, Maharashtra, PIN 400001
Pay before due date to avoid surcharge. This is a computer-generated bill.
Hackathon synthetic data - fictional person and issuer - for software testing only`,
    
    BANK_STATEMENT: `KONKAN COAST BANK (fictional)
Account Statement - Synthetic Specimen
SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT
Ravi Kumar Sharma
Flat 12, Lotus Residency, MG Road, Mumbai, Maharashtra
PIN: 400001
Statement Date: 12/02/2026
Account: XXXXXX5816
Date  Description            Amount
01  UPI/GROCERY            -1,240.00
03  SALARY CREDIT         +48,500.00
Hackathon synthetic data - fictional person and issuer - for software testing only`,
    
    DRIVING_LICENCE: `MINISTRY OF ROAD TRANSPORT AND HIGHWAYS (fictional)
Driving Licence - Synthetic Specimen
SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT
Name: Ravi Kumar Sharma
DOB: 15/05/1990
Gender: MALE
Address: Flat 12, Lotus Residency, MG Road, Mumbai, Maharashtra, PIN 400001
Licence No: 0123456789
Valid Until: 15/05/2030
Hackathon synthetic data - fictional person and issuer - for software testing only`
  };
  
  return texts[docType] || texts.PAN_CARD;
}

// Export test utilities
module.exports = {
  DATASET_DIR,
  SAMPLE_APPS_FILE,
  SAMPLE_DOCS_FILE,
  SAMPLE_DOC_TEXT_FILE,
  SAMPLE_EXTRACTION_FILE,
  WORKED_EXAMPLES,
  parseCSV,
  parseJSONL,
  getSampleApplication,
  getApplicationDocuments,
  getDocumentText,
  getDocumentExtractions,
  createTestDocuments,
  createMockDocumentText
};
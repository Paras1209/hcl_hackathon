/**
 * API Endpoints Test (using node:test and node:http)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const app = require('../../app');

let server;
let baseUrl;

before(
  () =>
    new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    })
);

after(
  () =>
    new Promise((resolve) => {
      server.close(resolve);
    })
);

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(data);
    const req = http.request(
      `${baseUrl}${urlPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${urlPath}`, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(raw) });
      });
    }).on('error', reject);
  });
}

describe('HTTP API Endpoints', () => {
  it('GET /health returns 200 with UP status', async () => {
    const res = await getJson('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
  });

  it('POST /api/applications with 12-digit Aadhaar returns 400 error', async () => {
    const res = await postJson('/api/applications', {
      full_name: 'Test Applicant',
      pan_number: 'ZZKPS1234Q',
      aadhaar_last4: '123456789012', // 12-digit input must be rejected!
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_AADHAAR');
  });

  it('POST /api/applications submits clean application and auto approves', async () => {
    const { extractionService } = require('../../modules/kyc/extractionService');
    extractionService.loadMockData([
      { doc_id: 'D101', field_name: 'doc_type', value: 'PAN_CARD', confidence: 0.95 },
      { doc_id: 'D101', field_name: 'pan_number', value: 'ZZKPS1234Q', confidence: 0.95 },
      { doc_id: 'D101', field_name: 'name', value: 'Ravi Kumar Sharma', confidence: 0.95 },
      { doc_id: 'D101', field_name: 'dob', value: '1990-05-15', confidence: 0.95 },
      { doc_id: 'D102', field_name: 'doc_type', value: 'AADHAAR_CARD', confidence: 0.95 },
      { doc_id: 'D102', field_name: 'aadhaar_last4', value: '4821', confidence: 0.95 },
      { doc_id: 'D102', field_name: 'name', value: 'Ravi Kumar Sharma', confidence: 0.95 },
      { doc_id: 'D102', field_name: 'dob', value: '1990-05-15', confidence: 0.95 },
      { doc_id: 'D103', field_name: 'doc_type', value: 'ELECTRICITY_BILL', confidence: 0.95 },
      { doc_id: 'D103', field_name: 'document_date', value: '2026-02-12', confidence: 0.95 },
      { doc_id: 'D103', field_name: 'pincode', value: '400001', confidence: 0.95 },
    ]);

    const res = await postJson('/api/applications', {
      application_id: 'A2000001',
      application_date: '2026-03-04',
      full_name: 'Ravi Kumar Sharma',
      dob: '1990-05-15',
      pan_number: 'ZZKPS1234Q',
      aadhaar_last4: '4821',
      pincode: '400001',
      occupation_risk_level: 'LOW',
      annual_income: 900000,
      documents: [
        { doc_id: 'D101', declared_doc_type: 'PAN_CARD' },
        { doc_id: 'D102', declared_doc_type: 'AADHAAR_CARD' },
        { doc_id: 'D103', declared_doc_type: 'ELECTRICITY_BILL' },
      ],
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.decision, 'APPROVE');
    assert.strictEqual(res.body.data.status, 'AUTO_APPROVED');
    assert.strictEqual(res.body.data.name_match_score, 1.0000);
  });

  it('GET /api/applications/:id fetches application with masked PAN', async () => {
    const res = await getJson('/api/applications/A2000001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.application_id, 'A2000001');
    assert.strictEqual(res.body.data.pan_number_masked, 'ZZKXXXXX4Q');
  });
});

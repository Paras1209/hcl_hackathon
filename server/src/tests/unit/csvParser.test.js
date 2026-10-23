/**
 * CSV Parser Unit Tests
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseCsvLine, parseCsv } = require('../../utils/csvParser');

describe('CSV Parser Utility', () => {
  it('should parse standard CSV line with commas', () => {
    const line = 'A2000001,APPROVE,1.0000,LOW';
    const cells = parseCsvLine(line);
    assert.deepStrictEqual(cells, ['A2000001', 'APPROVE', '1.0000', 'LOW']);
  });

  it('should parse CSV line with quoted cells containing commas', () => {
    const line = 'A2000001,"Ravi, Kumar",400001';
    const cells = parseCsvLine(line);
    assert.deepStrictEqual(cells, ['A2000001', 'Ravi, Kumar', '400001']);
  });

  it('should parse complete CSV content into array of objects', () => {
    const csv = 'application_id,decision,score\nA2000001,APPROVE,1.0000\nA2000002,REJECT,1.0000';
    const records = parseCsv(csv);

    assert.strictEqual(records.length, 2);
    assert.strictEqual(records[0].application_id, 'A2000001');
    assert.strictEqual(records[0].decision, 'APPROVE');
    assert.strictEqual(records[0].score, '1.0000');
    assert.strictEqual(records[1].application_id, 'A2000002');
    assert.strictEqual(records[1].decision, 'REJECT');
  });
});

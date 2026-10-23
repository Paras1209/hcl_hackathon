/**
 * Mock Extraction Provider
 * Reads simulated extraction output from memory, CSV rows, or simulated rule extractions.
 * Mirrors format from case_02_extraction_mock_sample_V1.0.csv
 */

class MockExtractionProvider {
  constructor(seedRows = []) {
    this.extractionDatabase = new Map();
    if (seedRows.length > 0) {
      this.loadSeedRows(seedRows);
    }
  }

  /**
   * Loads long-format extraction rows: [{ doc_id, field_name, value, confidence }]
   */
  loadSeedRows(rows = []) {
    for (const row of rows) {
      const docId = row.doc_id;
      if (!this.extractionDatabase.has(docId)) {
        this.extractionDatabase.set(docId, {
          doc_id: docId,
          classified_doc_type: null,
          doc_type_confidence: 0,
          fields: {},
        });
      }

      const entry = this.extractionDatabase.get(docId);
      if (row.field_name === 'doc_type') {
        entry.classified_doc_type = row.value;
        entry.doc_type_confidence = parseFloat(row.confidence) || 0;
      } else {
        entry.fields[row.field_name] = {
          value: row.value,
          confidence: parseFloat(row.confidence) || 0,
        };
      }
    }
  }

  /**
   * Extracts fields for a document.
   * If pre-seeded in database, returns the exact mock entry.
   * Otherwise returns a high-confidence pass-through based on declared_doc_type.
   *
   * @param {string} docId
   * @param {string} [docText]
   * @param {string} [declaredDocType]
   * @returns {Promise<Object>}
   */
  async extract(docId, docText = '', declaredDocType = '') {
    if (this.extractionDatabase.has(docId)) {
      return this.extractionDatabase.get(docId);
    }

    // Default simulated extraction for uploaded text
    return {
      doc_id: docId,
      classified_doc_type: declaredDocType || 'OTHER',
      doc_type_confidence: 0.95,
      fields: {},
    };
  }
}

module.exports = {
  MockExtractionProvider,
};

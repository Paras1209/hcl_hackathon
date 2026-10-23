/**
 * Mock Extraction Provider
 * Reads simulated extraction output from memory, CSV rows, or simulated rule extractions.
 * Mirrors format from case_02_extraction_mock_sample_V1.0.csv
 */

const fieldPatterns = {
  // PAN: ABCDE1234F (uppercase, 10 chars)
  pan_number: /pan[:\s]*([A-Z]{5}[0-9]{4}[A-Z])/gi,
  
  // Aadhaar: Last 4 digits only
  aadhaar_last4: /aadhaar[:\s]*(?:\d{4}\s{0,4}){2}(\d{4})/gi,
  
  // Date of Birth: DD/MM/YYYY or YYYY-MM-DD or DD-Mon-YYYY
  dob: /(?:date\s*of\s*birth|dob)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/gi,
  
  // Name: Any sequence of letters
  name: /(?:name|full\s*name|applicant)[:\s]*([A-Z][A-Za-z\s]+)/i,
  
  // Pincode: 6 digits
  pincode: /(?:pin|pincode|zip)[:\s]*([0-9]{6})/gi,
  
  // Address
  address: /(?:address)[:\s]*([^\n]+)/gi,
  
  // Gender
  gender: /(?:gender|sex)[:\s]*(male|female|other)/gi,
  
  // Document date
  document_date: /(?:date|issued)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/gi,
  
  // Valid until (driving license expiry)
  valid_until: /(?:valid until|expires?|expiry|valid till)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/gi,
};

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
   * Extract fields from document text using regex patterns
   */
  extractFieldsFromText(docText, declaredDocType) {
    const fields = {};
    const textUpper = docText.toUpperCase();
    
    // Classify document type from text content
    let classifiedType = declaredDocType || 'OTHER';
    let typeConfidence = 0.95;
    
    if (textUpper.includes('PAN') && textUpper.includes('PERMANENT ACCOUNT')) {
      classifiedType = 'PAN_CARD';
      typeConfidence = 0.98;
    } else if (textUpper.includes('AADHAAR') || textUpper.includes('आधार')) {
      classifiedType = 'AADHAAR_CARD';
      typeConfidence = 0.98;
    } else if (textUpper.includes('ELECTRICITY') || textUpper.includes('METER')) {
      classifiedType = 'ELECTRICITY_BILL';
      typeConfidence = 0.95;
    } else if (textUpper.includes('BANK') || textUpper.includes('ACCOUNT')) {
      classifiedType = 'BANK_STATEMENT';
      typeConfidence = 0.95;
    } else if (textUpper.includes('DRIVING') || textUpper.includes('LICENSE') || textUpper.includes('LICENCE')) {
      classifiedType = 'DRIVING_LICENCE';
      typeConfidence = 0.95;
    }

    // Extract fields based on patterns
    for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
      const matches = docText.match(pattern);
      if (matches && matches.length > 1) {
        // Get the first captured group (value)
        let value = matches[1].trim();
        
        // Normalize PAN to uppercase
        if (fieldName === 'pan_number') {
          value = value.toUpperCase();
        }
        
        // Normalize dates to YYYY-MM-DD
        if (['dob', 'document_date', 'valid_until'].includes(fieldName)) {
          value = this.normalizeDate(value);
        }
        
        // For aadhaar, ensure only 4 digits
        if (fieldName === 'aadhaar_last4') {
          value = value.slice(-4);
        }
        
        fields[fieldName] = {
          value: value,
          confidence: 0.85, // Regex-extracted fields get 0.85 confidence (not perfect OCR)
        };
      }
    }

    return {
      classified_doc_type: classifiedType,
      doc_type_confidence: typeConfidence,
      fields: fields,
    };
  }

  /**
   * Normalize dates to YYYY-MM-DD format
   */
  normalizeDate(dateStr) {
    if (!dateStr) return '';
    
    // Remove extra whitespace
    dateStr = dateStr.trim();
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // DD/MM/YYYY or DD-MM-YYYY
    const match1 = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match1) {
      const [, day, month, year] = match1;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    // YYYY-MM-DD or YYYY/MM/DD
    const match2 = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match2) {
      const [, year, month, day] = match2;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    return dateStr; // Return as-is if format not recognized
  }

  /**
   * Extracts fields for a document.
   * If pre-seeded in database, returns the exact mock entry.
   * Otherwise, extracts fields from document text using regex patterns.
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

    // Extract fields from uploaded document text
    const extraction = this.extractFieldsFromText(docText, declaredDocType);
    
    return {
      doc_id: docId,
      classified_doc_type: extraction.classified_doc_type,
      doc_type_confidence: extraction.doc_type_confidence,
      fields: extraction.fields,
    };
  }
}

module.exports = {
  MockExtractionProvider,
};

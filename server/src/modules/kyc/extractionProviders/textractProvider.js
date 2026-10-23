/**
 * Textract OCR Extraction Provider
 * Uses AWS Textract to perform OCR on uploaded documents.
 * Falls back to mock provider if AWS credentials are not available.
 */

const {
  TextractClient,
  AnalyzeDocumentCommand,
  FeatureType,
} = require('@aws-sdk/client-textract');
const { fromEnv } = require('@aws-sdk/credential-providers');

class TextractProvider {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.mockProvider = null;
    this.fallbackEnabled = true;
  }

  /**
   * Initialize Textract client with AWS credentials
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      const credentials = fromEnv()();
      
      this.client = new TextractClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: await credentials,
      });

      this.isInitialized = true;
      console.log('AWS Textract client initialized successfully');
    } catch (err) {
      console.warn(
        'AWS Textract initialization failed:',
        err.message,
        '- Using fallback mode'
      );
      
      if (this.fallbackEnabled) {
        const { MockExtractionProvider } = require('./mockProvider');
        this.mockProvider = new MockExtractionProvider();
      }
    }
  }

  /**
   * Extract fields from document using Textract OCR
   * @param {string} docId - Document ID
   * @param {string} docText - Document text (used for fallback)
   * @param {string} declaredDocType - Declared document type
   * @returns {Promise<Object>} - Extraction result with fields and confidence
   */
  async extract(docId, docText = '', declaredDocType = '') {
    // Initialize if not already done
    if (!this.isInitialized && !this.mockProvider) {
      await this.initialize();
    }

    // If Textract failed to initialize, fallback to mock
    if (!this.client && this.mockProvider) {
      console.log(`Using fallback extraction for ${docId}`);
      return this.mockProvider.extract(docId, docText, declaredDocType);
    }

    try {
      // Get document text from Cloudinary or use provided text
      const textContent = docText || '';
      
      if (!textContent || textContent.trim().length === 0) {
        console.warn(`No text content for ${docId}, using fallback`);
        if (this.mockProvider) {
          return this.mockProvider.extract(docId, docText, declaredDocType);
        }
        throw new Error('Empty document text');
      }

      // Call Textract to analyze document
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: Buffer.from(textContent, 'utf-8'),
        },
        Features: [FeatureType.FORMS, FeatureType.TABLES],
      });

      const response = await this.client.send(command);

      // Extract fields from Textract response
      const extractedFields = this.parseTextractResponse(response, declaredDocType);

      // Determine document type classification
      const docTypeClassification = this.classifyDocumentType(extractedFields, declaredDocType);

      return {
        doc_id: docId,
        classified_doc_type: docTypeClassification.doc_type,
        doc_type_confidence: docTypeClassification.confidence,
        fields: extractedFields,
        processed_at: new Date(),
      };
    } catch (err) {
      console.error(`Textract extraction failed for ${docId}:`, err.message);
      
      // Fallback to mock provider on error
      if (this.fallbackEnabled && this.mockProvider) {
        console.log(`Falling back to mock extraction for ${docId}`);
        return this.mockProvider.extract(docId, docText, declaredDocType);
      }

      throw err;
    }
  }

  /**
   * Parse Textract response and extract key fields
   * @param {Object} response - Textract response
   * @param {string} declaredDocType - Declared document type
   * @returns {Object} - Extracted fields
   */
  parseTextractResponse(response, declaredDocType) {
    const fields = {};
    const detectedText = [];

    // Collect all detected text blocks
    if (response.Blocks) {
      for (const block of response.Blocks) {
        if (block.BlockType === 'WORD') {
          detectedText.push(block.Text);
        } else if (block.BlockType === 'LINE') {
          detectedText.push(block.Text);
        }
      }
    }

    // Extract fields based on document type
    const textContent = detectedText.join(' ');

    switch (declaredDocType) {
      case 'PAN_CARD':
        fields.pan_number = this.extractPanNumber(textContent);
        fields.name = this.extractName(textContent);
        fields.dob = this.extractDate(textContent);
        fields.father_name = this.extractFatherName(textContent);
        break;

      case 'AADHAAR_CARD':
        fields.aadhaar_last4 = this.extractAadhaarLast4(textContent);
        fields.name = this.extractName(textContent);
        fields.dob = this.extractDate(textContent);
        fields.gender = this.extractGender(textContent);
        break;

      case 'ELECTRICITY_BILL':
        fields.document_date = this.extractDate(textContent);
        fields.account_number = this.extractAccountNumber(textContent);
        fields.pincode = this.extractPincode(textContent);
        break;

      case 'BANK_STATEMENT':
        fields.document_date = this.extractDate(textContent);
        fields.account_number = this.extractAccountNumber(textContent);
        fields.pincode = this.extractPincode(textContent);
        break;

      case 'DRIVING_LICENCE':
        fields.valid_until = this.extractDate(textContent);
        fields.name = this.extractName(textContent);
        fields.dob = this.extractDate(textContent);
        fields.licence_number = this.extractLicenceNumber(textContent);
        break;

      default:
        // Generic extraction
        fields.detected_text = detectedText.join('\n');
        break;
    }

    // Add confidence scores
    const fieldNames = Object.keys(fields);
    fields.confidence = fieldNames.length > 0 ? 0.85 : 0;

    return fields;
  }

  /**
   * Extract PAN number from text
   */
  extractPanNumber(text) {
    const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/;
    const match = text.match(panRegex);
    if (match) {
      return {
        value: match[0].toUpperCase(),
        confidence: 0.95,
        source: 'OCR',
      };
    }
    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract Aadhaar last 4 digits from text
   */
  extractAadhaarLast4(text) {
    // Look for 4-digit sequences at word boundaries
    const parts = text.match(/\b\d{4}\b/g);
    if (parts && parts.length >= 1) {
      return {
        value: parts[parts.length - 1], // Last 4 digits
        confidence: 0.9,
        source: 'OCR',
      };
    }
    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract name from text (simple heuristic)
   */
  extractName(text) {
    // Look for name patterns - this is a simple heuristic
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip lines that are clearly dates, numbers, or IDs
      if (line.length > 5 && line.length < 50) {
        if (!/^\d+$/.test(line) && !/[A-Z]{5}[0-9]{4}[A-Z]/.test(line)) {
          return {
            value: line,
            confidence: 0.8,
            source: 'OCR',
          };
        }
      }
    }
    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract date from text
   */
  extractDate(text) {
    // Various date patterns
    const datePatterns = [
      /\b(\d{2}[-/]\d{2}[-/]\d{4})\b/, // DD-MM-YYYY or DD/MM/YYYY
      /\b(\d{4}[-/]\d{2}[-/]\d{2})\b/, // YYYY-MM-DD
      /\b(\d{2}\s+[A-Za-z]{3}\s+\d{4})\b/, // DD Mon YYYY
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          value: match[1],
          confidence: 0.85,
          source: 'OCR',
        };
      }
    }

    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract father's name from text
   */
  extractFatherName(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('father') ||
          lines[i].toLowerCase().includes('father\'s') ||
          lines[i].toLowerCase().includes('f/o') ||
          lines[i].toLowerCase().includes('s/o')) {
        const name = lines[i].replace(/father|father's|f\/o|s\/o/i, '').trim();
        if (name.length > 2 && name.length < 50) {
          return {
            value: name,
            confidence: 0.8,
            source: 'OCR',
          };
        }
      }
    }
    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract account number from text
   */
  extractAccountNumber(text) {
    const patterns = [
      /account\s*no\.?\s*(\d+)/i,
      /acc\s*no\.?\s*(\d+)/i,
      /(\d{10,16})\b/, // Long numeric sequences
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          value: match[1],
          confidence: 0.85,
          source: 'OCR',
        };
      }
    }

    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract pincode from text
   */
  extractPincode(text) {
    // Indian pincode is 6 digits
    const pincodeRegex = /\b([6]\d{5})\b/;
    const match = text.match(pincodeRegex);
    if (match) {
      return {
        value: match[1],
        confidence: 0.9,
        source: 'OCR',
      };
    }
    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract license number from text
   */
  extractLicenceNumber(text) {
    // Driving license patterns vary, look for alphanumeric patterns
    const patterns = [
      /\b([A-Z]{2}\d{13})\b/, // Standard Indian DL pattern
      /\b([A-Z]{2}[ -]?\d{2}[ -]?\d{4}[ -]?\d{5})\b/, // Another common pattern
      /\b(DL-[A-Z]{2}-\d{11})\b/, // With dashes
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          value: match[1],
          confidence: 0.85,
          source: 'OCR',
        };
      }
    }

    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Extract gender from text
   */
  extractGender(text) {
    const maleMatch = /\b(MALE|F\/O|S\/O)\b/i.test(text);
    const femaleMatch = /\b(FEMALE|M\/O|D\/O)\b/i.test(text);

    if (maleMatch) {
      return { value: 'MALE', confidence: 0.9, source: 'OCR' };
    }
    if (femaleMatch) {
      return { value: 'FEMALE', confidence: 0.9, source: 'OCR' };
    }

    return { value: '', confidence: 0, source: 'OCR' };
  }

  /**
   * Classify document type based on extracted fields
   */
  classifyDocumentType(fields, declaredDocType) {
    const confidenceScores = {
      PAN_CARD: 0,
      AADHAAR_CARD: 0,
      ELECTRICITY_BILL: 0,
      BANK_STATEMENT: 0,
      DRIVING_LICENCE: 0,
      OTHER: 0,
    };

    // Simple keyword-based classification
    if (fields.pan_number && fields.pan_number.value) {
      confidenceScores.PAN_CARD = 0.95;
    }
    if (fields.aadhaar_last4 && fields.aadhaar_last4.value) {
      confidenceScores.AADHAAR_CARD = 0.95;
    }
    if (fields.account_number && fields.account_number.value) {
      if (declaredDocType === 'BANK_STATEMENT') {
        confidenceScores.BANK_STATEMENT = 0.9;
      } else {
        confidenceScores.ELECTRICITY_BILL = 0.8;
      }
    }
    if (fields.valid_until && fields.valid_until.value) {
      confidenceScores.DRIVING_LICENCE = 0.9;
    }

    // Return highest confidence document type
    let maxConfidence = 0;
    let docType = declaredDocType || 'OTHER';

    for (const [type, confidence] of Object.entries(confidenceScores)) {
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        docType = type;
      }
    }

    return {
      doc_type: docType,
      confidence: maxConfidence,
    };
  }
}

module.exports = {
  TextractProvider,
};
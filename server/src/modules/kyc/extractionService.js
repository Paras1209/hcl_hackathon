/**
 * Extraction Service Interface
 * Pluggable provider architecture supporting 'mock' and 'textract' providers.
 */

const { MockExtractionProvider } = require('./extractionProviders/mockProvider');
const { TextractProvider } = require('./extractionProviders/textractProvider');

class ExtractionService {
  constructor(providerName = process.env.EXTRACTION_PROVIDER || 'mock') {
    this.providerName = providerName;
    this.mockProvider = new MockExtractionProvider();
    this.textractProvider = new TextractProvider();
    this.providers = {
      mock: this.mockProvider,
      textract: this.textractProvider,
    };
  }

  registerProvider(name, providerInstance) {
    this.providers[name] = providerInstance;
  }

  setProvider(name) {
    if (!this.providers[name]) {
      throw new Error(`Extraction provider '${name}' is not registered`);
    }
    this.providerName = name;
  }

  /**
   * Extracts fields from document using active provider.
   * If extraction fails or times out, returns confidence 0 for document.
   */
  async extractDocument(docId, docText = '', declaredDocType = '') {
    const provider = this.providers[this.providerName] || this.mockProvider;
    
    try {
      // Special handling for Textract to ensure it's initialized
      if (this.providerName === 'textract' && this.textractProvider.initialize) {
        await this.textractProvider.initialize();
      }
      
      return await provider.extract(docId, docText, declaredDocType);
    } catch (err) {
      console.error(`Extraction failed for ${docId}:`, err.message);
      return {
        doc_id: docId,
        classified_doc_type: declaredDocType || 'OTHER',
        doc_type_confidence: 0,
        fields: {},
        error: err.message,
      };
    }
  }

  loadMockData(rows) {
    this.mockProvider.loadSeedRows(rows);
  }
}

// Export singleton instance
const extractionService = new ExtractionService();

module.exports = {
  ExtractionService,
  extractionService,
};

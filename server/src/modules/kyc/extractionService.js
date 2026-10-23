/**
 * Extraction Service Interface
 * Pluggable provider architecture supporting 'mock' and 'ai' providers.
 */

const { MockExtractionProvider } = require('./extractionProviders/mockProvider');

class ExtractionService {
  constructor(providerName = process.env.EXTRACTION_PROVIDER || 'mock') {
    this.providerName = providerName;
    this.mockProvider = new MockExtractionProvider();
    this.providers = {
      mock: this.mockProvider,
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
      return await provider.extract(docId, docText, declaredDocType);
    } catch (err) {
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

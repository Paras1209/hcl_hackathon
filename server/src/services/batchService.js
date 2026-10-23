/**
 * Batch Processing Service
 * Ingests applications, documents, and extractions to generate /output/decisions_output.csv
 * Follows case_studies.md Section 6.3
 */

const fs = require('fs');
const path = require('path');
const { evaluateApplication } = require('./rulesEngine');

/**
 * Formats decisions array to CSV string according to Section 6.3:
 * Columns: application_id, decision, reason_codes, name_match_score, risk_category, rekyc_due_date
 */
function formatDecisionsToCsv(decisions = []) {
  const headers = ['application_id', 'decision', 'reason_codes', 'name_match_score', 'risk_category', 'rekyc_due_date'];
  const lines = [headers.join(',')];

  for (const item of decisions) {
    const scoreStr = item.name_match_score !== null && item.name_match_score !== undefined
      ? Number(item.name_match_score).toFixed(4)
      : '';

    const row = [
      item.application_id || '',
      item.decision || '',
      item.reason_codes_str || (Array.isArray(item.reason_codes) ? item.reason_codes.join('|') : ''),
      scoreStr,
      item.risk_category || '',
      item.rekyc_due_date || '',
    ];

    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Runs batch evaluation on a list of applications and saves output to disk.
 *
 * @param {Array<Object>} applications
 * @param {Array<Object>} documents
 * @param {Object|Array} extractions
 * @param {Object} [config]
 * @param {Object} [watchlists]
 * @param {Array<Object>} [existingCustomers]
 * @param {string} [outputPath]
 * @returns {{ decisions: Array<Object>, csv: string, outputPath: string }}
 */
function processBatch(
  applications = [],
  documents = [],
  extractions = {},
  config = {},
  watchlists = { sanctions: [], pep: [] },
  existingCustomers = [],
  outputPath = path.join(__dirname, '../../../output/decisions_output.csv')
) {
  // Index documents by application_id
  const docsByAppId = new Map();
  for (const doc of documents) {
    const appId = doc.application_id;
    if (!docsByAppId.has(appId)) {
      docsByAppId.set(appId, []);
    }
    docsByAppId.get(appId).push(doc);
  }

  const decisions = [];

  for (const app of applications) {
    const appDocs = docsByAppId.get(app.application_id) || [];
    const evaluation = evaluateApplication(
      app,
      appDocs,
      extractions,
      config,
      watchlists,
      existingCustomers
    );

    decisions.push({
      application_id: app.application_id,
      ...evaluation,
    });
  }

  const csv = formatDecisionsToCsv(decisions);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, csv, 'utf8');

  return {
    decisions,
    csv,
    outputPath,
  };
}

module.exports = {
  formatDecisionsToCsv,
  processBatch,
};

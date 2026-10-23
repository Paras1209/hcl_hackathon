/**
 * Batch Controller
 * Handles batch processing of applications CSV, documents CSV, and mock extraction CSV.
 * Follows case_studies.md Section 6.3 and QUICK_REFERENCE.md.
 */

const path = require('path');
const fs = require('fs');
const { processBatch } = require('../services/batchService');
const { readCsvFile, parseCsv } = require('../utils/csvParser');

/**
 * Resolves a file path relative to server root, project root, or absolute path.
 */
function resolveFilePath(filePath) {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;

  const candidates = [
    path.join(__dirname, '../../../data', filePath),
    path.join(__dirname, '../../data', filePath),
    path.join(__dirname, '../../../', filePath),
    path.join(__dirname, '../../', filePath),
    path.resolve(process.cwd(), filePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), filePath);
}

/**
 * POST /api/batch/process
 * Ingests application files and generates decisions_output.csv
 */
async function processBatchApplications(req, res) {
  try {
    const body = req.body || {};

    let applications = [];
    let documents = [];
    let extractionRows = [];
    let sanctions = [];
    let pep = [];
    let existingCustomers = [];

    // 1. Applications data (via file path or direct JSON)
    if (body.applications_file) {
      const resolved = resolveFilePath(body.applications_file);
      applications = readCsvFile(resolved);
    } else if (Array.isArray(body.applications)) {
      applications = body.applications;
    } else if (body.applications_csv) {
      applications = parseCsv(body.applications_csv);
    }

    // 2. Documents data
    if (body.documents_file) {
      const resolved = resolveFilePath(body.documents_file);
      documents = readCsvFile(resolved);
    } else if (Array.isArray(body.documents)) {
      documents = body.documents;
    } else if (body.documents_csv) {
      documents = parseCsv(body.documents_csv);
    }

    // 3. Extraction data
    if (body.extraction_file) {
      const resolved = resolveFilePath(body.extraction_file);
      extractionRows = readCsvFile(resolved);
    } else if (Array.isArray(body.extractions)) {
      extractionRows = body.extractions;
    } else if (body.extraction_csv) {
      extractionRows = parseCsv(body.extraction_csv);
    }

    // 4. Watchlists (Optional)
    if (body.sanctions_file) {
      sanctions = readCsvFile(resolveFilePath(body.sanctions_file));
    } else if (Array.isArray(body.sanctions)) {
      sanctions = body.sanctions;
    }

    if (body.pep_file) {
      pep = readCsvFile(resolveFilePath(body.pep_file));
    } else if (Array.isArray(body.pep)) {
      pep = body.pep;
    }

    // 5. Existing customers (Optional)
    if (body.existing_customers_file) {
      existingCustomers = readCsvFile(resolveFilePath(body.existing_customers_file));
    } else if (Array.isArray(body.existing_customers)) {
      existingCustomers = body.existing_customers;
    }

    const outputPath = body.output_path
      ? resolveFilePath(body.output_path)
      : path.join(__dirname, '../../../output/decisions_output.csv');

    const result = processBatch(
      applications,
      documents,
      extractionRows,
      body.config || {},
      { sanctions, pep },
      existingCustomers,
      outputPath
    );

    return res.status(200).json({
      success: true,
      data: {
        processed_count: result.decisions.length,
        output_file: result.outputPath,
        decisions: result.decisions,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_PROCESSING_FAILED',
        message: err.message,
      },
    });
  }
}

module.exports = {
  resolveFilePath,
  processBatchApplications,
};

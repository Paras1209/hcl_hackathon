#!/usr/bin/env node
/**
 * CLI runner for batch application evaluation.
 * Usage:
 *   node server/scripts/processBatchCli.js <applications.csv> <documents.csv> <extraction.csv> [output.csv]
 */

const path = require('path');
const { processBatch } = require('../src/services/batchService');
const { readCsvFile } = require('../src/utils/csvParser');

const args = process.argv.slice(2);

const appsFile = args[0] || 'case_02_applications_sample_V1.0.csv';
const docsFile = args[1] || 'case_02_documents_sample_V1.0.csv';
const extFile = args[2] || 'case_02_extraction_mock_sample_V1.0.csv';
const outputFile = args[3] || path.join(__dirname, '../../output/decisions_output.csv');

function resolve(p) {
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.cwd(), p);
}

try {
  console.log('--- OnboardIQ Batch Processor ---');
  console.log(`Loading applications: ${appsFile}`);
  const applications = readCsvFile(resolve(appsFile));

  console.log(`Loading documents: ${docsFile}`);
  const documents = readCsvFile(resolve(docsFile));

  console.log(`Loading extractions: ${extFile}`);
  const extractions = readCsvFile(resolve(extFile));

  console.log(`Processing ${applications.length} applications...`);
  const result = processBatch(
    applications,
    documents,
    extractions,
    {},
    { sanctions: [], pep: [] },
    [],
    resolve(outputFile)
  );

  console.log(`Batch complete! Evaluated ${result.decisions.length} applications.`);
  console.log(`Output saved to: ${result.outputPath}`);
} catch (err) {
  console.error(`Batch processing failed: ${err.message}`);
  process.exit(1);
}

/**
 * Lightweight, robust CSV Parser
 * Parses CSV strings or files into arrays of objects without external dependencies.
 */

const fs = require('fs');

/**
 * Splits a CSV line into cells, respecting double quotes.
 */
function parseCsvLine(line) {
  const cells = [];
  let inQuotes = false;
  let currentCell = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  cells.push(currentCell.trim());
  return cells;
}

/**
 * Parses raw CSV content string into an array of objects.
 * Uses the first non-empty line as column headers.
 *
 * @param {string} csvContent
 * @returns {Array<Object>}
 */
function parseCsv(csvContent) {
  if (!csvContent || typeof csvContent !== 'string') return [];

  const rawLines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj = {};
    for (let h = 0; h < headers.length; h++) {
      const header = headers[h];
      obj[header] = values[h] !== undefined ? values[h] : '';
    }
    records.push(obj);
  }

  return records;
}

/**
 * Reads and parses a CSV file from disk.
 *
 * @param {string} filePath
 * @returns {Array<Object>}
 */
function readCsvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found at path: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parseCsv(content);
}

module.exports = {
  parseCsvLine,
  parseCsv,
  readCsvFile,
};

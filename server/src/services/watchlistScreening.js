/**
 * Watchlist Screening Service
 * Performs sanctions and PEP screening on applicants according to case_studies.md Section 6.1.
 */

const { calculateSimilarity } = require('./nameMatching');

/**
 * Formats/normalizes date string to YYYY-MM-DD for calendar comparison.
 * Handles dates in YYYY-MM-DD or DD/MM/YYYY or Date objects.
 */
function normalizeDateStr(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return dateVal.toISOString().slice(0, 10);
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // If DD/MM/YYYY
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return str;
}

/**
 * Screen applicant against Sanctions List
 *
 * MATCH: max similarity >= matchThreshold (default 0.90) and (entry dob empty or equal to declared dob)
 * POSSIBLE: max similarity >= matchThreshold with different dob, OR similarity between possibleThreshold (0.80) and < matchThreshold (0.90)
 *
 * @param {string} declaredFullName
 * @param {string|Date} declaredDob
 * @param {Array<Object>} sanctionsList - Array of { list_id, name, alias, dob, nationality, program }
 * @param {Object} [config]
 * @returns {{ matchType: 'MATCH'|'POSSIBLE'|'NONE', hits: Array<Object> }}
 */
function screenSanctions(declaredFullName, declaredDob, sanctionsList = [], config = {}) {
  const matchThreshold = config.watchlist_match_threshold ?? 0.90;
  const possibleThreshold = config.watchlist_possible_threshold ?? 0.80;
  const titleTokens = config.title_tokens_remove;

  const normalizedDeclaredDob = normalizeDateStr(declaredDob);
  const hits = [];
  let overallResult = 'NONE';

  for (const entry of sanctionsList) {
    if (!entry || (!entry.name && !entry.alias)) continue;

    const nameSim = entry.name ? calculateSimilarity(declaredFullName, entry.name, titleTokens) : 0;
    const aliasSim = entry.alias ? calculateSimilarity(declaredFullName, entry.alias, titleTokens) : 0;
    const maxSim = Math.max(nameSim, aliasSim);

    if (maxSim >= matchThreshold) {
      const entryDob = normalizeDateStr(entry.dob);
      if (!entryDob || entryDob === normalizedDeclaredDob) {
        hits.push({
          type: 'MATCH',
          list_id: entry.list_id,
          name: entry.name,
          alias: entry.alias,
          similarity: Number(maxSim.toFixed(4)),
          entry,
        });
        overallResult = 'MATCH';
      } else {
        hits.push({
          type: 'POSSIBLE',
          list_id: entry.list_id,
          name: entry.name,
          alias: entry.alias,
          similarity: Number(maxSim.toFixed(4)),
          reason: 'Name match but DOB mismatch',
          entry,
        });
        if (overallResult !== 'MATCH') {
          overallResult = 'POSSIBLE';
        }
      }
    } else if (maxSim >= possibleThreshold) {
      hits.push({
        type: 'POSSIBLE',
        list_id: entry.list_id,
        name: entry.name,
        alias: entry.alias,
        similarity: Number(maxSim.toFixed(4)),
        reason: 'Similarity between possible and match threshold',
        entry,
      });
      if (overallResult !== 'MATCH') {
        overallResult = 'POSSIBLE';
      }
    }
  }

  return {
    matchType: overallResult,
    hits,
  };
}

/**
 * Screen applicant against Politically Exposed Persons (PEP) List
 *
 * @param {string} declaredFullName
 * @param {string|Date} declaredDob
 * @param {Array<Object>} pepList - Array of { pep_id, name, dob, position, category }
 * @param {Object} [config]
 * @returns {{ matchType: 'MATCH'|'POSSIBLE'|'NONE', hits: Array<Object> }}
 */
function screenPEP(declaredFullName, declaredDob, pepList = [], config = {}) {
  const matchThreshold = config.watchlist_match_threshold ?? 0.90;
  const possibleThreshold = config.watchlist_possible_threshold ?? 0.80;
  const titleTokens = config.title_tokens_remove;

  const normalizedDeclaredDob = normalizeDateStr(declaredDob);
  const hits = [];
  let overallResult = 'NONE';

  for (const entry of pepList) {
    if (!entry || !entry.name) continue;

    const nameSim = calculateSimilarity(declaredFullName, entry.name, titleTokens);

    if (nameSim >= matchThreshold) {
      const entryDob = normalizeDateStr(entry.dob);
      if (!entryDob || entryDob === normalizedDeclaredDob) {
        hits.push({
          type: 'MATCH',
          pep_id: entry.pep_id,
          name: entry.name,
          similarity: Number(nameSim.toFixed(4)),
          position: entry.position,
          category: entry.category,
          entry,
        });
        overallResult = 'MATCH';
      } else {
        hits.push({
          type: 'POSSIBLE',
          pep_id: entry.pep_id,
          name: entry.name,
          similarity: Number(nameSim.toFixed(4)),
          reason: 'Name match but DOB mismatch',
          entry,
        });
        if (overallResult !== 'MATCH') {
          overallResult = 'POSSIBLE';
        }
      }
    } else if (nameSim >= possibleThreshold) {
      hits.push({
        type: 'POSSIBLE',
        pep_id: entry.pep_id,
        name: entry.name,
        similarity: Number(nameSim.toFixed(4)),
        reason: 'Similarity between possible and match threshold',
        entry,
      });
      if (overallResult !== 'MATCH') {
        overallResult = 'POSSIBLE';
      }
    }
  }

  return {
    matchType: overallResult,
    hits,
  };
}

module.exports = {
  normalizeDateStr,
  screenSanctions,
  screenPEP,
};

/**
 * Name Matching Service
 * Implements strict KYC name normalization and Levenshtein similarity calculation.
 * Follows case_studies.md Section 6.1 specifications.
 */

const levenshtein = require('../utils/levenshtein');

const DEFAULT_TITLE_TOKENS = new Set([
  'MR', 'MRS', 'MS', 'MISS', 'DR', 'SHRI', 'SMT', 'KUMARI'
]);

/**
 * Normalizes a name string:
 * 1. Convert to uppercase
 * 2. Replace '.' and '-' with space
 * 3. Remove all characters except A-Z and space
 * 4. Drop title tokens (configurable or default list)
 * 5. Collapse spaces, sort tokens alphabetically
 * 6. Join with single space
 *
 * @param {string} name
 * @param {Set<string>|Array<string>} [titleTokens]
 * @returns {string}
 */
function normalizeName(name, titleTokens = DEFAULT_TITLE_TOKENS) {
  if (!name || typeof name !== 'string') return '';

  const tokenSet = titleTokens instanceof Set ? titleTokens : new Set(titleTokens);

  // 1. Uppercase
  let s = name.toUpperCase();

  // 2. Replace '.' and '-' with a space
  s = s.replace(/[.\-]/g, ' ');

  // 3. Remove all characters except A-Z and space
  s = s.replace(/[^A-Z\s]/g, ' ');

  // 4, 5, 6. Split into tokens, filter out empty tokens and title tokens, sort, join
  const tokens = s
    .trim()
    .split(/\s+/)
    .filter((token) => token && !tokenSet.has(token));

  tokens.sort();

  return tokens.join(' ');
}

/**
 * Calculates similarity between two names according to case_studies.md:
 * Similarity = 1 - (Levenshtein distance / max(length(norm1), length(norm2)))
 * 1.0 when both normalized strings are empty.
 *
 * @param {string} str1
 * @param {string} str2
 * @param {Set<string>|Array<string>} [titleTokens]
 * @returns {number} Floating-point similarity between 0.0 and 1.0
 */
function calculateSimilarity(str1, str2, titleTokens = DEFAULT_TITLE_TOKENS) {
  const norm1 = normalizeName(str1, titleTokens);
  const norm2 = normalizeName(str2, titleTokens);

  if (norm1 === '' && norm2 === '') return 1.0;
  if (norm1 === '' || norm2 === '') return 0.0;

  const dist = levenshtein.get(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);

  return 1.0 - (dist / maxLen);
}

/**
 * Computes name_match_score:
 * The lowest similarity between declared full_name and usable names on PAN and Aadhaar cards.
 * Returns null if neither name is usable.
 *
 * @param {string} declaredName
 * @param {string|null} panName
 * @param {string|null} aadhaarName
 * @param {Set<string>|Array<string>} [titleTokens]
 * @returns {{ score: number|null, panScore: number|null, aadhaarScore: number|null }}
 */
function computeNameMatchScore(declaredName, panName, aadhaarName, titleTokens = DEFAULT_TITLE_TOKENS) {
  let panScore = null;
  let aadhaarScore = null;

  if (panName && typeof panName === 'string') {
    panScore = calculateSimilarity(declaredName, panName, titleTokens);
  }

  if (aadhaarName && typeof aadhaarName === 'string') {
    aadhaarScore = calculateSimilarity(declaredName, aadhaarName, titleTokens);
  }

  if (panScore === null && aadhaarScore === null) {
    return { score: null, panScore: null, aadhaarScore: null };
  }

  const scores = [];
  if (panScore !== null) scores.push(panScore);
  if (aadhaarScore !== null) scores.push(aadhaarScore);

  const minScore = Math.min(...scores);

  return {
    score: Number(minScore.toFixed(4)),
    panScore: panScore !== null ? Number(panScore.toFixed(4)) : null,
    aadhaarScore: aadhaarScore !== null ? Number(aadhaarScore.toFixed(4)) : null,
  };
}

module.exports = {
  DEFAULT_TITLE_TOKENS,
  normalizeName,
  calculateSimilarity,
  computeNameMatchScore,
};

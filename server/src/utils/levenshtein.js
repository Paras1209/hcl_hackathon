/**
 * Levenshtein distance utility for name matching and fuzzy string comparison.
 * Memory-efficient O(min(m, n)) space implementation.
 */

function get(a, b) {
  if (a === b) return 0;
  if (!a || a.length === 0) return b ? b.length : 0;
  if (!b || b.length === 0) return a ? a.length : 0;

  // Swap to ensure a is shorter to minimize row allocation
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const aLen = a.length;
  const bLen = b.length;
  const row = new Array(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    row[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    let prev = j - 1;
    row[0] = j;
    const bChar = b.charCodeAt(j - 1);

    for (let i = 1; i <= aLen; i++) {
      const current = row[i];
      const cost = a.charCodeAt(i - 1) === bChar ? 0 : 1;
      row[i] = Math.min(
        row[i] + 1,       // deletion
        row[i - 1] + 1,   // insertion
        prev + cost       // substitution
      );
      prev = current;
    }
  }

  return row[aLen];
}

module.exports = {
  get,
};

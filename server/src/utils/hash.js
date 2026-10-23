const crypto = require('crypto');

/**
 * Hash a password using bcrypt-like approach via crypto.
 * We use bcrypt package directly in authController, but this utility
 * provides SHA-256 hashing for file integrity verification.
 */

/**
 * Generate SHA-256 hash of a buffer or string.
 * @param {Buffer|string} data
 * @returns {string} hex-encoded hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random hex token of given byte length.
 * @param {number} bytes
 * @returns {string}
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { sha256, generateToken };

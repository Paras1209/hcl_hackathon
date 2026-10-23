/**
 * Mock Core Banking API
 * Simulates account creation in the bank's core system
 * Deterministic: same application_id always generates same customer_id and account_number
 * This enables reproducible testing
 */

/**
 * Simple deterministic hash function using application_id as seed
 * @param {string} str - Input string
 * @param {string} salt - Additional salt for different outputs
 * @returns {number} Deterministic hash value
 */
function deterministicHash(str, salt = '') {
  let hash = 0;
  const combined = str + salt;
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Ensure positive number
  return Math.abs(hash);
}

/**
 * Generate customer ID from application_id
 * Format: CUST + 8 digits (e.g., CUST12345678)
 * @param {string} application_id - Application identifier
 * @returns {string} Customer ID
 */
function generateCustomerId(application_id) {
  const hash = deterministicHash(application_id, 'CUSTOMER_ID_SALT');
  const number = (hash % 100000000).toString().padStart(8, '0');
  return `CUST${number}`;
}

/**
 * Generate account number from application_id
 * Format: 16 digits (e.g., 1234567890123456)
 * @param {string} application_id - Application identifier
 * @returns {string} Account number (16 digits)
 */
function generateAccountNumber(application_id) {
  const hash = deterministicHash(application_id, 'ACCOUNT_NUMBER_SALT');
  const number = (hash % 10000000000000000).toString().padStart(16, '0');
  return number;
}

/**
 * Mock account creation
 * In production, this would call the real core banking API
 * According to case_studies.md Section 3: Core-banking service (mock): returns a customer ID and account number when an application is APPROVED
 * @param {object} application - Application object
 * @returns {Promise<object>} Account creation result
 */
async function createAccount(application) {
  // Simulate API delay (typical banking API response time)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate deterministic account details
  const customerId = generateCustomerId(application.application_id);
  const accountNumber = generateAccountNumber(application.application_id);
  
  console.log(`[MOCK CORE BANKING] Account created for ${application.full_name}`);
  console.log(`  Application ID: ${application.application_id}`);
  console.log(`  Customer ID: ${customerId}`);
  console.log(`  Account Number: ${accountNumber}`);
  console.log(`  Note: Same application ID will always generate same customer and account numbers`);
  
  // In production, this would return the actual response from core banking
  // Mock returns consistent format that can be stored in application
  return {
    success: true,
    customer_id: customerId,
    account_number: accountNumber,
    account_type: 'SAVINGS',
    opened_date: new Date(),
  };
}

module.exports = {
  createAccount,
  generateCustomerId,
  generateAccountNumber,
  deterministicHash, // Exported for testing
};
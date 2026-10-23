/**
 * Risk Calculation & Re-KYC Due Date Service
 * Follows case_studies.md Section 6.1.2
 */

/**
 * Checks if a given year is a leap year in the Gregorian calendar.
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Calculates risk category:
 * HIGH if PEP_MATCH or SANCTIONS_POSSIBLE_MATCH triggered or occupation risk_level is HIGH.
 * MEDIUM if occupation risk_level is MEDIUM or annual_income >= 25,00,000.
 * LOW otherwise.
 *
 * @param {Object} params
 * @param {boolean} params.pepMatchTriggered
 * @param {boolean} params.sanctionsPossibleTriggered
 * @param {string} [params.occupationRiskLevel] - 'LOW' | 'MEDIUM' | 'HIGH'
 * @param {number} [params.annualIncome] - Number in INR
 * @param {Object} [config]
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
function calculateRiskCategory({
  pepMatchTriggered = false,
  sanctionsPossibleTriggered = false,
  occupationRiskLevel = 'LOW',
  annualIncome = 0,
}, config = {}) {
  const mediumIncomeThreshold = config.medium_risk_income_threshold ?? 2500000;
  const occLevel = String(occupationRiskLevel || 'LOW').toUpperCase();

  if (pepMatchTriggered || sanctionsPossibleTriggered || occLevel === 'HIGH') {
    return 'HIGH';
  }

  if (occLevel === 'MEDIUM' || Number(annualIncome) >= mediumIncomeThreshold) {
    return 'MEDIUM';
  }

  return 'LOW';
}

/**
 * Calculates Re-KYC due date:
 * HIGH: +2 years
 * MEDIUM: +8 years
 * LOW: +10 years
 * 29 February moves to 28 February if target year is not a leap year.
 *
 * @param {string|Date} applicationDate - YYYY-MM-DD or Date
 * @param {'HIGH'|'MEDIUM'|'LOW'} riskCategory
 * @param {Object} [config]
 * @returns {string} ISO Date string YYYY-MM-DD
 */
function calculateRekycDueDate(applicationDate, riskCategory, config = {}) {
  if (!applicationDate || !riskCategory) return '';

  const periodHigh = config.rekyc_period_high_years ?? 2;
  const periodMedium = config.rekyc_period_medium_years ?? 8;
  const periodLow = config.rekyc_period_low_years ?? 10;

  const yearsToAdd =
    riskCategory === 'HIGH' ? periodHigh :
    riskCategory === 'MEDIUM' ? periodMedium :
    periodLow;

  let y, m, d;

  if (typeof applicationDate === 'string') {
    const parts = applicationDate.split('T')[0].split('-');
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10); // 1-12
    d = parseInt(parts[2], 10);
  } else if (applicationDate instanceof Date) {
    y = applicationDate.getFullYear();
    m = applicationDate.getMonth() + 1;
    d = applicationDate.getDate();
  } else {
    return '';
  }

  const targetYear = y + yearsToAdd;
  let targetMonth = m;
  let targetDay = d;

  // Handle Feb 29 adjustment
  if (targetMonth === 2 && targetDay === 29) {
    if (!isLeapYear(targetYear)) {
      targetDay = 28;
    }
  }

  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');

  return `${targetYear}-${mm}-${dd}`;
}

module.exports = {
  isLeapYear,
  calculateRiskCategory,
  calculateRekycDueDate,
};

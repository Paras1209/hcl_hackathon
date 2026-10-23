/**
 * Core Rules Engine (R1 - R17)
 * Implements pure evaluation logic per case_studies.md Section 6.1 and CLAUDE.md.
 */

const { computeNameMatchScore } = require('./nameMatching');
const { screenSanctions, screenPEP, normalizeDateStr } = require('./watchlistScreening');
const { calculateRiskCategory, calculateRekycDueDate } = require('./riskCalculation');
const { DEFAULT_RULES_CONFIG } = require('../modules/kyc/config/rulesConfig');

const ADDRESS_PROOF_TYPES = new Set(['ELECTRICITY_BILL', 'BANK_STATEMENT', 'DRIVING_LICENCE']);

const REQUIRED_FIELDS_BY_DOC_TYPE = {
  PAN_CARD: ['pan_number', 'name', 'dob'],
  AADHAAR_CARD: ['aadhaar_last4', 'name', 'dob'],
  ELECTRICITY_BILL: ['document_date', 'pincode'],
  BANK_STATEMENT: ['document_date', 'pincode'],
  DRIVING_LICENCE: ['valid_until', 'pincode'],
};

/**
 * Calculates completed calendar years between dob and application_date
 */
function calculateCompletedYears(dobStr, appDateStr) {
  if (!dobStr || !appDateStr) return 0;
  const dob = new Date(dobStr);
  const appDate = new Date(appDateStr);

  let years = appDate.getFullYear() - dob.getFullYear();
  const m = appDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && appDate.getDate() < dob.getDate())) {
    years--;
  }
  return years;
}

/**
 * Helper to get calendar days difference: appDate - docDate
 */
function getDaysDifference(docDateStr, appDateStr) {
  if (!docDateStr || !appDateStr) return 0;
  const docDate = new Date(docDateStr);
  const appDate = new Date(appDateStr);
  const diffTime = appDate.getTime() - docDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Normalizes document extraction data into a uniform structure:
 * doc_id -> { classified_doc_type, doc_type_confidence, fields: { [field_name]: { value, confidence } } }
 */
function normalizeExtractions(extractedData) {
  if (!extractedData) return {};

  // If already a normalized map
  if (typeof extractedData === 'object' && !Array.isArray(extractedData)) {
    // Check if values have fields map
    const firstKey = Object.keys(extractedData)[0];
    if (firstKey && extractedData[firstKey].fields !== undefined) {
      return extractedData;
    }
  }

  const result = {};

  // If array of long-format extraction rows: [{ doc_id, field_name, value, confidence }]
  if (Array.isArray(extractedData)) {
    for (const row of extractedData) {
      const docId = row.doc_id;
      if (!result[docId]) {
        result[docId] = {
          classified_doc_type: null,
          doc_type_confidence: 0,
          fields: {},
        };
      }
      if (row.field_name === 'doc_type') {
        result[docId].classified_doc_type = row.value;
        result[docId].doc_type_confidence = Number(row.confidence) || 0;
      } else {
        result[docId].fields[row.field_name] = {
          value: row.value,
          confidence: Number(row.confidence) || 0,
        };
      }
    }
    return result;
  }

  return extractedData;
}

/**
 * Evaluates KYC Application against Rules R1 through R17.
 *
 * @param {Object} application - Form details
 * @param {Array<Object>} documents - Document records [{ doc_id, declared_doc_type }]
 * @param {Object|Array} extractedFields - Extraction output for documents
 * @param {Object} [customConfig] - Threshold overrides
 * @param {Object} [watchlists] - { sanctions: [], pep: [] }
 * @param {Array<Object>} [existingCustomers] - List of existing customer objects { pan_number, ... }
 * @returns {Object} Evaluation result
 */
function evaluateApplication(
  application = {},
  documents = [],
  extractedFields = {},
  customConfig = {},
  watchlists = { sanctions: [], pep: [] },
  existingCustomers = []
) {
  const config = { ...DEFAULT_RULES_CONFIG, ...customConfig };
  const minConfidence = config.min_field_confidence ?? 0.80;
  const extractions = normalizeExtractions(extractedFields);

  const triggeredRules = []; // Store rule details: { ruleId, code, outcome, reason }

  // 1. Organize documents and check usability
  let usablePanDoc = null;
  let usableAadhaarDoc = null;
  let usableAddressProofDoc = null;

  let hasDeclaredPan = false;
  let hasDeclaredAadhaar = false;
  let hasDeclaredAddressProof = false;

  for (const doc of documents) {
    const declaredType = doc.declared_doc_type;
    if (declaredType === 'PAN_CARD') hasDeclaredPan = true;
    if (declaredType === 'AADHAAR_CARD') hasDeclaredAadhaar = true;
    if (ADDRESS_PROOF_TYPES.has(declaredType)) hasDeclaredAddressProof = true;

    const ext = extractions[doc.doc_id];
    if (!ext) continue;

    const classifiedType = ext.classified_doc_type;
    const docConfidence = ext.doc_type_confidence ?? 0;

    // R2 Check: classified_doc_type differs from declared_doc_type
    if (classifiedType && declaredType && classifiedType !== declaredType) {
      triggeredRules.push({
        rule: 'R2',
        code: 'DOCUMENT_TYPE_MISMATCH',
        outcome: 'REVIEW',
        details: `Doc ${doc.doc_id}: declared ${declaredType} but classified as ${classifiedType}`,
      });
    }

    // R3 Check: low doc_type confidence or missing/low-confidence required field
    let hasLowConfidence = false;
    if (docConfidence < minConfidence) {
      hasLowConfidence = true;
    }

    const reqFields = REQUIRED_FIELDS_BY_DOC_TYPE[declaredType] || [];
    for (const f of reqFields) {
      const fieldData = ext.fields?.[f];
      if (!fieldData || fieldData.confidence < minConfidence || !fieldData.value) {
        hasLowConfidence = true;
        break;
      }
    }

    if (hasLowConfidence) {
      triggeredRules.push({
        rule: 'R3',
        code: 'LOW_EXTRACTION_CONFIDENCE',
        outcome: 'REVIEW',
        details: `Doc ${doc.doc_id} has low confidence or missing required field`,
      });
    }

    // Determine usable documents
    // A document is considered usable for its declared type if its classified doc_type matches declared type
    // and its type confidence is >= minConfidence
    if (classifiedType === declaredType && docConfidence >= minConfidence) {
      if (declaredType === 'PAN_CARD' && !usablePanDoc) usablePanDoc = { ...doc, ext };
      if (declaredType === 'AADHAAR_CARD' && !usableAadhaarDoc) usableAadhaarDoc = { ...doc, ext };
      if (ADDRESS_PROOF_TYPES.has(declaredType) && !usableAddressProofDoc) {
        usableAddressProofDoc = { ...doc, ext };
      }
    }
  }

  // R1 Check: Missing usable document of type PAN, Aadhaar, or Address Proof
  if (!usablePanDoc || !usableAadhaarDoc || !usableAddressProofDoc) {
    triggeredRules.push({
      rule: 'R1',
      code: 'DOCUMENT_MISSING',
      outcome: 'REVIEW',
      details: `Missing usable document: PAN=${!!usablePanDoc}, Aadhaar=${!!usableAadhaarDoc}, Address=${!!usableAddressProofDoc}`,
    });
  }

  // Helper to extract usable field value (confidence >= minConfidence)
  const getUsableField = (docWrapper, fieldName) => {
    if (!docWrapper || !docWrapper.ext || !docWrapper.ext.fields) return null;
    const f = docWrapper.ext.fields[fieldName];
    if (f && f.confidence >= minConfidence && f.value) {
      return String(f.value).trim();
    }
    return null;
  };

  // 2. Identity & Format Rules (R4 - R8)
  const appDateStr = normalizeDateStr(application.application_date);
  const declaredDobStr = normalizeDateStr(application.dob);
  const declaredPan = application.pan_number ? String(application.pan_number).trim().toUpperCase() : '';
  const declaredAadhaarLast4 = application.aadhaar_last4 ? String(application.aadhaar_last4).trim() : '';

  // R4: Age below 18
  const age = calculateCompletedYears(declaredDobStr, appDateStr);
  if (age < config.min_age_years) {
    triggeredRules.push({
      rule: 'R4',
      code: 'AGE_BELOW_18',
      outcome: 'REJECT',
      details: `Completed years on application_date is ${age} (minimum required is ${config.min_age_years})`,
    });
  }

  // R5: PAN Invalid (format ^[A-Z]{5}[0-9]{4}[A-Z]$ and 4th char is P)
  const panRegex = new RegExp(config.pan_pattern || '^[A-Z]{5}[0-9]{4}[A-Z]$');
  const holderChar = config.pan_holder_type_char || 'P';
  const isPanFormatValid = panRegex.test(declaredPan);
  const isHolderValid = declaredPan.length >= 4 && declaredPan[3] === holderChar;

  if (!isPanFormatValid || !isHolderValid) {
    triggeredRules.push({
      rule: 'R5',
      code: 'PAN_INVALID',
      outcome: 'REJECT',
      details: `Declared PAN ${declaredPan} does not match format or 4th character is not ${holderChar}`,
    });
  }

  // R6: PAN Mismatch (only evaluated if PAN card pan_number is usable)
  const panCardPan = getUsableField(usablePanDoc, 'pan_number');
  if (panCardPan !== null && panCardPan.toUpperCase() !== declaredPan) {
    triggeredRules.push({
      rule: 'R6',
      code: 'PAN_MISMATCH',
      outcome: 'REJECT',
      details: `Declared PAN ${declaredPan} differs from card ${panCardPan}`,
    });
  }

  // R7: DOB Mismatch (evaluated if DOB on PAN card or Aadhaar card is usable)
  const panCardDob = normalizeDateStr(getUsableField(usablePanDoc, 'dob'));
  const aadhaarDob = normalizeDateStr(getUsableField(usableAadhaarDoc, 'dob'));

  let dobMismatch = false;
  if (panCardDob !== null && panCardDob !== declaredDobStr) dobMismatch = true;
  if (aadhaarDob !== null && aadhaarDob !== declaredDobStr) dobMismatch = true;

  if (dobMismatch) {
    triggeredRules.push({
      rule: 'R7',
      code: 'DOB_MISMATCH',
      outcome: 'REJECT',
      details: `Declared DOB ${declaredDobStr} differs from PAN (${panCardDob}) or Aadhaar (${aadhaarDob})`,
    });
  }

  // R8: Aadhaar Mismatch (only evaluated if aadhaar_last4 on Aadhaar card is usable)
  const aadhaarCardLast4 = getUsableField(usableAadhaarDoc, 'aadhaar_last4');
  if (aadhaarCardLast4 !== null && aadhaarCardLast4 !== declaredAadhaarLast4) {
    triggeredRules.push({
      rule: 'R8',
      code: 'AADHAAR_MISMATCH',
      outcome: 'REJECT',
      details: `Declared Aadhaar last 4 (${declaredAadhaarLast4}) differs from card (${aadhaarCardLast4})`,
    });
  }

  // 3. Name Matching (R9, R11)
  const panCardName = getUsableField(usablePanDoc, 'name');
  const aadhaarCardName = getUsableField(usableAadhaarDoc, 'name');
  const nameMatchResult = computeNameMatchScore(
    application.full_name || '',
    panCardName,
    aadhaarCardName,
    config.title_tokens_remove
  );

  const nameMatchScore = nameMatchResult.score;

  if (nameMatchScore !== null) {
    if (nameMatchScore < config.name_match_threshold_reject) {
      triggeredRules.push({
        rule: 'R9',
        code: 'NAME_MISMATCH',
        outcome: 'REJECT',
        details: `Name match score ${nameMatchScore.toFixed(4)} < reject threshold ${config.name_match_threshold_reject}`,
      });
    } else if (nameMatchScore < config.name_match_threshold_pass) {
      triggeredRules.push({
        rule: 'R11',
        code: 'NAME_MISMATCH_MINOR',
        outcome: 'REVIEW',
        details: `Name match score ${nameMatchScore.toFixed(4)} is between ${config.name_match_threshold_reject} and ${config.name_match_threshold_pass}`,
      });
    }
  }

  // 4. Watchlist Screening (R10, R15, R16)
  const sanctionsResult = screenSanctions(
    application.full_name || '',
    declaredDobStr,
    watchlists.sanctions || [],
    config
  );

  if (sanctionsResult.matchType === 'MATCH') {
    triggeredRules.push({
      rule: 'R10',
      code: 'SANCTIONS_MATCH',
      outcome: 'REJECT',
      details: `Sanctions list MATCH found for ${application.full_name}`,
    });
  } else if (sanctionsResult.matchType === 'POSSIBLE') {
    triggeredRules.push({
      rule: 'R15',
      code: 'SANCTIONS_POSSIBLE_MATCH',
      outcome: 'REVIEW',
      details: `Sanctions list POSSIBLE match found for ${application.full_name}`,
    });
  }

  const pepResult = screenPEP(
    application.full_name || '',
    declaredDobStr,
    watchlists.pep || [],
    config
  );

  if (pepResult.matchType === 'MATCH') {
    triggeredRules.push({
      rule: 'R16',
      code: 'PEP_MATCH',
      outcome: 'REVIEW',
      details: `PEP list MATCH found for ${application.full_name}`,
    });
  }

  // 5. Address Proof Rules (R12, R13, R14)
  if (usableAddressProofDoc) {
    const addressDocType = usableAddressProofDoc.declared_doc_type;

    // R12: Driving licence expired
    if (addressDocType === 'DRIVING_LICENCE') {
      const validUntil = normalizeDateStr(getUsableField(usableAddressProofDoc, 'valid_until'));
      if (validUntil !== null && validUntil < appDateStr) {
        triggeredRules.push({
          rule: 'R12',
          code: 'DOCUMENT_EXPIRED',
          outcome: 'REVIEW',
          details: `Driving licence valid_until ${validUntil} < application_date ${appDateStr}`,
        });
      }
    }

    // R13: Electricity bill or bank statement stale (> 90 days or future date)
    if (addressDocType === 'ELECTRICITY_BILL' || addressDocType === 'BANK_STATEMENT') {
      const docDate = normalizeDateStr(getUsableField(usableAddressProofDoc, 'document_date'));
      if (docDate !== null) {
        const daysDiff = getDaysDifference(docDate, appDateStr);
        if (daysDiff > config.address_proof_max_age_days || daysDiff < 0) {
          triggeredRules.push({
            rule: 'R13',
            code: 'ADDRESS_PROOF_STALE',
            outcome: 'REVIEW',
            details: `Document date ${docDate} is ${daysDiff} days from application_date ${appDateStr}`,
          });
        }
      }
    }

    // R14: Address mismatch (pincode differs)
    const cardPincode = getUsableField(usableAddressProofDoc, 'pincode');
    const declaredPincode = application.pincode ? String(application.pincode).trim() : null;
    if (cardPincode !== null && declaredPincode !== null && cardPincode !== declaredPincode) {
      triggeredRules.push({
        rule: 'R14',
        code: 'ADDRESS_MISMATCH',
        outcome: 'REVIEW',
        details: `Declared pincode ${declaredPincode} != document pincode ${cardPincode}`,
      });
    }
  }

  // 6. Existing Customer / Duplicate Check (R17)
  if (declaredPan && Array.isArray(existingCustomers) && existingCustomers.length > 0) {
    const isDuplicate = existingCustomers.some((cust) => {
      const custPan = cust.pan_number ? String(cust.pan_number).trim().toUpperCase() : '';
      return custPan === declaredPan;
    });

    if (isDuplicate) {
      triggeredRules.push({
        rule: 'R17',
        code: 'DUPLICATE_CUSTOMER',
        outcome: 'REVIEW',
        details: `Declared PAN ${declaredPan} already exists in existing customers`,
      });
    }
  }

  // Deduplicate triggered rules by code preserving order R1 to R17
  const ruleOrder = [
    'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10',
    'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17'
  ];

  const ruleMap = {};
  for (const r of triggeredRules) {
    if (!ruleMap[r.rule]) {
      ruleMap[r.rule] = r;
    }
  }

  const sortedTriggeredRules = ruleOrder
    .filter((id) => ruleMap[id])
    .map((id) => ruleMap[id]);

  const reasonCodes = sortedTriggeredRules.map((r) => r.code);

  // Precedence determination:
  // REJECT if any of R4 to R10 triggered
  // Else REVIEW if any of R1 to R3 or R11 to R17 triggered
  // Else APPROVE
  const rejectRules = new Set(['R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10']);
  const reviewRules = new Set(['R1', 'R2', 'R3', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17']);

  let decision = 'APPROVE';
  const hasReject = sortedTriggeredRules.some((r) => rejectRules.has(r.rule));
  const hasReview = sortedTriggeredRules.some((r) => reviewRules.has(r.rule));

  if (hasReject) {
    decision = 'REJECT';
  } else if (hasReview) {
    decision = 'REVIEW';
  }

  // Risk & Re-KYC calculation (computed for APPROVE and REVIEW, empty for REJECT)
  let riskCategory = null;
  let rekycDueDate = null;

  if (decision !== 'REJECT') {
    const pepTriggered = reasonCodes.includes('PEP_MATCH');
    const sanctionsPossibleTriggered = reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH');

    riskCategory = calculateRiskCategory(
      {
        pepMatchTriggered: pepTriggered,
        sanctionsPossibleTriggered,
        occupationRiskLevel: application.occupation_risk_level || 'LOW',
        annualIncome: application.annual_income || 0,
      },
      config
    );

    rekycDueDate = calculateRekycDueDate(appDateStr, riskCategory, config);
  }

  return {
    decision,
    reason_codes: decision === 'APPROVE' ? [] : reasonCodes,
    reason_codes_str: decision === 'APPROVE' ? '' : reasonCodes.join('|'),
    name_match_score: nameMatchScore !== null ? Number(nameMatchScore.toFixed(4)) : null,
    risk_category: riskCategory,
    rekyc_due_date: rekycDueDate,
    rule_results: sortedTriggeredRules,
  };
}

module.exports = {
  REQUIRED_FIELDS_BY_DOC_TYPE,
  ADDRESS_PROOF_TYPES,
  calculateCompletedYears,
  getDaysDifference,
  normalizeExtractions,
  evaluateApplication,
};

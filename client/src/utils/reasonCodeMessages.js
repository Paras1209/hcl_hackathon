/**
 * Plain-language reason code mappings for Applicants (safe, privacy-preserving)
 * and Technical descriptions for KYC / Compliance Officers.
 */

export const REASON_CODE_DETAILS = {
  DOCUMENT_MISSING: {
    rule: 'R1',
    category: 'Document Completeness',
    applicantMessage: 'One or more mandatory documents (PAN card, Aadhaar card, or address proof) were not found.',
    officerMessage: 'No usable document of type PAN_CARD, AADHAAR_CARD, or of any address-proof type (ELECTRICITY_BILL, BANK_STATEMENT, DRIVING_LICENCE).',
    actionRequired: 'Please re-upload clear copies of all required documents.',
  },
  DOCUMENT_TYPE_MISMATCH: {
    rule: 'R2',
    category: 'Document Classification',
    applicantMessage: 'One of your uploaded documents did not match the document type you selected.',
    officerMessage: 'Classified doc_type differs from declared_doc_type for at least one uploaded document.',
    actionRequired: 'Ensure you assign the correct document category when uploading.',
  },
  LOW_EXTRACTION_CONFIDENCE: {
    rule: 'R3',
    category: 'OCR / Extraction Quality',
    applicantMessage: 'We could not clearly read all the required details from your uploaded documents due to scan quality.',
    officerMessage: 'Document classification confidence is below 0.80, or a required field is missing or has confidence < 0.80.',
    actionRequired: 'Please upload a higher-clarity scan or well-lit specimen document.',
  },
  AGE_BELOW_18: {
    rule: 'R4',
    category: 'Eligibility',
    applicantMessage: 'Applicant must be at least 18 years of age to open an independent digital savings account.',
    officerMessage: 'Age calculated from date of birth is under 18 years as of the application date.',
    actionRequired: 'Minor accounts currently require in-branch guardian assisted onboarding.',
  },
  PAN_INVALID: {
    rule: 'R5',
    category: 'Identity Verification',
    applicantMessage: 'The PAN format provided is invalid for an individual retail customer account.',
    officerMessage: 'Declared PAN fails regex ^[A-Z]{5}[0-9]{4}[A-Z]$ or the 4th character is not P (individual).',
    actionRequired: 'Check your PAN number and ensure it is an individual PAN card.',
  },
  PAN_MISMATCH: {
    rule: 'R6',
    category: 'Identity Verification',
    applicantMessage: 'The PAN number on the uploaded card does not match the PAN entered in your application.',
    officerMessage: 'Usable PAN extracted from the PAN card differs from the declared PAN number.',
    actionRequired: 'Please verify the details on your physical PAN card and resubmit.',
  },
  DOB_MISMATCH: {
    rule: 'R7',
    category: 'Identity Verification',
    applicantMessage: 'The date of birth on your identity documents does not match your application date of birth.',
    officerMessage: 'Usable DOB on PAN card or Aadhaar card differs from declared DOB.',
    actionRequired: 'Check your date of birth format and ensure document consistency.',
  },
  AADHAAR_MISMATCH: {
    rule: 'R8',
    category: 'Identity Verification',
    applicantMessage: 'The last 4 digits of Aadhaar on the uploaded document do not match your entered details.',
    officerMessage: 'Usable Aadhaar last 4 digits extracted from document differ from declared aadhaar_last4.',
    actionRequired: 'Ensure you upload your own Aadhaar copy showing matching last 4 digits.',
  },
  NAME_MISMATCH: {
    rule: 'R9',
    category: 'Identity Verification',
    applicantMessage: 'The name on your identity documents differs significantly from the name in your application.',
    officerMessage: 'Normalised Levenshtein name_match_score is below 0.75 threshold.',
    actionRequired: 'Use your full legal name exactly as printed on your government identity cards.',
  },
  NAME_MISMATCH_MINOR: {
    rule: 'R11',
    category: 'Identity Verification',
    applicantMessage: 'There is a minor discrepancy (such as initials or ordering) between your name and documents.',
    officerMessage: 'Normalised Levenshtein name_match_score is between 0.75 and 0.8999 (minor variation).',
    actionRequired: 'Application has been routed to a KYC Officer for manual verification.',
  },
  DOCUMENT_EXPIRED: {
    rule: 'R12',
    category: 'Validity',
    applicantMessage: 'The driving licence submitted as address proof has expired.',
    officerMessage: 'Address proof is a DRIVING_LICENCE and valid_until is earlier than application date.',
    actionRequired: 'Please upload a currently valid driving licence or alternate address proof.',
  },
  ADDRESS_PROOF_STALE: {
    rule: 'R13',
    category: 'Address Proof',
    applicantMessage: 'The utility bill or bank statement submitted as address proof is older than 90 days.',
    officerMessage: 'Utility bill or bank statement document date is older than 90 days before application date.',
    actionRequired: 'Please provide a utility bill or bank statement issued within the last 3 months.',
  },
  ADDRESS_MISMATCH: {
    rule: 'R14',
    category: 'Address Proof',
    applicantMessage: 'The postal PIN code on your address proof does not match your application PIN code.',
    officerMessage: 'Usable pincode on address proof differs from declared residential pincode.',
    actionRequired: 'Submit address proof corresponding to your current declared residence.',
  },
  SANCTIONS_MATCH: {
    rule: 'R10',
    category: 'Compliance Screening',
    applicantMessage: 'Your application cannot be processed online at this time. Please contact branch customer support.',
    officerMessage: 'Direct match with regulatory Sanctions Watchlist (similarity ≥ 0.90 with matching/empty DOB).',
    actionRequired: 'Escalate to Compliance Head immediately.',
  },
  SANCTIONS_POSSIBLE_MATCH: {
    rule: 'R15',
    category: 'Compliance Screening',
    applicantMessage: 'Your application requires additional standard compliance verification.',
    officerMessage: 'Possible match with Sanctions list (similarity ≥ 0.90 with different DOB, or 0.80 - 0.8999).',
    actionRequired: 'Enhanced due diligence required by KYC Officer and Compliance Checker.',
  },
  PEP_MATCH: {
    rule: 'R16',
    category: 'Compliance Screening',
    applicantMessage: 'Your application requires standard enhanced review prior to account opening.',
    officerMessage: 'Applicant matches Politically Exposed Person (PEP) or Relative/Close Associate list.',
    actionRequired: 'Requires High-Risk KYC workflow and mandatory Compliance Checker sign-off.',
  },
  DUPLICATE_CUSTOMER: {
    rule: 'R17',
    category: 'Account Deduplication',
    applicantMessage: 'An existing account or relationship was identified under your PAN number.',
    officerMessage: 'Declared PAN matches an existing customer in the core banking records.',
    actionRequired: 'Customer should use existing net-banking credentials or link account in branch.',
  },
};

/**
 * Get message for role
 */
export function getReasonMessage(code, role = 'APPLICANT') {
  const detail = REASON_CODE_DETAILS[code];
  if (!detail) {
    return role === 'APPLICANT'
      ? 'Verification requires attention.'
      : `Triggered reason code: ${code}`;
  }
  return role === 'APPLICANT' ? detail.applicantMessage : detail.officerMessage;
}

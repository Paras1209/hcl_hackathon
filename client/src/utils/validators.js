export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AADHAAR_LAST4_REGEX = /^[0-9]{4}$/;
export const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates personal and application form fields
 */
export function validateApplicationForm(values) {
  const errors = {};

  if (!values.fullName || values.fullName.trim().length < 3) {
    errors.fullName = 'Full legal name is required (minimum 3 characters)';
  }

  if (!values.dob) {
    errors.dob = 'Date of birth is required';
  } else {
    const dobDate = new Date(values.dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dobDate > today) {
      errors.dob = 'Date of birth cannot be in the future';
    } else {
      // Calculate age
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 18) {
        errors.dob = 'Applicant must be at least 18 years of age (Case Study Rule R4)';
      }
    }
  }

  if (!values.gender) {
    errors.gender = 'Gender is required';
  }

  // PAN Validation
  if (!values.panNumber) {
    errors.panNumber = 'PAN number is required';
  } else {
    const cleanPan = values.panNumber.trim().toUpperCase();
    if (!PAN_REGEX.test(cleanPan)) {
      errors.panNumber = 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)';
    } else if (cleanPan[3] !== 'P') {
      errors.panNumber = 'Fourth character must be P for individual savings account (Rule R5)';
    }
  }

  // Aadhaar Last 4 Validation
  if (!values.aadhaarLast4) {
    errors.aadhaarLast4 = 'Aadhaar last 4 digits are required';
  } else {
    const cleanAadhaar = values.aadhaarLast4.trim();
    if (cleanAadhaar.length === 12) {
      errors.aadhaarLast4 = 'Security Error: Do NOT enter full 12-digit Aadhaar. Enter ONLY the last 4 digits.';
    } else if (!AADHAAR_LAST4_REGEX.test(cleanAadhaar)) {
      errors.aadhaarLast4 = 'Aadhaar must be exactly 4 numeric digits';
    }
  }

  // Mobile Validation
  if (!values.mobile) {
    errors.mobile = 'Mobile number is required';
  } else if (!MOBILE_REGEX.test(values.mobile.trim())) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9';
  }

  // Email Validation
  if (!values.email) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  // Address
  if (!values.address || values.address.trim().length < 5) {
    errors.address = 'Residential street address is required (minimum 5 characters)';
  }

  if (!values.city || values.city.trim().length < 2) {
    errors.city = 'City is required';
  }

  if (!values.state) {
    errors.state = 'State is required';
  }

  // PIN code
  if (!values.pincode) {
    errors.pincode = 'PIN code is required';
  } else if (!PINCODE_REGEX.test(values.pincode.trim())) {
    errors.pincode = 'Enter a valid 6-digit Indian PIN code';
  }

  if (!values.occupationCode) {
    errors.occupationCode = 'Please select your primary occupation';
  }

  if (!values.annualIncome || Number(values.annualIncome) <= 0) {
    errors.annualIncome = 'Annual income is required';
  }

  if (!values.consentKYC) {
    errors.consentKYC = 'You must grant explicit consent for electronic KYC verification';
  }

  return errors;
}

/**
 * Validates document upload files
 */
export function validateDocumentFile(file) {
  const MAX_SIZE = 1 * 1024 * 1024; // 1 MB

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  const extension = file.name.split('.').pop().toLowerCase();
  if (extension !== 'txt') {
    return {
      valid: false,
      error: `Unsupported file format (.${extension}). Core hackathon implementation requires UTF-8 plain text (.txt) files.`,
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 1 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please upload a smaller file.`,
    };
  }

  return { valid: true };
}

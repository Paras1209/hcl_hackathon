const { z } = require('zod');

// ─── Reusable field schemas ────────────────────────────────────────────────────

const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'PAN must be in format ABCDE1234F');

// SACRED: Only last 4 digits of Aadhaar accepted
const aadhaarLast4Schema = z
  .string()
  .regex(/^[0-9]{4}$/, 'Only last 4 digits of Aadhaar are accepted');

const mobileSchema = z
  .string()
  .regex(/^[6-9][0-9]{9}$/, 'Mobile must be 10 digits starting with 6-9');

const pincodeSchema = z
  .string()
  .regex(/^[1-9][0-9]{5}$/, 'Pincode must be 6 digits, not starting with 0');

const emailSchema = z.string().email('Invalid email address').toLowerCase();

// ─── Auth Schemas ──────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  full_name: z.string().min(2).max(100).trim(),
  role: z.enum(['APPLICANT', 'KYC_OFFICER', 'COMPLIANCE_OFFICER']),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// ─── Application Schema ────────────────────────────────────────────────────────

const applicationSchema = z.object({
  full_name: z.string().min(2).max(200).trim(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be YYYY-MM-DD'),
  gender: z.enum(['M', 'F', 'OTHER']),
  pan_number: panSchema,
  aadhaar_last4: aadhaarLast4Schema,
  mobile: mobileSchema,
  email: emailSchema,
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: pincodeSchema,
  occupation_code: z.string().min(1).max(20),
  annual_income: z.number().positive('Annual income must be positive'),
});

// ─── Document Schema (multipart metadata) ─────────────────────────────────────

const documentTypeSchema = z.enum([
  'PAN_CARD',
  'AADHAAR_CARD',
  'ELECTRICITY_BILL',
  'BANK_STATEMENT',
  'DRIVING_LICENCE',
]);

// ─── Field Correction Schema ───────────────────────────────────────────────────

const fieldCorrectionSchema = z.object({
  doc_id: z.string().min(1),
  field_name: z.string().min(1),
  corrected_value: z.string().min(1),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// ─── Middleware factory ────────────────────────────────────────────────────────

/**
 * Returns an Express middleware that validates req.body against the given Zod schema.
 * Throws ZodError (caught by errorHandler) on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Let errorHandler format the ZodError
      return next(result.error);
    }
    req.body = result.data; // Use parsed (coerced) data
    next();
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  applicationSchema,
  documentTypeSchema,
  fieldCorrectionSchema,
  panSchema,
  aadhaarLast4Schema,
};

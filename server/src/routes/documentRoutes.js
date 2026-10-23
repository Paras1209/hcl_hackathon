const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/fileUpload');
const { z } = require('zod');
const { validate } = require('../middleware/validation');

const uploadBodySchema = z.object({
  declared_doc_type: z.enum([
    'PAN_CARD',
    'AADHAAR_CARD',
    'ELECTRICITY_BILL',
    'BANK_STATEMENT',
    'DRIVING_LICENCE',
  ]),
});

// POST /api/documents/upload/:applicationId
// Applicants and officers can upload
router.post(
  '/upload/:applicationId',
  authenticate,
  authorize('APPLICANT', 'KYC_OFFICER', 'COMPLIANCE_OFFICER'),
  uploadSingle,
  (req, res, next) => {
    // Validate body after multer parses it
    const result = uploadBodySchema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  },
  documentController.uploadDocument
);

// GET /api/documents/:doc_id  - owner or officers only
router.get(
  '/:doc_id',
  authenticate,
  authorize('APPLICANT', 'KYC_OFFICER', 'COMPLIANCE_OFFICER'),
  documentController.getDocument
);

// GET /api/documents/:doc_id/extracted  - officers only
router.get(
  '/:doc_id/extracted',
  authenticate,
  authorize('KYC_OFFICER', 'COMPLIANCE_OFFICER'),
  documentController.getExtractedFields
);

module.exports = router;

const Document = require('../models/Document');
const Application = require('../models/Application');
const cloudinaryService = require('../services/cloudinaryService');
const auditService = require('../services/auditService');
const { generateToken } = require('../utils/hash');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/documents/upload/:applicationId
 * Upload a single document (or called internally during application submission).
 * Requires: authenticated + (APPLICANT owning the app OR officer).
 */
async function uploadDocument(req, res, next) {
  const { applicationId } = req.params;
  const { declared_doc_type } = req.body;

  if (!req.file) {
    throw createError('No file uploaded', 400, 'NO_FILE');
  }

  // Verify application exists
  const application = await Application.findOne({ application_id: applicationId });
  if (!application) {
    throw createError('Application not found', 404, 'NOT_FOUND');
  }

  // Access control: applicant can only upload to own application
  if (
    req.user.role === 'APPLICANT' &&
    application.user_id.toString() !== req.user._id.toString()
  ) {
    throw createError('Access denied', 403, 'FORBIDDEN');
  }

  const doc_id = `DOC${Date.now()}${generateToken(4)}`;
  const file_name = req.file.originalname;

  // Upload to Cloudinary
  const { secure_url, public_id, file_hash, file_size } = await cloudinaryService.uploadDocument(
    req.file.buffer,
    doc_id
  );

  const document = await Document.create({
    doc_id,
    application_id: applicationId,
    file_name,
    cloudinary_public_id: public_id,
    cloudinary_secure_url: secure_url,
    cloudinary_resource_type: 'raw',
    file_hash,
    file_size,
    declared_doc_type,
    uploaded_at: new Date(),
  });

  logger.info({ doc_id, application_id: applicationId }, 'Document uploaded');

  return res.status(201).json({
    success: true,
    data: {
      doc_id: document.doc_id,
      file_name: document.file_name,
      declared_doc_type: document.declared_doc_type,
      file_hash: document.file_hash,
      file_size: document.file_size,
      uploaded_at: document.uploaded_at,
    },
  });
}

/**
 * GET /api/documents/:doc_id
 * Get document text content (owner + officers only).
 * SACRED: Every view must be audited.
 */
async function getDocument(req, res, next) {
  const { doc_id } = req.params;

  const document = await Document.findOne({ doc_id });
  if (!document) {
    throw createError('Document not found', 404, 'NOT_FOUND');
  }

  // Access control: applicant can only view own documents
  if (req.user.role === 'APPLICANT') {
    const application = await Application.findOne({ application_id: document.application_id });
    if (!application || application.user_id.toString() !== req.user._id.toString()) {
      throw createError('Access denied', 403, 'FORBIDDEN');
    }
  }

  // SACRED: Audit every document view
  await auditService.logDocumentView({
    application_id: document.application_id,
    doc_id,
    user_id: req.user._id,
    role: req.user.role,
  });

  // Get signed URL from Cloudinary
  const signed_url = cloudinaryService.getDocumentUrl(document.cloudinary_public_id);

  return res.status(200).json({
    success: true,
    data: {
      doc_id: document.doc_id,
      file_name: document.file_name,
      declared_doc_type: document.declared_doc_type,
      classified_doc_type: document.classified_doc_type,
      file_hash: document.file_hash,
      cloudinary_url: signed_url,
      extracted_fields: document.extracted_fields,
      uploaded_at: document.uploaded_at,
    },
  });
}

/**
 * GET /api/documents/:doc_id/extracted
 * Get extracted fields for a document (officers only).
 */
async function getExtractedFields(req, res, next) {
  const { doc_id } = req.params;

  const document = await Document.findOne({ doc_id });
  if (!document) {
    throw createError('Document not found', 404, 'NOT_FOUND');
  }

  return res.status(200).json({
    success: true,
    data: {
      doc_id: document.doc_id,
      classified_doc_type: document.classified_doc_type,
      doc_type_confidence: document.doc_type_confidence,
      extracted_fields: document.extracted_fields,
      processed_at: document.processed_at,
    },
  });
}

module.exports = { uploadDocument, getDocument, getExtractedFields };

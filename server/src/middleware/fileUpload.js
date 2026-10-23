const multer = require('multer');
const path = require('path');
const { MAX_FILE_SIZE } = require('../config/env');
const { createError } = require('./errorHandler');

// Store files in memory (we upload to Cloudinary immediately)
const storage = multer.memoryStorage();

/**
 * File filter: only allow .txt files for this hackathon.
 */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.txt') {
    return cb(createError(`Only .txt files are allowed. Got: ${ext}`, 400, 'INVALID_FILE_TYPE'));
  }

  // Check MIME type (text/plain)
  if (!file.mimetype.startsWith('text/')) {
    return cb(createError('File must be a text file', 400, 'INVALID_FILE_TYPE'));
  }

  cb(null, true);
}

/**
 * Multer instance for document uploads.
 * - Memory storage (files go to Cloudinary immediately)
 * - Max 1MB per file
 * - Max 10 files per request
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE || 1048576, // 1MB default
    files: 10,
  },
});

/**
 * Single document upload field.
 */
const uploadSingle = upload.single('document');

/**
 * Multiple documents upload (field name: 'documents', max 10).
 */
const uploadMultiple = upload.array('documents', 10);

module.exports = { upload, uploadSingle, uploadMultiple };

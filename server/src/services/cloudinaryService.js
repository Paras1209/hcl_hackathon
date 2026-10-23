const cloudinary = require('../config/cloudinary');
const { sha256 } = require('../utils/hash');
const { CLOUDINARY_FOLDER } = require('../config/env');
const logger = require('../utils/logger');
const { Readable } = require('stream');

/**
 * Upload a document buffer to Cloudinary.
 * @param {Buffer} fileBuffer - File content in memory
 * @param {string} docId - Unique document ID (used as public_id)
 * @returns {Promise<{ secure_url, public_id, file_hash }>}
 */
async function uploadDocument(fileBuffer, docId) {
  const file_hash = sha256(fileBuffer);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: docId,
        resource_type: 'raw', // text files
        context: { sha256: file_hash },
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          logger.error({ error, docId }, 'Cloudinary upload failed');
          return reject(error);
        }
        logger.info({ docId, secure_url: result.secure_url }, 'Document uploaded to Cloudinary');
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          file_hash,
          file_size: result.bytes,
        });
      }
    );

    // Pipe buffer into the upload stream
    const readable = Readable.from(fileBuffer);
    readable.pipe(uploadStream);
  });
}

/**
 * Get a signed Cloudinary URL for a document.
 * @param {string} publicId
 * @returns {string} signed URL
 */
function getDocumentUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    secure: true,
  });
}

/**
 * Delete a document from Cloudinary.
 * @param {string} publicId
 */
async function deleteDocument(publicId) {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

module.exports = { uploadDocument, getDocumentUrl, deleteDocument };

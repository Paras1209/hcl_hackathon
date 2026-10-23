/**
 * Cloudinary Service
 * Handles document upload, storage, and retrieval using Cloudinary.
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Check if Cloudinary is properly configured
 */
function isConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloud-name'
  );
}

/**
 * Upload a document to Cloudinary
 * @param {Object} file - Multer file object
 * @param {string} applicationId - Application ID for organizing files
 * @param {string} docType - Document type
 * @returns {Promise<Object>} - Upload result with secure URL and public ID
 */
async function uploadDocument(file, applicationId, docType) {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  }

  try {
    const folder = process.env.CLOUDINARY_FOLDER || 'onboardiq-documents';
    const uploadPath = `${folder}/${applicationId}`;

    // Upload to Cloudinary as raw file
    const result = await cloudinary.uploader.upload(file.path, {
      folder: uploadPath,
      resource_type: 'raw', // For non-image files like .txt
      public_id: `${docType}_${Date.now()}`,
      tags: [applicationId, docType],
      context: {
        application_id: applicationId,
        doc_type: docType,
        original_filename: file.originalname,
      },
    });

    // Clean up temporary file
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.warn('Failed to delete temp file:', err.message);
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload document to Cloudinary: ${error.message}`);
  }
}

/**
 * Upload multiple documents
 * @param {Array} files - Array of Multer file objects
 * @param {string} applicationId - Application ID
 * @returns {Promise<Array>} - Array of upload results
 */
async function uploadDocuments(files, applicationId) {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map((file, index) => {
    const docType = file.fieldname || `document_${index + 1}`;
    return uploadDocument(file, applicationId, docType);
  });

  return Promise.all(uploadPromises);
}

/**
 * Get document URL from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Secure URL
 */
function getDocumentUrl(publicId) {
  if (!isConfigured()) {
    return null;
  }

  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true,
  });
}

/**
 * Download document content from Cloudinary
 * @param {string} url - Cloudinary secure URL
 * @returns {Promise<string>} - Document text content
 */
async function downloadDocumentContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error downloading document:', error);
    throw new Error(`Failed to download document: ${error.message}`);
  }
}

/**
 * Delete a document from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteDocument(publicId) {
  if (!isConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });

    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Delete multiple documents
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Array>} - Array of deletion results
 */
async function deleteDocuments(publicIds) {
  if (!publicIds || publicIds.length === 0) {
    return [];
  }

  const deletePromises = publicIds.map((id) => deleteDocument(id));
  return Promise.all(deletePromises);
}

/**
 * List all documents for an application
 * @param {string} applicationId - Application ID
 * @returns {Promise<Array>} - Array of document resources
 */
async function listApplicationDocuments(applicationId) {
  if (!isConfigured()) {
    return [];
  }

  try {
    const folder = process.env.CLOUDINARY_FOLDER || 'onboardiq-documents';
    const prefix = `${folder}/${applicationId}`;

    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'raw',
      prefix,
      max_results: 100,
    });

    return result.resources || [];
  } catch (error) {
    console.error('Error listing documents:', error);
    return [];
  }
}

module.exports = {
  isConfigured,
  uploadDocument,
  uploadDocuments,
  getDocumentUrl,
  downloadDocumentContent,
  deleteDocument,
  deleteDocuments,
  listApplicationDocuments,
  cloudinary,
};

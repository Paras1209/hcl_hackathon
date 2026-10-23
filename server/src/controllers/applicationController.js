/**
 * Application Controller
 * Handles application submission, validation, rules engine execution, and status routing.
 * Follows CLAUDE.md and TEAM_WORK_DISTRIBUTION.md specifications.
 */

const { evaluateApplication } = require('../services/rulesEngine');
const { extractionService } = require('../modules/kyc/extractionService');
const cloudinaryService = require('../services/cloudinaryService');
const { loadWatchlistsAndCustomers } = require('../services/dataLoaderService');
const fs = require('fs').promises;

// In-memory application store for standalone operation and testing
const inMemoryApplications = new Map();

/**
 * Mask PAN helper: ZZKPS1234Q -> ZZKXXXXX4Q
 */
function maskPan(pan) {
  if (!pan || typeof pan !== 'string' || pan.length < 10) return pan;
  return `${pan.slice(0, 3)}XXXXX${pan.slice(8)}`;
}

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  mongoose = null;
}

/**
 * Helper to dynamically load Mongoose Application model if MongoDB is connected
 */
function getApplicationModel() {
  try {
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      return require('../models/Application');
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * POST /api/applications
 * Submits a new KYC application and runs extraction + rules engine.
 * Handles file uploads via Cloudinary.
 */
async function submitApplication(req, res) {
  try {
    const body = req.body || {};
    const files = req.files || [];

    console.log('Received application submission:', {
      bodyFields: Object.keys(body),
      filesCount: files.length,
    });

    // 1. Mandatory Sacred Constraint Check: Aadhaar Last 4 Only
    const aadhaarInput = String(body.aadhaarLast4 || body.aadhaar_last4 || body.aadhaar || '').trim();
    if (aadhaarInput.length === 12) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AADHAAR',
          message: 'Full 12-digit Aadhaar numbers are not allowed. Please enter only the last 4 digits.',
        },
      });
    }

    if (aadhaarInput && !/^\d{4}$/.test(aadhaarInput)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AADHAAR_FORMAT',
          message: 'Aadhaar must be exactly 4 digits.',
        },
      });
    }

    // Generate or use applicationId
    const applicationId = body.applicationId || body.application_id || `A2000${String(inMemoryApplications.size + 1).padStart(3, '0')}`;
    const applicationDate = body.applicationDate || body.application_date || new Date().toISOString().slice(0, 10);

    const applicationData = {
      applicationId,
      application_id: applicationId,
      applicationDate,
      application_date: applicationDate,
      fullName: body.fullName || body.full_name || '',
      full_name: body.fullName || body.full_name || '',
      dob: body.dob || '',
      gender: body.gender || 'OTHER',
      panNumber: body.panNumber || body.pan_number ? String(body.panNumber || body.pan_number).trim().toUpperCase() : '',
      pan_number: body.panNumber || body.pan_number ? String(body.panNumber || body.pan_number).trim().toUpperCase() : '',
      aadhaarLast4: aadhaarInput,
      aadhaar_last4: aadhaarInput,
      mobile: body.mobile || '',
      email: body.email || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      occupationCode: body.occupationCode || body.occupation_code || 'SALARIED_PRIVATE',
      occupation_code: body.occupationCode || body.occupation_code || 'SALARIED_PRIVATE',
      occupationRiskLevel: body.occupationRiskLevel || body.occupation_risk_level || 'LOW',
      occupation_risk_level: body.occupationRiskLevel || body.occupation_risk_level || 'LOW',
      annualIncome: Number(body.annualIncome || body.annual_income) || 0,
      annual_income: Number(body.annualIncome || body.annual_income) || 0,
      userId: req.user ? req.user.user_id : body.userId || body.user_id || null,
      user_id: req.user ? req.user.user_id : body.userId || body.user_id || null,
      createdAt: new Date(),
      created_at: new Date(),
    };

    // 2. Upload Documents to Cloudinary and Extract Fields
    const documents = [];
    const extractedFieldsMap = {};

    if (files && files.length > 0) {
      console.log(`Uploading ${files.length} documents to Cloudinary...`);

      for (const file of files) {
        try {
          // Read file content for extraction
          const textContent = await fs.readFile(file.path, 'utf-8');

          // Upload to Cloudinary
          let cloudinaryUrl = null;
          let cloudinaryPublicId = null;

          if (cloudinaryService.isConfigured()) {
            const uploadResult = await cloudinaryService.uploadDocument(
              file,
              applicationId,
              file.fieldname || 'document'
            );
            cloudinaryUrl = uploadResult.url;
            cloudinaryPublicId = uploadResult.publicId;
            console.log(`Uploaded ${file.originalname} to Cloudinary:`, cloudinaryPublicId);
          } else {
            console.warn('Cloudinary not configured, skipping upload');
          }

          // Extract document fields
          const docId = `D${Date.now()}${Math.floor(Math.random() * 1000)}`;
          const extracted = await extractionService.extractDocument(
            docId,
            textContent,
            file.fieldname || 'OTHER'
          );

          extractedFieldsMap[docId] = extracted;

          const documentRecord = {
            docId,
            doc_id: docId,
            applicationId,
            application_id: applicationId,
            fileName: file.originalname,
            file_name: file.originalname,
            fileSize: file.size,
            file_size: file.size,
            declaredDocType: file.fieldname || 'OTHER',
            declared_doc_type: file.fieldname || 'OTHER',
            cloudinaryUrl,
            cloudinary_url: cloudinaryUrl,
            cloudinaryPublicId,
            cloudinary_public_id: cloudinaryPublicId,
            textContent: textContent.substring(0, 5000), // Store first 5KB
            text_content: textContent.substring(0, 5000),
            uploadedAt: new Date().toISOString(),
            uploaded_at: new Date().toISOString(),
            extractedFields: extracted.fields || [],
            extracted_fields: extracted.fields || [],
          };

          documents.push(documentRecord);
        } catch (err) {
          console.error(`Error processing file ${file.originalname}:`, err);
          // Continue with other files
        }
      }
    }

    // 3. Load Watchlists and Existing Customers (from database or CSV fallback)
    const { sanctions, pep, existingCustomers } = await loadWatchlistsAndCustomers();
    
    // Allow config override from request
    const config = body.config || {};

    const watchlists = { sanctions, pep };

    // 4. Evaluate Application using Pure Rules Engine
    const evaluation = evaluateApplication(
      applicationData,
      documents,
      extractedFieldsMap,
      config,
      watchlists,
      existingCustomers
    );

    // 5. Determine Initial Status per State Machine (Section 6.1.1 & 6.1.2)
    let status = 'IN_REVIEW';
    if (evaluation.decision === 'APPROVE') {
      if (evaluation.risk_category === 'HIGH') {
        status = 'PENDING_CHECKER';
      } else {
        status = 'AUTO_APPROVED';
      }
    } else if (evaluation.decision === 'REJECT') {
      status = 'AUTO_REJECTED';
    } else if (evaluation.decision === 'REVIEW') {
      status = 'IN_REVIEW';
    }

    const fullRecord = {
      ...applicationData,
      status,
      decision: evaluation.decision,
      reasonCodes: evaluation.reason_codes,
      reason_codes: evaluation.reason_codes,
      reasonCodesStr: evaluation.reason_codes_str,
      reason_codes_str: evaluation.reason_codes_str,
      nameMatchScore: evaluation.name_match_score,
      name_match_score: evaluation.name_match_score,
      riskCategory: evaluation.risk_category,
      risk_category: evaluation.risk_category,
      rekycDueDate: evaluation.rekyc_due_date,
      rekyc_due_date: evaluation.rekyc_due_date,
      ruleResults: evaluation.rule_results,
      rule_results: evaluation.rule_results,
      documents,
      documentsCount: documents.length,
      documents_count: documents.length,
      extractions: extractedFieldsMap,
    };

    // Save to DB or in-memory
    const ApplicationModel = getApplicationModel();
    if (ApplicationModel) {
      await ApplicationModel.findOneAndUpdate(
        { application_id: applicationId },
        fullRecord,
        { upsert: true, new: true }
      );
    }
    inMemoryApplications.set(applicationId, fullRecord);

    console.log(`Application ${applicationId} created with status: ${status}`);

    return res.status(201).json({
      success: true,
      data: {
        applicationId,
        application_id: applicationId,
        status,
        decision: evaluation.decision,
        reasonCodes: evaluation.reason_codes,
        reason_codes: evaluation.reason_codes,
        nameMatchScore: evaluation.name_match_score,
        name_match_score: evaluation.name_match_score,
        riskCategory: evaluation.risk_category,
        risk_category: evaluation.risk_category,
        rekycDueDate: evaluation.rekyc_due_date,
        rekyc_due_date: evaluation.rekyc_due_date,
        documentsCount: documents.length,
        documents_count: documents.length,
      },
    });
  } catch (err) {
    console.error('Application submission error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'APPLICATION_PROCESSING_ERROR',
        message: err.message,
      },
    });
  }
}

/**
 * GET /api/applications/:id
 * Fetches an application by ID. Masks PAN for data protection.
 */
async function getApplicationById(req, res) {
  try {
    const id = req.params.id;
    let application = null;

    const ApplicationModel = getApplicationModel();
    if (ApplicationModel) {
      application = await ApplicationModel.findOne({ application_id: id }).lean();
    }

    if (!application) {
      application = inMemoryApplications.get(id);
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'APPLICATION_NOT_FOUND',
          message: `Application with ID ${id} not found`,
        },
      });
    }

    // Mask PAN for safe display
    const safeApplication = {
      ...application,
      panNumberMasked: maskPan(application.panNumber || application.pan_number),
      pan_number_masked: maskPan(application.panNumber || application.pan_number),
    };

    return res.status(200).json({
      success: true,
      data: safeApplication,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message,
      },
    });
  }
}

module.exports = {
  maskPan,
  inMemoryApplications,
  submitApplication,
  getApplicationById,
};

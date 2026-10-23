/**
 * Application Controller
 * Handles application submission, validation, rules engine execution, and status routing.
 * Follows CLAUDE.md and TEAM_WORK_DISTRIBUTION.md specifications.
 */

const { evaluateApplication } = require('../services/rulesEngine');
const { extractionService } = require('../modules/kyc/extractionService');

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
 */
async function submitApplication(req, res) {
  try {
    const body = req.body || {};

    // 1. Mandatory Sacred Constraint Check: Aadhaar Last 4 Only
    const aadhaarInput = String(body.aadhaar_last4 || body.aadhaar || '').trim();
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

    // Generate or use application_id
    const applicationId = body.application_id || `A2000${String(inMemoryApplications.size + 1).padStart(3, '0')}`;
    const applicationDate = body.application_date || new Date().toISOString().slice(0, 10);

    const applicationData = {
      application_id: applicationId,
      application_date: applicationDate,
      full_name: body.full_name || '',
      dob: body.dob || '',
      gender: body.gender || 'OTHER',
      pan_number: body.pan_number ? String(body.pan_number).trim().toUpperCase() : '',
      aadhaar_last4: aadhaarInput,
      mobile: body.mobile || '',
      email: body.email || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      pincode: body.pincode || '',
      occupation_code: body.occupation_code || 'SALARIED_PRIVATE',
      occupation_risk_level: body.occupation_risk_level || 'LOW',
      annual_income: Number(body.annual_income) || 0,
      user_id: req.user ? req.user.user_id : body.user_id || null,
      created_at: new Date(),
    };

    // 2. Extract Document Fields
    const documents = body.documents || [];
    const extractedFieldsMap = {};

    for (const doc of documents) {
      const extracted = await extractionService.extractDocument(
        doc.doc_id,
        doc.text || '',
        doc.declared_doc_type || ''
      );
      extractedFieldsMap[doc.doc_id] = extracted;
    }

    // 3. Evaluate Application using Pure Rules Engine
    const watchlists = body.watchlists || { sanctions: [], pep: [] };
    const existingCustomers = body.existing_customers || [];
    const config = body.config || {};

    const evaluation = evaluateApplication(
      applicationData,
      documents,
      extractedFieldsMap,
      config,
      watchlists,
      existingCustomers
    );

    // 4. Determine Initial Status per State Machine (Section 6.1.1 & 6.1.2)
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
      reason_codes: evaluation.reason_codes,
      reason_codes_str: evaluation.reason_codes_str,
      name_match_score: evaluation.name_match_score,
      risk_category: evaluation.risk_category,
      rekyc_due_date: evaluation.rekyc_due_date,
      rule_results: evaluation.rule_results,
      documents,
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

    return res.status(201).json({
      success: true,
      data: {
        application_id: applicationId,
        status,
        decision: evaluation.decision,
        reason_codes: evaluation.reason_codes,
        name_match_score: evaluation.name_match_score,
        risk_category: evaluation.risk_category,
        rekyc_due_date: evaluation.rekyc_due_date,
      },
    });
  } catch (err) {
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
      pan_number_masked: maskPan(application.pan_number),
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

import { apiClient, mockDb, delay } from './client';
import { APPLICATION_STATUS, RISK_CATEGORY } from '../constants/statuses';

export const applicationsApi = {
  /**
   * Submit a new application with documents via real backend
   */
  async createApplication(formData, uploadedFiles = []) {
    try {
      // Prepare multipart form data
      const formDataObj = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          formDataObj.append(key, formData[key]);
        }
      });
      
      // Add files
      uploadedFiles.forEach((file) => {
        if (file.file instanceof File) {
          formDataObj.append('documents', file.file, file.name);
        }
      });

      const response = await apiClient.post('/applications', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response;
    } catch (error) {
      console.warn('Backend application creation failed, falling back to mock', error);
      return await this.createApplicationMock(formData, uploadedFiles);
    }
  },

  /**
   * Get a specific application by ID
   */
  async getApplication(applicationId) {
    try {
      const response = await apiClient.get(`/applications/${applicationId}`);
      return response;
    } catch (error) {
      console.warn(`Failed to get application ${applicationId} from backend`, error);
      return await this.getApplicationMock(applicationId);
    }
  },

  /**
   * Mock fallback for getApplication
   */
  async getApplicationMock(applicationId) {
    await delay(200);
    const apps = mockDb.getApplications();
    const app = apps.find((a) => a.applicationId === applicationId);
    
    if (!app) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // Get associated documents
    const docs = mockDb.getDocuments();
    const applicationDocs = docs.filter((d) => d.applicationId === applicationId);
    
    // Get audit trail
    const audit = mockDb.getAudit();
    const applicationAudit = audit.filter((a) => a.applicationId === applicationId);

    return { success: true, data: { ...app, documents: applicationDocs, auditHistory: applicationAudit } };
  },

  /**
   * Get all applications (for officer views)
   */
  async getApplications(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] && filters[key] !== 'ALL') {
          params.append(key, filters[key]);
        }
      });

      const response = await apiClient.get('/applications', { params });
      return response;
    } catch (error) {
      console.warn('Failed to get applications from backend', error);
      return await this.getApplicationsMock(filters);
    }
  },

  /**
   * Get current applicant's applications
   */
  async getMyApplications() {
    try {
      const response = await apiClient.get('/applications?myApplications=true');
      return response;
    } catch (error) {
      console.warn('Failed to get my applications from backend', error);
      return await this.getMyApplicationsMock();
    }
  },

  /**
   * Resubmit documents for an application
   */
  async resubmitDocuments(applicationId, uploadedFiles = []) {
    try {
      const formDataObj = new FormData();
      uploadedFiles.forEach((file) => {
        if (file.file instanceof File) {
          formDataObj.append('documents', file.file, file.name);
        }
      });

      const response = await apiClient.post(
        `/applications/${applicationId}/resubmit`,
        formDataObj,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return response;
    } catch (error) {
      console.warn('Backend resubmit failed', error);
      throw error;
    }
  },

  // ===== FALLBACK MOCK METHODS =====
  async createApplicationMock(payload, uploadedFiles = []) {
    await delay(500);

    const apps = mockDb.getApplications();
    const nextNum = 2000000 + apps.length + 1;
    const applicationId = `A${nextNum}`;

    // Calculate age from DOB
    const dobDate = new Date(payload.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    // Determine initial simulation outcome
    let status = APPLICATION_STATUS.IN_REVIEW;
    let riskCategory = RISK_CATEGORY.LOW;
    let reasonCodes = [];
    let nameMatchScore = 1.0000;
    let rekycDueDate = '2036-03-04';

    // R4 Age check
    if (age < 18) {
      status = APPLICATION_STATUS.AUTO_REJECTED;
      riskCategory = null;
      reasonCodes.push('AGE_BELOW_18');
      rekycDueDate = null;
    }
    // R5 PAN check
    else if (!payload.panNumber.match(/^[A-Z]{5}[0-9]{4}[A-Z]$/) || payload.panNumber[3] !== 'P') {
      status = APPLICATION_STATUS.AUTO_REJECTED;
      riskCategory = null;
      reasonCodes.push('PAN_INVALID');
      rekycDueDate = null;
    }
    // Occupation risk check
    else if (['JEWELLER_BULLION_DEALER', 'CASINO_GAMING', 'MONEY_LENDER_EXCHANGE'].includes(payload.occupationCode)) {
      status = APPLICATION_STATUS.PENDING_CHECKER;
      riskCategory = RISK_CATEGORY.HIGH;
      rekycDueDate = '2028-03-04';
    }
    // Clean salaried application
    else if (uploadedFiles.length >= 3) {
      status = APPLICATION_STATUS.AUTO_APPROVED;
      riskCategory = RISK_CATEGORY.LOW;
      rekycDueDate = '2036-03-04';
    }

    const newApplication = {
      applicationId,
      applicationDate: new Date().toISOString(),
      fullName: payload.fullName,
      dob: payload.dob,
      gender: payload.gender,
      panNumber: payload.panNumber.toUpperCase(),
      aadhaarLast4: payload.aadhaarLast4,
      mobile: payload.mobile,
      email: payload.email,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      occupationCode: payload.occupationCode,
      annualIncome: Number(payload.annualIncome),
      status,
      riskCategory,
      nameMatchScore,
      reasonCodes,
      rekycDueDate,
      assignedOfficer: status === APPLICATION_STATUS.IN_REVIEW ? 'USR_OFFICER_U1' : 'SYSTEM',
      makerRecommendation: null,
      checkerDecision: null,
      documentsCount: uploadedFiles.length || 3,
      accountNumber: status === APPLICATION_STATUS.AUTO_APPROVED ? `DDB-${Math.floor(1000000000 + Math.random() * 9000000000)}` : null,
      customerId: status === APPLICATION_STATUS.AUTO_APPROVED ? `CUST-${Math.floor(100000 + Math.random() * 900000)}` : null,
    };

    // Save application
    mockDb.saveApplications([newApplication, ...apps]);

    // Save synthetic documents
    if (uploadedFiles.length > 0) {
      const allDocs = mockDb.getDocuments();
      const newDocs = uploadedFiles.map((f, idx) => ({
        docId: `D${3000000 + allDocs.length + idx + 1}`,
        applicationId,
        fileName: f.name || `doc_${idx + 1}.txt`,
        fileSize: f.size || 1024,
        declaredDocType: f.declaredType,
        classifiedDocType: f.declaredType,
        docTypeConfidence: 0.98,
        textContent: f.content || `SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT\nNAME: ${payload.fullName}\nDOB: ${payload.dob}\nPAN: ${payload.panNumber}\nAADHAAR: XXXX XXXX ${payload.aadhaarLast4}`,
        uploadedAt: new Date().toISOString(),
        extractedFields: [
          { fieldName: 'doc_type', value: f.declaredType, confidence: 0.99, source: 'EXTRACTION_AI' },
          { fieldName: 'name', value: payload.fullName.toUpperCase(), confidence: 0.98, source: 'EXTRACTION_AI' },
          { fieldName: 'dob', value: payload.dob, confidence: 0.99, source: 'EXTRACTION_AI' },
        ],
      }));
      mockDb.saveDocuments([...newDocs, ...allDocs]);
    }

    // Add Audit Log
    mockDb.addAudit({
      applicationId,
      actor: payload.fullName,
      role: 'APPLICANT',
      action: 'APPLICATION_SUBMITTED',
      details: `Application submitted with ${uploadedFiles.length} specimen documents. Initial status: ${status}`,
    });

    // Add Notification
    mockDb.addNotification({
      title: 'Application Received',
      message: `Your application ${applicationId} has been successfully submitted and is under automated extraction.`,
      role: 'APPLICANT',
      applicationId,
    });

    if (status === APPLICATION_STATUS.IN_REVIEW) {
      mockDb.addNotification({
        title: 'New Review Case',
        message: `Application ${applicationId} (${payload.fullName}) routed to review queue.`,
        role: 'OFFICER',
        applicationId,
      });
    }

    // Update current user's active applicationId
    const cur = mockDb.getCurrentUser();
    if (cur) {
      mockDb.setCurrentUser({ ...cur, applicationId });
    }

    return { success: true, data: newApplication };
  },

  /**
   * Submits a replacement document for resubmission workflow
   */
  async submitResubmission(applicationId, { file, declaredDocType }) {
    await delay(400);
    const apps = mockDb.getApplications();
    const appIndex = apps.findIndex((a) => a.applicationId === applicationId);
    if (appIndex === -1) throw new Error('Application not found');

    const app = apps[appIndex];
    if (app.status !== APPLICATION_STATUS.RESUBMISSION_REQUESTED) {
      throw new Error('Application is not currently in RESUBMISSION_REQUESTED state.');
    }

    // Update status to IN_REVIEW with updated reason codes
    const updatedApp = {
      ...app,
      status: APPLICATION_STATUS.IN_REVIEW,
      reasonCodes: [], // Cleared upon fresh document submission
      resubmissionRequest: null,
    };

    apps[appIndex] = updatedApp;
    mockDb.saveApplications([...apps]);

    // Add replacement document
    const docs = mockDb.getDocuments();
    const newDoc = {
      docId: `D${Date.now().toString().slice(-7)}`,
      applicationId,
      fileName: file.name,
      fileSize: file.size,
      declaredDocType,
      classifiedDocType: declaredDocType,
      docTypeConfidence: 0.99,
      textContent: file.content || `SYNTHETIC SPECIMEN - NOT A VALID DOCUMENT\nREPLACEMENT DOCUMENT FOR ${applicationId}\nTYPE: ${declaredDocType}\nVALID DATE: 2026-03-04`,
      uploadedAt: new Date().toISOString(),
      extractedFields: [
        { fieldName: 'doc_type', value: declaredDocType, confidence: 0.99, source: 'EXTRACTION_AI' },
        { fieldName: 'document_date', value: '2026-03-01', confidence: 0.98, source: 'EXTRACTION_AI' },
      ],
    };
    mockDb.saveDocuments([newDoc, ...docs]);

    // Audit
    mockDb.addAudit({
      applicationId,
      actor: app.fullName,
      role: 'APPLICANT',
      action: 'DOCUMENT_RESUBMITTED',
      details: `Applicant re-uploaded valid ${declaredDocType} (${file.name}). Application moved to IN_REVIEW.`,
    });

    // Notifications
    mockDb.addNotification({
      title: 'Resubmission Received',
      message: `Your replacement document was received. Case ${applicationId} returned to review.`,
      role: 'APPLICANT',
      applicationId,
    });
    mockDb.addNotification({
      title: 'Resubmission Ready for Review',
      message: `Applicant uploaded requested document for case ${applicationId}.`,
      role: 'OFFICER',
      applicationId,
    });

    return { success: true, data: updatedApp };
  },

  /**
   * Returns vertical timeline events for status progression
   */
  async getApplicationTimeline(applicationId) {
    await delay(150);
    const appRes = await this.getApplication(applicationId);
    const app = appRes.data;

    const timeline = [];

    // Base submission event
    timeline.push({
      status: APPLICATION_STATUS.SUBMITTED,
      title: 'Application Submitted',
      description: 'Your application and electronic consent were received.',
      timestamp: app.applicationDate,
      completed: true,
      current: false,
    });

    timeline.push({
      status: APPLICATION_STATUS.EXTRACTING,
      title: 'Document Intelligence & Screening',
      description: 'AI OCR extraction, PAN/Aadhaar consistency checks, and sanctions screening performed.',
      timestamp: new Date(new Date(app.applicationDate).getTime() + 15000).toISOString(),
      completed: true,
      current: false,
    });

    if (app.status === APPLICATION_STATUS.AUTO_APPROVED) {
      timeline.push({
        status: APPLICATION_STATUS.AUTO_APPROVED,
        title: 'Straight-Through Approval',
        description: 'All 17 compliance rules passed. Your digital savings account has been opened.',
        timestamp: new Date(new Date(app.applicationDate).getTime() + 30000).toISOString(),
        completed: true,
        current: true,
      });
    } else if (app.status === APPLICATION_STATUS.AUTO_REJECTED) {
      timeline.push({
        status: APPLICATION_STATUS.AUTO_REJECTED,
        title: 'Application Could Not Be Approved',
        description: 'Automated policy rule check flagged discrepancies in your application.',
        timestamp: new Date(new Date(app.applicationDate).getTime() + 30000).toISOString(),
        completed: true,
        current: true,
      });
    } else if (app.status === APPLICATION_STATUS.IN_REVIEW) {
      timeline.push({
        status: APPLICATION_STATUS.IN_REVIEW,
        title: 'Under Officer Review',
        description: 'Your application is assigned to a KYC Officer for manual verification.',
        timestamp: new Date(new Date(app.applicationDate).getTime() + 60000).toISOString(),
        completed: true,
        current: true,
      });
    } else if (app.status === APPLICATION_STATUS.RESUBMISSION_REQUESTED) {
      timeline.push({
        status: APPLICATION_STATUS.IN_REVIEW,
        title: 'Officer Reviewed',
        description: 'KYC Officer reviewed documents and identified a required correction.',
        timestamp: new Date(new Date(app.applicationDate).getTime() + 120000).toISOString(),
        completed: true,
        current: false,
      });
      timeline.push({
        status: APPLICATION_STATUS.RESUBMISSION_REQUESTED,
        title: 'Replacement Document Requested',
        description: app.resubmissionRequest?.reasonNote || 'Please upload the requested replacement document.',
        timestamp: app.resubmissionRequest?.requestedAt || new Date().toISOString(),
        completed: true,
        current: true,
      });
    } else if (app.status === APPLICATION_STATUS.PENDING_CHECKER) {
      timeline.push({
        status: APPLICATION_STATUS.IN_REVIEW,
        title: 'Maker Review Completed',
        description: `KYC Officer recommended ${app.makerRecommendation?.action || 'Approval'}.`,
        timestamp: app.makerRecommendation?.recommendedAt || new Date().toISOString(),
        completed: true,
        current: false,
      });
      timeline.push({
        status: APPLICATION_STATUS.PENDING_CHECKER,
        title: 'Awaiting Compliance Checker Sign-off',
        description: 'Maker-Checker dual authorization in progress with senior compliance officer.',
        timestamp: app.makerRecommendation?.recommendedAt || new Date().toISOString(),
        completed: true,
        current: true,
      });
    } else if (app.status === APPLICATION_STATUS.APPROVED) {
      timeline.push({
        status: APPLICATION_STATUS.PENDING_CHECKER,
        title: 'Checker Approved',
        description: 'Senior Compliance Officer approved the application and authorized account creation.',
        timestamp: app.checkerDecision?.decidedAt || new Date().toISOString(),
        completed: true,
        current: true,
      });
    } else if (app.status === APPLICATION_STATUS.CLOSED_EXPIRED) {
      timeline.push({
        status: APPLICATION_STATUS.CLOSED_EXPIRED,
        title: 'Application Expired',
        description: 'The 7-day resubmission window closed without document upload.',
        timestamp: new Date(new Date(app.applicationDate).getTime() + 7 * 86400000).toISOString(),
        completed: true,
        current: true,
      });
    }

    return { success: true, data: timeline };
  },
};

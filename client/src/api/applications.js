import { mockDb, delay } from './client';
import { APPLICATION_STATUS, RISK_CATEGORY } from '../constants/statuses';

export const applicationsApi = {
  /**
   * Retrieves all applications with optional filtering
   */
  async getApplications(filters = {}) {
    await delay(200);
    let apps = mockDb.getApplications();

    if (filters.status && filters.status !== 'ALL') {
      apps = apps.filter((a) => a.status === filters.status);
    }
    if (filters.riskCategory && filters.riskCategory !== 'ALL') {
      apps = apps.filter((a) => a.riskCategory === filters.riskCategory);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      apps = apps.filter(
        (a) =>
          a.applicationId.toLowerCase().includes(q) ||
          a.fullName.toLowerCase().includes(q) ||
          a.panNumber.toLowerCase().includes(q)
      );
    }

    return { success: true, data: apps };
  },

  /**
   * Retrieves a single application by ID with associated documents and audit history
   */
  async getApplication(applicationId) {
    await delay(250);
    const apps = mockDb.getApplications();
    const app = apps.find((a) => a.applicationId === applicationId);
    if (!app) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const docs = mockDb.getDocuments().filter((d) => d.applicationId === applicationId);
    const audit = mockDb.getAudit().filter((entry) => entry.applicationId === applicationId);

    return {
      success: true,
      data: {
        ...app,
        documents: docs,
        auditHistory: audit,
      },
    };
  },

  /**
   * Retrieves current applicant's active applications
   */
  async getMyApplications() {
    await delay(200);
    const currentUser = mockDb.getCurrentUser();
    const apps = mockDb.getApplications();

    // In demo mode, if applicant has a linked applicationId, return that or match email
    if (currentUser?.applicationId) {
      return {
        success: true,
        data: apps.filter((a) => a.applicationId === currentUser.applicationId),
      };
    }

    const filtered = apps.filter(
      (a) => a.email?.toLowerCase() === currentUser?.email?.toLowerCase()
    );
    return {
      success: true,
      data: filtered.length > 0 ? filtered : [apps[3]], // default to A2000004 for rich demo
    };
  },

  /**
   * Creates a new KYC application
   */
  async createApplication(payload, uploadedFiles = []) {
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

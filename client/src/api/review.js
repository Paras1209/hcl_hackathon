import { mockDb, delay } from './client';
import { APPLICATION_STATUS, RISK_CATEGORY } from '../constants/statuses';

export const reviewApi = {
  /**
   * Retrieves review queue for KYC Officers.
   * Priority rule: HIGH risk first, then oldest submission first.
   */
  async getReviewQueue(filters = {}) {
    await delay(250);
    let apps = mockDb.getApplications();

    // Default queue shows IN_REVIEW applications, but can filter
    if (filters.status && filters.status !== 'ALL') {
      apps = apps.filter((a) => a.status === filters.status);
    } else if (!filters.status) {
      apps = apps.filter((a) => a.status === APPLICATION_STATUS.IN_REVIEW);
    }

    if (filters.riskCategory && filters.riskCategory !== 'ALL') {
      apps = apps.filter((a) => a.riskCategory === filters.riskCategory);
    }

    if (filters.reasonCode && filters.reasonCode !== 'ALL') {
      apps = apps.filter((a) => a.reasonCodes && a.reasonCodes.includes(filters.reasonCode));
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

    // Sort order: HIGH risk first, then oldest submission first
    apps.sort((a, b) => {
      const riskWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const weightA = riskWeight[a.riskCategory] || 0;
      const weightB = riskWeight[b.riskCategory] || 0;

      if (weightA !== weightB) {
        return weightB - weightA; // High risk first
      }
      return new Date(a.applicationDate) - new Date(b.applicationDate); // Oldest first
    });

    return { success: true, data: apps };
  },

  /**
   * Loads full review context for an application and logs an audit view event
   */
  async getApplicationReview(applicationId) {
    await delay(300);
    const apps = mockDb.getApplications();
    const app = apps.find((a) => a.applicationId === applicationId);
    if (!app) throw new Error('Application not found');

    const docs = mockDb.getDocuments().filter((d) => d.applicationId === applicationId);
    const currentUser = mockDb.getCurrentUser();

    // Log document view audit event as required by FR-9
    mockDb.addAudit({
      applicationId,
      actor: currentUser?.name || 'KYC Officer',
      role: currentUser?.role || 'OFFICER',
      action: 'DOCUMENT_VIEWED',
      details: `Officer accessed review workspace. Inspected application details and ${docs.length} uploaded identity documents.`,
    });

    // Synthetic watchlist match check if applicable
    let sanctionsMatch = null;
    let pepMatch = null;

    if (app.reasonCodes.includes('SANCTIONS_MATCH') || app.reasonCodes.includes('SANCTIONS_POSSIBLE_MATCH')) {
      sanctionsMatch = mockDb.getSanctions().find((s) => s.name.toLowerCase() === app.fullName.toLowerCase()) || {
        listId: 'SAN0002',
        name: app.fullName,
        alias: 'Valko Q',
        dob: app.dob,
        program: 'FINANCIAL_SANCTIONS_LIST',
        similarity: 1.0,
      };
    }

    if (app.reasonCodes.includes('PEP_MATCH')) {
      pepMatch = mockDb.getPep().find((p) => p.name.toLowerCase() === app.fullName.toLowerCase()) || {
        pepId: 'PEP0001',
        name: app.fullName,
        dob: app.dob,
        position: 'Former Minister of Energy & Natural Resources',
        category: 'DOMESTIC',
        similarity: 1.0,
      };
    }

    return {
      success: true,
      data: {
        application: app,
        documents: docs,
        sanctionsMatch,
        pepMatch,
      },
    };
  },

  /**
   * Correct an extracted field (FR-6)
   * Mandatory reason of at least 10 characters.
   * On success: confidence becomes 1.00, source becomes OFFICER, re-runs mock rules.
   */
  async correctExtractedField(applicationId, { docId, fieldName, correctedValue, reason }) {
    await delay(400);

    if (!reason || reason.trim().length < 10) {
      throw new Error('Mandatory correction reason must be at least 10 characters long.');
    }

    const docs = mockDb.getDocuments();
    const docIndex = docs.findIndex((d) => d.docId === docId);
    if (docIndex === -1) throw new Error('Document not found');

    const doc = docs[docIndex];
    const fieldIndex = doc.extractedFields.findIndex((f) => f.fieldName === fieldName);

    const oldValue = fieldIndex !== -1 ? doc.extractedFields[fieldIndex].value : 'EMPTY';

    const updatedField = {
      fieldName,
      value: correctedValue,
      confidence: 1.0,
      source: 'OFFICER',
      isLowConfidence: false,
    };

    if (fieldIndex !== -1) {
      doc.extractedFields[fieldIndex] = updatedField;
    } else {
      doc.extractedFields.push(updatedField);
    }
    docs[docIndex] = doc;
    mockDb.saveDocuments([...docs]);

    // Re-evaluate mock application rules
    const apps = mockDb.getApplications();
    const appIndex = apps.findIndex((a) => a.applicationId === applicationId);
    if (appIndex !== -1) {
      const app = apps[appIndex];
      // Example 9: PAN corrected from smudged OCR -> clears LOW_EXTRACTION_CONFIDENCE
      const updatedReasonCodes = app.reasonCodes.filter((rc) => rc !== 'LOW_EXTRACTION_CONFIDENCE');
      apps[appIndex] = {
        ...app,
        reasonCodes: updatedReasonCodes,
        // Rules re-evaluation: if no more reasons, can qualify for approval
      };
      mockDb.saveApplications([...apps]);
    }

    const currentUser = mockDb.getCurrentUser();
    // Audit log
    mockDb.addAudit({
      applicationId,
      actor: currentUser?.name || 'KYC Officer',
      role: 'OFFICER',
      action: 'FIELD_CORRECTED',
      details: `Corrected field [${fieldName}] on doc ${docId}. Before: "${oldValue}" -> After: "${correctedValue}". Reason: "${reason}"`,
    });

    return {
      success: true,
      data: {
        doc,
        field: updatedField,
        beforeValue: oldValue,
        afterValue: correctedValue,
        simulatedRuleStatus: 'Re-evaluation completed. Confidence updated to 1.00.',
      },
    };
  },

  /**
   * Submit KYC Officer recommendation (APPROVE / REJECT / REQUEST_RESUBMISSION)
   * Mandatory comment of at least 10 characters.
   */
  async submitOfficerRecommendation(applicationId, { action, comment }) {
    await delay(450);

    if (!comment || comment.trim().length < 10) {
      throw new Error('Mandatory recommendation comment must be at least 10 characters long.');
    }

    const apps = mockDb.getApplications();
    const appIndex = apps.findIndex((a) => a.applicationId === applicationId);
    if (appIndex === -1) throw new Error('Application not found');

    const app = apps[appIndex];
    const currentUser = mockDb.getCurrentUser();

    let newStatus = APPLICATION_STATUS.PENDING_CHECKER;
    let resubmissionRequest = null;

    if (action === 'REQUEST_RESUBMISSION') {
      newStatus = APPLICATION_STATUS.RESUBMISSION_REQUESTED;
      resubmissionRequest = {
        documentTypeNeeded: app.reasonCodes.includes('DOCUMENT_EXPIRED') ? 'DRIVING_LICENCE' : 'ANY',
        reasonNote: comment,
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days window
        requestedAt: new Date().toISOString(),
      };
    }

    const updatedApp = {
      ...app,
      status: newStatus,
      makerRecommendation: {
        action,
        comment,
        officerId: currentUser?.id || 'USR_OFFICER_U1',
        officerName: currentUser?.name || 'Ananya Verma (Officer U1)',
        recommendedAt: new Date().toISOString(),
      },
      resubmissionRequest,
    };

    apps[appIndex] = updatedApp;
    mockDb.saveApplications([...apps]);

    // Audit log
    mockDb.addAudit({
      applicationId,
      actor: currentUser?.name || 'KYC Officer',
      role: 'OFFICER',
      action: 'OFFICER_RECOMMENDATION',
      details: `Officer recommended ${action}. Comment: "${comment}". New application status: ${newStatus}`,
    });

    // Notifications
    if (newStatus === APPLICATION_STATUS.PENDING_CHECKER) {
      mockDb.addNotification({
        title: 'Pending Checker Decision',
        message: `Case ${applicationId} recommended for ${action} by ${currentUser?.name || 'KYC Officer'}.`,
        role: 'CHECKER',
        applicationId,
      });
    } else if (newStatus === APPLICATION_STATUS.RESUBMISSION_REQUESTED) {
      mockDb.addNotification({
        title: 'Document Resubmission Required',
        message: `Officer requested document replacement for application ${applicationId}: ${comment}`,
        role: 'APPLICANT',
        applicationId,
      });
    }

    return { success: true, data: updatedApp };
  },
};

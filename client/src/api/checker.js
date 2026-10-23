import { mockDb, delay } from './client';
import { APPLICATION_STATUS } from '../constants/statuses';

export const checkerApi = {
  /**
   * Retrieves pending checker queue
   */
  async getPendingCheckerQueue(filters = {}) {
    await delay(250);
    const apps = mockDb.getApplications();
    let pending = apps.filter((a) => a.status === APPLICATION_STATUS.PENDING_CHECKER);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      pending = pending.filter(
        (a) =>
          a.applicationId.toLowerCase().includes(q) ||
          a.fullName.toLowerCase().includes(q) ||
          a.makerRecommendation?.officerName?.toLowerCase().includes(q)
      );
    }

    if (filters.riskCategory && filters.riskCategory !== 'ALL') {
      pending = pending.filter((a) => a.riskCategory === filters.riskCategory);
    }

    return { success: true, data: pending };
  },

  /**
   * Submits checker decision (APPROVE / REJECT / SEND_BACK).
   * Enforces Maker != Checker rule!
   */
  async submitCheckerDecision(applicationId, { decision, comment }) {
    await delay(450);

    if (!comment || comment.trim().length < 5) {
      throw new Error('Please provide an explanatory comment for your decision.');
    }

    const apps = mockDb.getApplications();
    const appIndex = apps.findIndex((a) => a.applicationId === applicationId);
    if (appIndex === -1) throw new Error('Application not found');

    const app = apps[appIndex];
    const currentUser = mockDb.getCurrentUser();

    // MAKER-CHECKER SEGREGATION CHECK
    if (app.makerRecommendation?.officerId && currentUser?.id === app.makerRecommendation.officerId) {
      const err = new Error(
        `Dual-Control Violation (Rule FR-7): The approving checker cannot be the same user who prepared or recommended the review (${app.makerRecommendation.officerName}). Please switch demo role to a different Compliance Officer.`
      );
      err.code = 'MAKER_CHECKER_VIOLATION';
      throw err;
    }

    let newStatus = APPLICATION_STATUS.APPROVED;
    let customerId = app.customerId;
    let accountNumber = app.accountNumber;

    if (decision === 'APPROVE') {
      newStatus = APPLICATION_STATUS.APPROVED;
      // Simulate Core Banking integration
      customerId = customerId || `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
      accountNumber = accountNumber || `DDB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    } else if (decision === 'REJECT') {
      newStatus = APPLICATION_STATUS.REJECTED;
    } else if (decision === 'SEND_BACK') {
      newStatus = APPLICATION_STATUS.IN_REVIEW;
    }

    const updatedApp = {
      ...app,
      status: newStatus,
      customerId,
      accountNumber,
      checkerDecision: {
        decision,
        comment,
        checkerId: currentUser?.id || 'USR_CHECKER_C1',
        checkerName: currentUser?.name || 'Suresh Patel (Checker C1)',
        decidedAt: new Date().toISOString(),
      },
    };

    apps[appIndex] = updatedApp;
    mockDb.saveApplications([...apps]);

    // Audit log
    mockDb.addAudit({
      applicationId,
      actor: currentUser?.name || 'Compliance Checker',
      role: 'CHECKER',
      action: `CHECKER_${decision}`,
      details: `Compliance Checker rendered decision: ${decision}. Comment: "${comment}". Assigned Account: ${accountNumber || 'None'}. New status: ${newStatus}`,
    });

    // Notifications
    mockDb.addNotification({
      title: decision === 'APPROVE' ? 'Account Opening Approved' : `Application ${decision}`,
      message:
        decision === 'APPROVE'
          ? `Your application ${applicationId} has received final checker authorization! Account: ${accountNumber}`
          : `Application ${applicationId} outcome: ${decision}.`,
      role: 'APPLICANT',
      applicationId,
    });

    if (decision === 'SEND_BACK') {
      mockDb.addNotification({
        title: 'Case Sent Back to Review',
        message: `Case ${applicationId} returned to review queue by checker: ${comment}`,
        role: 'OFFICER',
        applicationId,
      });
    }

    return {
      success: true,
      data: updatedApp,
      syntheticBankingResult: decision === 'APPROVE' ? { customerId, accountNumber } : null,
    };
  },

  /**
   * Computes exact FR-10 compliance dashboard metrics
   */
  async getDashboardMetrics(dateRange = 'ALL') {
    await delay(300);
    const allApps = mockDb.getApplications();

    // Filter by date range
    const now = new Date();
    let filteredApps = [...allApps];

    if (dateRange === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      filteredApps = allApps.filter((a) => a.applicationDate?.startsWith(todayStr));
    } else if (dateRange === '7D') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      filteredApps = allApps.filter((a) => new Date(a.applicationDate) >= sevenDaysAgo);
    } else if (dateRange === '30D') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      filteredApps = allApps.filter((a) => new Date(a.applicationDate) >= thirtyDaysAgo);
    }

    // 1. Applications by status counts
    const statusCounts = {};
    Object.values(APPLICATION_STATUS).forEach((st) => {
      statusCounts[st] = 0;
    });
    filteredApps.forEach((a) => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    // 2. Decided applications: AUTO_APPROVED, APPROVED, REJECTED, AUTO_REJECTED, CLOSED_EXPIRED
    const decidedApps = filteredApps.filter((a) =>
      [
        APPLICATION_STATUS.AUTO_APPROVED,
        APPLICATION_STATUS.APPROVED,
        APPLICATION_STATUS.REJECTED,
        APPLICATION_STATUS.AUTO_REJECTED,
        APPLICATION_STATUS.CLOSED_EXPIRED,
      ].includes(a.status)
    );

    const totalDecided = decidedApps.length;
    const autoApprovedCount = statusCounts[APPLICATION_STATUS.AUTO_APPROVED] || 0;

    // Straight-through rate = AUTO_APPROVED ÷ all decided (as specified in FR-10)
    const straightThroughRate = totalDecided > 0 ? (autoApprovedCount / totalDecided) * 100 : 0;

    // Review rate: share of decided applications that underwent manual review
    const reviewedCount = decidedApps.filter(
      (a) => a.status === APPLICATION_STATUS.APPROVED || a.makerRecommendation !== null
    ).length;
    const reviewRate = totalDecided > 0 ? (reviewedCount / totalDecided) * 100 : 0;

    // Reject rate: share of decided applications that were rejected
    const rejectedCount =
      (statusCounts[APPLICATION_STATUS.REJECTED] || 0) +
      (statusCounts[APPLICATION_STATUS.AUTO_REJECTED] || 0);
    const rejectRate = totalDecided > 0 ? (rejectedCount / totalDecided) * 100 : 0;

    // 5. Pending Checker Items
    const pendingCheckerCount = statusCounts[APPLICATION_STATUS.PENDING_CHECKER] || 0;

    // 6. Average time in review (synthetic calculated in hours)
    const avgTimeInReviewHours = 3.8;

    // 7. Top 5 Reason Codes ranked by frequency
    const reasonCodeCounts = {};
    filteredApps.forEach((a) => {
      if (Array.isArray(a.reasonCodes)) {
        a.reasonCodes.forEach((rc) => {
          reasonCodeCounts[rc] = (reasonCodeCounts[rc] || 0) + 1;
        });
      }
    });

    const topReasonCodes = Object.entries(reasonCodeCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      success: true,
      data: {
        totalApplications: filteredApps.length,
        totalDecided,
        statusCounts,
        straightThroughRate: Number(straightThroughRate.toFixed(1)),
        reviewRate: Number(reviewRate.toFixed(1)),
        rejectRate: Number(rejectRate.toFixed(1)),
        pendingCheckerCount,
        avgTimeInReviewHours,
        topReasonCodes,
        filteredApplications: filteredApps,
      },
    };
  },

  /**
   * Watchlists and rules configuration
   */
  async getRuleConfigurations() {
    await delay(150);
    return {
      success: true,
      data: mockDb.getRules(),
    };
  },

  async updateRuleConfigurations(newConfig) {
    await delay(300);
    mockDb.saveRules(newConfig);
    mockDb.addAudit({
      actor: mockDb.getCurrentUser()?.name || 'Compliance Officer',
      role: 'CHECKER',
      action: 'RULES_CONFIG_UPDATED',
      details: 'Compliance thresholds and watchlist parameters updated.',
    });
    return { success: true, data: newConfig };
  },

  async getWatchlists(type = 'SANCTIONS') {
    await delay(150);
    if (type === 'SANCTIONS') {
      return { success: true, data: mockDb.getSanctions() };
    }
    return { success: true, data: mockDb.getPep() };
  },
};

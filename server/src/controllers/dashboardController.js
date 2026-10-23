/**
 * Dashboard Controller
 * Handles compliance officer dashboard statistics endpoints
 * Source: TEAM_WORK_DISTRIBUTION.md - Developer 3
 * Reference: case_studies.md FR-10 Dashboard
 */

const Application = require('../models/Application');
const logger = require('../utils/logger');

/**
 * GET /api/dashboard/stats
 * Overall statistics for compliance dashboard
 * Returns: total count, decided count, counts by status, STP rate, review rate, reject rate
 * Reference: case_studies.md FR-10
 */
exports.getStats = async (req, res, next) => {
  try {
    // Applications by status
    const byStatus = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Total applications
    const total = await Application.countDocuments();

    // Decided applications (for rate calculations)
    const decided = await Application.countDocuments({
      status: {
        $in: [
          'AUTO_APPROVED',
          'APPROVED',
          'REJECTED',
          'AUTO_REJECTED',
          'CLOSED_EXPIRED',
        ],
      },
    });

    // Auto-approved (straight-through processing)
    const autoApproved = await Application.countDocuments({
      status: 'AUTO_APPROVED',
    });

    // Reviewed applications (went through IN_REVIEW)
    const reviewed = await Application.countDocuments({
      $and: [
        { status: { $in: ['APPROVED', 'REJECTED', 'CLOSED_EXPIRED'] } },
        { decision: 'REVIEW' },
      ],
    });

    // Rejected applications
    const rejected = await Application.countDocuments({
      status: { $in: ['REJECTED', 'AUTO_REJECTED'] },
    });

    // Calculate rates
    const stpRate = decided > 0 ? (autoApproved / decided) * 100 : 0;
    const reviewRate = decided > 0 ? (reviewed / decided) * 100 : 0;
    const rejectRate = decided > 0 ? (rejected / decided) * 100 : 0;

    logger.info(
      {
        total,
        decided,
        stp_rate: stpRate.toFixed(2),
        review_rate: reviewRate.toFixed(2),
        reject_rate: rejectRate.toFixed(2),
      },
      'Dashboard stats calculated'
    );

    res.json({
      success: true,
      data: {
        total,
        decided,
        by_status: byStatus,
        stp_rate: parseFloat(stpRate.toFixed(2)),
        review_rate: parseFloat(reviewRate.toFixed(2)),
        reject_rate: parseFloat(rejectRate.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/top-reasons
 * Top 5 reason codes across all applications
 * Returns: array of top 5 reason codes with their counts
 * Reference: case_studies.md FR-10
 */
exports.getTopReasons = async (req, res, next) => {
  try {
    const applications = await Application.find({
      reason_codes: { $exists: true, $ne: [] },
    }).select('reason_codes');

    // Count reason codes
    const reasonCounts = {};

    for (const app of applications) {
      if (app.reason_codes && Array.isArray(app.reason_codes)) {
        for (const code of app.reason_codes) {
          reasonCounts[code] = (reasonCounts[code] || 0) + 1;
        }
      }
    }

    // Sort and get top 5
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    logger.info(
      { top_5_reasons: topReasons.map((r) => r.code) },
      'Top reasons calculated'
    );

    res.json({
      success: true,
      data: topReasons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/metrics
 * Additional metrics for compliance dashboard
 * Returns: average time in review, pending checker count, risk category breakdown
 * Reference: case_studies.md FR-10
 */
exports.getMetrics = async (req, res, next) => {
  try {
    // Average time in review (for decided applications that went through review)
    const reviewedApps = await Application.find({
      status: { $in: ['APPROVED', 'REJECTED'] },
      submitted_at: { $exists: true },
      decided_at: { $exists: true },
      decision: 'REVIEW', // Only applications that went through review
    }).select('submitted_at decided_at');

    let avgTimeInReview = 0;
    if (reviewedApps.length > 0) {
      const totalTime = reviewedApps.reduce((sum, app) => {
        const timeDiff = new Date(app.decided_at) - new Date(app.submitted_at);
        return sum + timeDiff;
      }, 0);
      avgTimeInReview = totalTime / reviewedApps.length / (1000 * 60 * 60); // Convert to hours
    }

    // Pending checker count
    const pendingCheckerCount = await Application.countDocuments({
      status: 'PENDING_CHECKER',
    });

    // Applications by risk category
    const byRisk = await Application.aggregate([
      {
        $match: {
          risk_category: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$risk_category',
          count: { $sum: 1 },
        },
      },
    ]);

    logger.info(
      {
        avg_time_hours: avgTimeInReview.toFixed(2),
        pending_checker: pendingCheckerCount,
        risk_distribution: byRisk,
      },
      'Dashboard metrics calculated'
    );

    res.json({
      success: true,
      data: {
        avg_time_in_review_hours: parseFloat(avgTimeInReview.toFixed(2)),
        pending_checker_count: pendingCheckerCount,
        by_risk_category: byRisk,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;

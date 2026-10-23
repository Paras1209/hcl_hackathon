const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

/**
 * GET /api/audit/:application_id
 * Full audit trail for an application (Compliance Officer only).
 */
router.get(
  '/:application_id',
  authenticate,
  authorize('KYC_OFFICER', 'COMPLIANCE_OFFICER'),
  async (req, res) => {
    const { application_id } = req.params;
    const logs = await AuditLog.find({ application_id })
      .sort({ timestamp: 1 })
      .populate('user_id', 'full_name email role');

    return res.status(200).json({
      success: true,
      data: { audit_trail: logs, total: logs.length },
    });
  }
);

/**
 * GET /api/audit
 * All audit logs with optional date filter (Compliance Officer only).
 * Query: ?from=2024-01-01&to=2024-12-31&event_type=STATUS_CHANGE
 */
router.get(
  '/',
  authenticate,
  authorize('COMPLIANCE_OFFICER'),
  async (req, res) => {
    const { from, to, event_type, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    if (event_type) filter.event_type = event_type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).populate('user_id', 'full_name role'),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        audit_logs: logs,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  }
);

module.exports = router;

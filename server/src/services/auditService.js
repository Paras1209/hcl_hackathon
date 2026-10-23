const AuditLog = require('../models/AuditLog');
const { generateToken } = require('../utils/hash');
const logger = require('../utils/logger');

/**
 * Append-only audit log service.
 * SACRED: No update/delete operations ever.
 */

/**
 * Log a status change event.
 */
async function logStatusChange({ application_id, user_id, role, old_status, new_status, reason }) {
  return _createLog({
    application_id,
    user_id,
    role,
    event_type: 'STATUS_CHANGE',
    old_value: old_status,
    new_value: new_status,
    reason,
  });
}

/**
 * Log a final decision event.
 */
async function logDecision({ application_id, user_id, role, decision, reason_codes }) {
  return _createLog({
    application_id,
    user_id,
    role,
    event_type: 'DECISION',
    new_value: decision,
    reason: reason_codes ? reason_codes.join(', ') : undefined,
  });
}

/**
 * Log a field correction by an officer.
 */
async function logFieldCorrection({ application_id, user_id, role, field_name, old_value, new_value, reason }) {
  return _createLog({
    application_id,
    user_id,
    role,
    event_type: 'FIELD_CORRECTION',
    old_value: `${field_name}: ${old_value}`,
    new_value: `${field_name}: ${new_value}`,
    reason,
  });
}

/**
 * Log a document view (SACRED: every view must be audited).
 */
async function logDocumentView({ application_id, doc_id, user_id, role }) {
  return _createLog({
    application_id,
    user_id,
    role,
    event_type: 'DOCUMENT_VIEW',
    doc_id,
  });
}

/**
 * Log a watchlist hit.
 */
async function logWatchlistHit({ application_id, user_id, role, list_type, list_id }) {
  return _createLog({
    application_id,
    user_id,
    role,
    event_type: 'WATCHLIST_HIT',
    new_value: `${list_type}: ${list_id}`,
  });
}

/**
 * Log an auth event (login/logout/register).
 */
async function logAuthEvent({ user_id, role, event_type }) {
  return _createLog({ user_id, role, event_type });
}

/**
 * Get full audit trail for an application.
 */
async function getAuditTrail(application_id) {
  return AuditLog.find({ application_id })
    .sort({ timestamp: 1 })
    .populate('user_id', 'full_name email role');
}

/**
 * Internal: create a single audit log entry.
 * @private
 */
async function _createLog(data) {
  const audit_id = `AUD${Date.now()}${generateToken(4)}`;
  try {
    const log = await AuditLog.create({ audit_id, ...data, timestamp: new Date() });
    logger.debug({ audit_id, event_type: data.event_type }, 'Audit log created');
    return log;
  } catch (err) {
    // Audit failures must NOT block the main operation - log and continue
    logger.error({ err, data }, 'Failed to create audit log');
  }
}

module.exports = {
  logStatusChange,
  logDecision,
  logFieldCorrection,
  logDocumentView,
  logWatchlistHit,
  logAuthEvent,
  getAuditTrail,
};

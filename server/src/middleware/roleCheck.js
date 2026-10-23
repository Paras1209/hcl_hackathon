/**
 * roleCheck.js - Role-based access control helpers.
 * 
 * The primary RBAC is handled by `auth.js` authorize() factory.
 * This module provides additional helpers for complex ownership checks.
 */

const { createError } = require('./errorHandler');

/**
 * Ensure the current user owns the application (or is an officer).
 * Use after authenticate().
 * 
 * Usage: router.get('/api/applications/:id', authenticate, checkOwnerOrOfficer, controller)
 */
function checkOwnerOrOfficer(req, res, next) {
  if (req.user.role === 'APPLICANT') {
    // The controller must verify application.user_id === req.user._id
    // Set a flag so controllers know to enforce ownership
    req.enforceOwnership = true;
  }
  next();
}

/**
 * Restrict a route to officers only (KYC_OFFICER or COMPLIANCE_OFFICER).
 */
function officersOnly(req, res, next) {
  if (!['KYC_OFFICER', 'COMPLIANCE_OFFICER'].includes(req.user.role)) {
    throw createError('Officers only', 403, 'FORBIDDEN');
  }
  next();
}

/**
 * Restrict a route to compliance officers only.
 */
function complianceOnly(req, res, next) {
  if (req.user.role !== 'COMPLIANCE_OFFICER') {
    throw createError('Compliance Officers only', 403, 'FORBIDDEN');
  }
  next();
}

module.exports = { checkOwnerOrOfficer, officersOnly, complianceOnly };

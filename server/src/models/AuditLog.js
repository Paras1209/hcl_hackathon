const mongoose = require('mongoose');

const EVENT_TYPES = [
  'STATUS_CHANGE',
  'DECISION',
  'FIELD_CORRECTION',
  'DOCUMENT_VIEW',
  'WATCHLIST_HIT',
  'LOGIN',
  'LOGOUT',
  'REGISTER',
];

const AuditLogSchema = new mongoose.Schema(
  {
    audit_id: {
      type: String,
      unique: true,
      required: true,
    },
    application_id: {
      type: String,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    event_type: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },

    // Context fields (nullable depending on event_type)
    old_value: { type: String },
    new_value: { type: String },
    reason: { type: String },
    doc_id: { type: String }, // for DOCUMENT_VIEW

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // SACRED: No updates or deletes on audit logs (append-only)
    // Do NOT add updatedAt - this prevents accidental updates
    timestamps: false,
  }
);

// Compound index for application audit trail queries
AuditLogSchema.index({ application_id: 1, timestamp: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;

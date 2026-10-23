const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'SUBMITTED',
  'EXTRACTING',
  'AUTO_APPROVED',
  'IN_REVIEW',
  'PENDING_CHECKER',
  'APPROVED',
  'REJECTED',
  'AUTO_REJECTED',
  'RESUBMISSION_REQUESTED',
  'CLOSED_EXPIRED',
];

const DECISIONS = ['APPROVE', 'REVIEW', 'REJECT'];
const RISK_CATEGORIES = ['LOW', 'MEDIUM', 'HIGH'];

const ApplicationSchema = new mongoose.Schema(
  {
    application_id: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    application_date: {
      type: Date,
      default: Date.now,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'SUBMITTED',
      required: true,
      index: true,
    },

    // ── Form Data ─────────────────────────────────────────────────────────────
    full_name: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['M', 'F', 'OTHER'], required: true },
    pan_number: { type: String, required: true, uppercase: true, trim: true },
    // SACRED: only last 4 digits of Aadhaar stored
    aadhaar_last4: { type: String, required: true, match: /^[0-9]{4}$/ },
    mobile: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    occupation_code: { type: String, required: true },
    annual_income: { type: Number, required: true },

    // ── Rules Engine Output ───────────────────────────────────────────────────
    decision: {
      type: String,
      enum: DECISIONS,
    },
    reason_codes: [{ type: String }],
    name_match_score: { type: Number },
    risk_category: {
      type: String,
      enum: RISK_CATEGORIES,
      index: true,
    },
    rekyc_due_date: { type: Date },

    // ── Maker-Checker ─────────────────────────────────────────────────────────
    maker_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    maker_recommendation: { type: String },
    maker_comment: { type: String },
    checker_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    checker_decision: { type: String },
    checker_comment: { type: String },

    // ── Timestamps ────────────────────────────────────────────────────────────
    submitted_at: { type: Date },
    decided_at: { type: Date },
    resubmission_deadline: { type: Date }, // 7 days from RESUBMISSION_REQUESTED

    // ── Core Banking (on final approval) ─────────────────────────────────────
    customer_id: { type: String },
    account_number: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for review queue ordering: risk_category DESC, application_date ASC
ApplicationSchema.index({ risk_category: -1, application_date: 1 });
ApplicationSchema.index({ application_date: -1 });

module.exports = mongoose.model('Application', ApplicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;

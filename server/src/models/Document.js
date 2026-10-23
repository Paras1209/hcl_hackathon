const mongoose = require('mongoose');

const DOC_TYPES = [
  'PAN_CARD',
  'AADHAAR_CARD',
  'ELECTRICITY_BILL',
  'BANK_STATEMENT',
  'DRIVING_LICENCE',
  'OTHER',
];

const ExtractedFieldSchema = new mongoose.Schema(
  {
    field_name: { type: String, required: true },
    value: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    source: {
      type: String,
      enum: ['OCR', 'EXTRACTION', 'OFFICER'],
      default: 'OCR',
    },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    doc_id: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    application_id: {
      type: String,
      required: true,
      ref: 'Application',
      index: true,
    },
    file_name: { type: String, required: true },

    // ── Cloudinary Storage ────────────────────────────────────────────────────
    cloudinary_public_id: { type: String },
    cloudinary_secure_url: { type: String },
    cloudinary_resource_type: { type: String, default: 'raw' },
    file_hash: { type: String }, // SHA-256 of original content
    file_size: { type: Number },

    // ── Doc Type ──────────────────────────────────────────────────────────────
    declared_doc_type: {
      type: String,
      enum: DOC_TYPES.filter((t) => t !== 'OTHER'),
      required: true,
    },
    classified_doc_type: {
      type: String,
      enum: DOC_TYPES,
    },
    doc_type_confidence: { type: Number, min: 0, max: 1 },

    // ── Extraction ────────────────────────────────────────────────────────────
    extracted_fields: [ExtractedFieldSchema],

    // ── Timestamps ────────────────────────────────────────────────────────────
    uploaded_at: { type: Date, default: Date.now },
    processed_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Document', DocumentSchema);
module.exports.DOC_TYPES = DOC_TYPES;

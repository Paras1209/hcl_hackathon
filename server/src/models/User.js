const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ROLES = ['APPLICANT', 'KYC_OFFICER', 'COMPLIANCE_OFFICER'];

const UserSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
      select: false, // never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
UserSchema.index({ role: 1 });

/**
 * Compare a plain password against the stored hash.
 * @param {string} plainPassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password_hash);
};

/**
 * Safe user object without password_hash.
 */
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password_hash;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);

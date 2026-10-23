const mongoose = require('mongoose');

const ExistingCustomerSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String,
      unique: true,
      required: true,
    },
    full_name: { type: String, required: true },
    pan_number: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    dob: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('ExistingCustomer', ExistingCustomerSchema);

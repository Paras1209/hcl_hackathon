const mongoose = require('mongoose');

const ConfigurationSchema = new mongoose.Schema(
  {
    config_key: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    // Mixed allows any value: number, string, array, boolean
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Configuration', ConfigurationSchema);

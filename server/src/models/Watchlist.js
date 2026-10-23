const mongoose = require('mongoose');

const WatchlistSchema = new mongoose.Schema(
  {
    list_type: {
      type: String,
      enum: ['SANCTIONS', 'PEP'],
      required: true,
      index: true,
    },
    list_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    alias: { type: String },
    dob: { type: Date },
    nationality: { type: String },
    program: { type: String },   // for SANCTIONS
    position: { type: String },  // for PEP
    category: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('Watchlist', WatchlistSchema);

// models/Media.js
const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'document', 'video'], default: 'image' },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },            // optional
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }, // optional
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Optional: blockchain reference for immutable records
  blockchainId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Media', MediaSchema);

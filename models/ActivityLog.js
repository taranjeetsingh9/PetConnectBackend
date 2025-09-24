// models/ActivityLog.js
const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },   // e.g., "Adopted Pet", "Updated Profile"
  target: { type: String },                   // e.g., Pet ID, Contract ID
  details: String,

  // Optional blockchain reference for immutable log
  blockchainId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);

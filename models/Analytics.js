// models/Analytics.js
const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  metric: { type: String, required: true },   
  value: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', AnalyticsSchema);

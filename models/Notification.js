// models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['appointment', 'contract', 'general'], default: 'general' },

  // Optional: link to appointment or contract
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);

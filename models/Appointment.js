// models/Appointment.js
const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

  type: { type: String, enum: ['meet-and-greet', 'vet-consultation', 'training-session'], default: 'meet-and-greet' },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },

  // Optional: Blockchain reference for appointment verification (future)
  blockchainId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);

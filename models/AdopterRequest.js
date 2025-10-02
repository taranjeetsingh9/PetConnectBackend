const mongoose = require('mongoose');

const AdoptionRequestSchema = new mongoose.Schema({
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  adopter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  status: { 
    type: String,
    enum: ['pending','approved','ignored','rejected','on-hold','finalized', 'meeting', 'chat'],
    default: 'pending'
  },
  requestedAt: { type: Date, default: Date.now },
  meeting: {
    date: Date,
    confirmed: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.models.AdoptionRequest || mongoose.model('AdoptionRequest', AdoptionRequestSchema);

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
    confirmed: { type: Boolean, default: false },

    type: { 
      type: String, 
      enum: ['virtual', 'in-person'],
      default: 'virtual' 
    },
    status: { 
      type: String, 
      enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    location: { type: String, default: 'Shelter Facility' },
    meetingLink: String, // For virtual meetings
    agenda: String,
    preparationNotes: String,
    confirmedAt: Date,
    completedAt: Date
  }
  
}, { timestamps: true });

module.exports = mongoose.models.AdoptionRequest || mongoose.model('AdoptionRequest', AdoptionRequestSchema);

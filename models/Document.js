const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  adoptionRequest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdoptionRequest', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['id_proof', 'address_proof', 'income_proof', 'home_verification', 'other'],
    required: true 
  },
  fileUrl: { 
    type: String, 
    required: true 
  },
  fileName: String,
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  verifiedAt: Date,
  rejectionReason: String
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Document', documentSchema);
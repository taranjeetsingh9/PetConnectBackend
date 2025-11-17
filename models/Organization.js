// models/Organization.js
const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['shelter', 'rescue', 'vet', 'trainer'] },
  contact: {
    email: String,
    phone: String,
    address: String
  },
  staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],

  status: { 
    type: String, 
    enum: ['pending', 'active', 'suspended'], 
    default: 'active'  // All existing orgs become active
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false  // Not required for existing data
  },
  verified: { 
    type: Boolean, 
    default: true  // All existing orgs are verified
  }
}, { timestamps: true });


module.exports = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

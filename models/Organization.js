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
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }]
}, { timestamps: true });


module.exports = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);

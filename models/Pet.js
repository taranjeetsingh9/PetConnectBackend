const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  breed: String,
  age: Number,
  gender: { type: String, enum: ['Male', 'Female'] , required: false},
  status: {
    type: String,
    enum: [
      'Available',
      'Fostered',
      'Adopted',
      'Ready for Treatment',
      'In Treatment',
      'Ready for Adoption',
      'Unavailable'
    ],
    default: 'Available'
  },
  

  // Behavior and care
  energyLevel: String,
  temperament: [String],
  specialNeeds: [String],
  diet: String,
  exerciseNeeds: String,

  // Health
  vaccinations: [{ name: String, date: Date }],
  medicalHistory: [String],
  healthNotes: { type: String, default: "" },   // 🩺 for vets to update

// Full health tracking history
healthHistory: [
  {
    notes: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedAt: { type: Date, default: Date.now }
  }
],

  // Training
  trainingNotes: { type: String, default: "" }, // 🐕 for trainers to update
  
  // References
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  vet: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // will work on later on it's flow.
  // Inline media (image URLs)
  images: [{ type: String }],

  // Blockchain
  blockchainId: { type: String, unique: true, sparse: true } // optional, unique if exists
}, { timestamps: true });

module.exports = mongoose.models.Pet || mongoose.model('Pet', PetSchema);
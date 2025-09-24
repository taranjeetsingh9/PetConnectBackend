// const mongoose = require('mongoose');

// const PetSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   breed: String,
//   age: Number,
//   gender: String,
//   status: { type: String, enum: ['Available', 'Adopted'], default: 'Available' },
// });

// module.exports = mongoose.model('Pet', PetSchema);

// models/Pet.js
const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  breed: String,
  age: Number,
  gender: { type: String, enum: ['Male', 'Female'] },
  status: { type: String, enum: ['Available', 'Fostered', 'Adopted'], default: 'Available' },

  // Behavior and care
  energyLevel: String,
  temperament: [String],
  specialNeeds: [String],
  diet: String,
  exerciseNeeds: String,

  // Health
  vaccinations: [{ name: String, date: Date }],
  medicalHistory: [String],

  // References
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

  // Blockchain
  blockchainId: { type: String, unique: true, sparse: true } // optional, unique if exists
}, { timestamps: true });

module.exports = mongoose.model('Pet', PetSchema);

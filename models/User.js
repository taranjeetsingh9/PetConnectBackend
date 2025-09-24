// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
// });

// module.exports = mongoose.model('User', UserSchema);

// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  name: { type: String },
  location: { type: String },
  role: { type: String, enum: ['adopter', 'vet', 'staff', 'trainer', 'admin'], default: 'adopter' },

  lifestyle: {
    activityLevel: String,           // low, medium, high
    homeType: String,                // apartment, house, farm
    personalityTraits: [String],     // e.g., patient, active
    allergies: [String]
  },

  // Pet interactions
  favoritedPets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],
  fosteredPets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],
  adoptedPets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],

  // Organization if staff
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

  // Optional: Blockchain wallet (future)
  walletAddress: { type: String },

  // Optional: track last login
  lastLogin: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

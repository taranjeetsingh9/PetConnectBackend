const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  name: { type: String },
  location: { type: String },
  role: { type: String, enum: ['adopter', 'vet', 'staff', 'trainer', 'admin'], default: 'adopter' },


  // profile 
  avatar: {
    url: String,
    public_id: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },

  // test

  specialization: {
    type: String,
    default: '' // Empty default - safe for all users
  },
  experience: {
    type: Number,
    default: 0 // Zero default - safe for all users
  },
  rating: {
    type: Number,
    default: 0 // Zero default - safe for all users
  },
  bio: {
    type: String,
    default: '' // Empty default - safe for all users
  },
  
  // Vet-specific fields
  qualifications: {
    type: [String],
    default: [] // Empty array - safe
  },
  licenseNumber: {
    type: String,
    default: ''
  },
  
  // Trainer-specific fields
  certifications: {
    type: [String],
    default: [] // Empty array - safe
  },
  hourlyRate: {
    type: Number,
    default: 0 // Zero default - safe
  },


  // test




  lifestyle: {
    activityLevel: String,        
    homeType: String,                
    personalityTraits: [String],     
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

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);

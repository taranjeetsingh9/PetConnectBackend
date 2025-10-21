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

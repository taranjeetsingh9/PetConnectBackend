const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({

  name: { type: String, required: true },
  breed: String,
  age: Number,

  gender: { type: String, enum: ['Male', 'Female'] , required: false},



  status: {
    type: String,
    enum: [
    // Shelter pet statuses
    'Available',
    'Pending Adoption', 
    'Pending Foster',
    'Adopted',
    'Fostered',
    
    // Personal listing statuses  
    'available_fostering',
    'pending_foster',
    'fostered',
    
    // Medical statuses
    'Ready for Treatment',
    'In Treatment', 
    'Ready for Adoption',
    'Unavailable',

    // training
    'In Training',
    'Training Complete'
    ],
    default: 'Available'
  },

  // ADD THESE 3 FIELDS for personal listings:
description: String, // For personal listings - pet description
careInstructions: String, // For personal listings - care instructions
location: String, // For personal listings - location
contactInfo: String, // For personal listings - contact info

listingType: {
    type: String,
    enum: ['shelter', 'personal'],
    default: 'shelter' 
  },
  isPersonalListing: {
    type: Boolean,
    default: false // All existing pets remain false
  },



  // Add this to your PetSchema
fosterRequests: [{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: String,
  status: { 
    type: String, 
    enum: ['pending', 'in_discussion', 'approved', 'rejected', 'meeting_scheduled'],
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now },
  chatThread: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  meetingDate: Date,
  meetingLocation: String,
  notes: String
}],

currentFoster: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  trainingNotes: { type: String, default: "" }, 


  // 🎯 ADD TRAINING MANAGEMENT FIELDS (Step 2)
  trainingType: {
    type: String,
    enum: ['none', 'shelter_training', 'personal_training'],
    default: 'none'
  },
  
  trainingStartDate: Date,
  trainingDuration: String, // "4 weeks", "8 weeks"
  trainingGoals: [String],

  // Personal training sessions (for adopters)
  personalTrainingSessions: [{
    trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sessionDate: Date,
    duration: Number, // in minutes (60 = 1 hour)
    sessionType: {
      type: String,
      enum: [
        'basic_obedience', 'leash_training', 'behavior_consultation',
        'socialization', 'advanced_commands', 'therapy_prep'
      ]
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    notes: String,
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Adopter
    bookedAt: { type: Date, default: Date.now },
    price: { type: Number, default: 50 } // Session price in dollars
  }],

  
  // References
  // owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Optional - existing pets stay null
  },


  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  vet: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },


   // Images array with metadata
   images: [{
    url: String,
    public_id: String,
    caption: String,
    isPrimary: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],

// Documents array with categorization
documents: [{
  name: String,
  url: String,
  public_id: String,
  type: { 
    type: String, 
    enum: ['medical', 'vaccination', 'training', 'general'],
    default: 'general'
  },
  description: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
}],


  // Blockchain
  blockchainId: { type: String, unique: true, sparse: true },// optional, unique if exists

//soft delete 
isDeleted: { type: Boolean, default: false },
deletedAt: { type: Date },
deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Hide deleted pets by default in all find queries
PetSchema.pre(/^find/, function (next) {
  if (!this.getQuery().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.models.Pet || mongoose.model('Pet', PetSchema);
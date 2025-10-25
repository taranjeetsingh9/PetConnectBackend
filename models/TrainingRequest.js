// models/TrainingRequest.js
const mongoose = require('mongoose');

const TrainingRequestSchema = new mongoose.Schema({
    pet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: true
    },
    adopter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    trainer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionType: {
        type: String,
        required: true,
        enum: [
            'basic_obedience', 'advanced_obedience', 'behavior_modification',
            'socialization', 'leash_training', 'therapy_prep'
        ]
    },
    preferredDates: [{
        date: Date,
        timeSlot: String // "morning", "afternoon", "evening"
    }],
    notes: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    price: {
        type: Number,
        default: 50
    },
    duration: {
        type: Number, // in minutes
        default: 60
    },
    location: String,
    specialInstructions: String,
    
    // Response fields
    trainerResponse: {
        responseDate: Date,
        message: String,
        proposedDate: Date,
        proposedTime: String
    },
    
    // Session tracking
    scheduledSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrainingSession'
    }

}, {
    timestamps: true
});

// Indexes for performance
TrainingRequestSchema.index({ adopter: 1, createdAt: -1 });
TrainingRequestSchema.index({ trainer: 1, status: 1 });
TrainingRequestSchema.index({ pet: 1, status: 1 });

module.exports = mongoose.model('TrainingRequest', TrainingRequestSchema);
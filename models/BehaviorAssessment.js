const mongoose = require('mongoose');

const BehaviorAssessmentSchema = new mongoose.Schema({
    pet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pet',
        required: true
    },
    trainer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assessmentDate: {
        type: Date,
        default: Date.now
    },
    
    // AI TRAINING FIELDS - Structured for machine learning
    behaviorProfile: {
        // Energy & Activity Level (for matching with adopter lifestyle)
        energyLevel: {
            type: String,
            enum: ['very_low', 'low', 'moderate', 'high', 'very_high'],
            required: true
        },
        
        // Social Behavior (for family compatibility)
        socialBehavior: {
            withAdults: {
                type: String,
                enum: ['shy', 'cautious', 'friendly', 'very_friendly', 'overly_excited'],
                required: true
            },
            withChildren: {
                type: String, 
                enum: ['not_recommended', 'supervised_only', 'good', 'excellent'],
                required: true
            },
            withOtherPets: {
                type: String,
                enum: ['not_recommended', 'selective', 'good', 'excellent'],
                required: true
            },
            withStrangers: {
                type: String,
                enum: ['fearful', 'cautious', 'neutral', 'friendly'],
                required: true
            }
        },
        
        // Training & Intelligence (for adopter experience level)
        trainability: {
            intelligence: {
                type: String,
                enum: ['low', 'average', 'high', 'very_high'],
                required: true
            },
            obedience: {
                type: String,
                enum: ['stubborn', 'selective', 'obedient', 'eager_to_please'],
                required: true
            },
            trainingProgress: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced', 'expert'],
                required: true
            }
        },
        
        // Behavioral Challenges (for matching with capable adopters)
        challenges: {
            separationAnxiety: {
                level: {
                    type: String,
                    enum: ['none', 'mild', 'moderate', 'severe'],
                    default: 'none'
                },
                description: String
            },
            aggression: {
                level: {
                    type: String,
                    enum: ['none', 'mild', 'moderate', 'severe'],
                    default: 'none'
                },
                triggers: [String], // ['food', 'toys', 'territory']
                description: String
            },
            fearfulness: {
                level: {
                    type: String,
                    enum: ['none', 'mild', 'moderate', 'severe'],
                    default: 'none'
                },
                triggers: [String], // ['loud_noises', 'men', 'children']
                description: String
            },
            destructiveBehavior: {
                level: {
                    type: String,
                    enum: ['none', 'mild', 'moderate', 'severe'],
                    default: 'none'
                },
                description: String
            }
        },
        
        // Environment Needs (for home compatibility)
        environmentNeeds: {
            spaceRequired: {
                type: String,
                enum: ['apartment_ok', 'small_yard', 'large_yard', 'rural'],
                required: true
            },
            exerciseNeeds: {
                type: String,
                enum: ['low', 'moderate', 'high', 'very_high'],
                required: true
            },
            climateTolerance: {
                type: String,
                enum: ['any', 'warm', 'cool', 'indoor_only'],
                default: 'any'
            }
        },
        
        // Special Skills & Traits (for feature matching)
        specialSkills: [{
            type: String,
            enum: [
                'house_trained', 'leash_trained', 'crate_trained', 'basic_commands',
                'advanced_commands', 'therapy_potential', 'service_potential',
                'good_swimmer', 'good_with_cats', 'good_with_dogs', 'good_with_livestock'
            ]
        }]
    },
    
    //  QUANTITATIVE SCORING FOR AI
    compatibilityScores: {
        withFamilies: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        withSingles: {
            type: Number, 
            min: 1,
            max: 10,
            default: 5
        },
        withSeniors: {
            type: Number,
            min: 1,
            max: 10, 
            default: 5
        },
        withExperiencedOwners: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        withFirstTimeOwners: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        }
    },
    
    //  AI MATCHING METADATA
    aiMetadata: {
        matchingVector: [Number], // For vector similarity search
        lastTrained: Date,
        confidenceScore: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.8
        }
    },

    //  TRAINER NOTES
    trainerNotes: String,
    recommendations: [String],
    followUpRequired: {
        type: Boolean,
        default: false
    },
    nextAssessmentDate: Date
    
}, {
    timestamps: true
});

// Index for AI queries
BehaviorAssessmentSchema.index({ 'aiMetadata.lastTrained': 1 });
BehaviorAssessmentSchema.index({ 'behaviorProfile.energyLevel': 1, 'behaviorProfile.socialBehavior.withChildren': 1 });
BehaviorAssessmentSchema.index({ 'compatibilityScores.withFamilies': 1 });

module.exports = mongoose.model('BehaviorAssessment', BehaviorAssessmentSchema);
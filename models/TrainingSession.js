const mongoose = require('mongoose');

const TrainingSessionSchema = new mongoose.Schema({
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
    behaviorAssessment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BehaviorAssessment',
        required: false
    },
    
    // 🎯 SESSION DETAILS - Structured for AI pattern recognition
    sessionDetails: {
        sessionDate: {
            type: Date,
            required: true
        },
        duration: {
            type: Number, // in minutes
            required: true
        },
        sessionType: {
            type: String,
            enum: [
                'obedience_basic', 'obedience_advanced', 'behavior_modification',
                'socialization', 'aggression_management', 'anxiety_reduction',
                'special_skills', 'therapy_prep', 'service_training'
            ],
            required: true
        },
        focusAreas: [{
            type: String,
            enum: [
                'sit', 'stay', 'come', 'heel', 'down', 'leave_it',
                'drop_it', 'quiet', 'crate_training', 'leash_walking',
                'social_skills', 'impulse_control', 'fear_desensitization'
            ]
        }]
    },
    
    // 📊 QUANTITATIVE PROGRESS METRICS - For AI analysis
    progressMetrics: {
        // Command Success Rates (1-10 scale)
        commandPerformance: {
            sit: { type: Number, min: 0, max: 10, default: 0 },
            stay: { type: Number, min: 0, max: 10, default: 0 },
            come: { type: Number, min: 0, max: 10, default: 0 },
            heel: { type: Number, min: 0, max: 10, default: 0 },
            down: { type: Number, min: 0, max: 10, default: 0 }
        },
        
        // Behavior Improvement Scores (1-10 scale)
        behaviorScores: {
            attentionSpan: { type: Number, min: 1, max: 10, default: 5 },
            impulseControl: { type: Number, min: 1, max: 10, default: 5 },
            socialConfidence: { type: Number, min: 1, max: 10, default: 5 },
            stressTolerance: { type: Number, min: 1, max: 10, default: 5 },
            overallProgress: { type: Number, min: 1, max: 10, default: 5 }
        },
        
        // Challenge Areas (for AI to identify patterns)
        challengesEncountered: [{
            type: String,
            enum: [
                'distraction', 'anxiety', 'fear', 'aggression',
                'stubbornness', 'over_excitement', 'fatigue', 'confusion'
            ]
        }],
        
        // Success Indicators
        breakthroughs: [String], // Specific achievements
        milestones: [{
            type: String,
            enum: [
                'first_command', 'consistent_response', 'new_environment_success',
                'social_interaction_success', 'fear_overcome', 'duration_achieved'
            ]
        }]
    },
    
    // 🧠 AI TRAINING DATA - For predictive modeling
    aiTrainingData: {
        // Session difficulty and outcomes
        sessionIntensity: {
            type: String,
            enum: ['light', 'moderate', 'intense', 'breakthrough'],
            default: 'moderate'
        },
        
        // Learning patterns
        learningPattern: {
            type: String,
            enum: ['quick_learner', 'steady_progress', 'needs_repetition', 'inconsistent'],
            default: 'steady_progress'
        },
        
        // Motivation factors
        motivationFactors: [{
            type: String,
            enum: ['food', 'praise', 'toys', 'play', 'affection', 'environment']
        }],
        
        // Response to training methods
        effectiveMethods: [{
            type: String,
            enum: [
                'positive_reinforcement', 'clicker_training', 'lure_reward',
                'capturing', 'shaping', 'model_rival', 'relationship_based'
            ]
        }],
        
        // Vector for similarity matching with other pets
        trainingVector: [Number]
    },
    
    // 📝 TRAINER OBSERVATIONS & RECOMMENDATIONS
    trainerObservations: {
        strengthsNoted: [String],
        areasForImprovement: [String],
        sessionSummary: String,
        homework: [String], // Exercises for pet parents
        nextSessionFocus: [String]
    },
    
    // 🔄 PROGRESS TRACKING
    progressFromPrevious: {
        type: String,
        enum: ['significant_regression', 'slight_regression', 'no_change', 'slight_improvement', 'significant_improvement'],
        default: 'slight_improvement'
    },
    
    // 🎯 NEXT STEPS
    recommendations: {
        nextSessionDate: Date,
        suggestedSessionType: String,
        priorityLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        }
    }

}, {
    timestamps: true
});

// Indexes for AI queries and performance
TrainingSessionSchema.index({ 'sessionDetails.sessionDate': -1 });
TrainingSessionSchema.index({ 'progressMetrics.overallProgress': -1 });
TrainingSessionSchema.index({ 'aiTrainingData.learningPattern': 1 });
TrainingSessionSchema.index({ pet: 1, 'sessionDetails.sessionDate': -1 });

// Virtual for session success score (calculated field)
TrainingSessionSchema.virtual('successScore').get(function() {
    const metrics = this.progressMetrics;
    const commandAvg = Object.values(metrics.commandPerformance).reduce((a, b) => a + b, 0) / 5;
    const behaviorAvg = Object.values(metrics.behaviorScores).reduce((a, b) => a + b, 0) / 5;
    return ((commandAvg + behaviorAvg) / 2).toFixed(1);
});

module.exports = mongoose.model('TrainingSession', TrainingSessionSchema);
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isTrainer = require('../middleware/isTrainer');
const Pet = require('../models/Pet');
const BehaviorAssessment = require('../models/BehaviorAssessment');
const TrainingSession = require('../models/TrainingSession');
const logActivity = require('../utils/logActivity');

// ✅ GET all pets assigned to current trainer
router.get('/my-trainees', auth, isTrainer, async (req, res) => {
    try {
        const pets = await Pet.find({ trainer: req.user.id })
            .populate('organization', 'name')
            .select('name breed age gender status trainingNotes images');
        
        console.log(`📋 Trainer ${req.user.id} fetching their trainees`);
        
        res.json({
            success: true,
            count: pets.length,
            pets
        });
    } catch (error) {
        console.error('Get my trainees error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching trainees' 
        });
    }
});

// ✅ GET behavior assessments for a pet
router.get('/pets/:petId/behavior-assessments', auth, isTrainer, async (req, res) => {
    try {
        const petId = req.params.petId;
        console.log(`🔍 Trainer ${req.user.id} fetching behavior assessments for pet ${petId}`);

        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify trainer has access
        if (pet.trainer && pet.trainer.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        const assessments = await BehaviorAssessment.find({ pet: petId })
            .populate('trainer', 'name email')
            .sort({ assessmentDate: -1 });

        res.json({
            success: true,
            pet: {
                _id: pet._id,
                name: pet.name,
                breed: pet.breed,
                age: pet.age
            },
            assessments
        });

    } catch (error) {
        console.error('Get behavior assessments error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching behavior assessments' 
        });
    }
});

// ✅ POST new behavior assessment
router.post('/pets/:petId/behavior-assessments', auth, isTrainer, async (req, res) => {
    try {
        const {
            behaviorProfile,
            compatibilityScores,
            trainerNotes,
            recommendations,
            followUpRequired,
            nextAssessmentDate
        } = req.body;

        const petId = req.params.petId;
        console.log(`🧠 Trainer ${req.user.id} creating behavior assessment for pet ${petId}`);

        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify trainer has access
        if (pet.trainer && pet.trainer.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        const assessment = new BehaviorAssessment({
            pet: petId,
            trainer: req.user.id,
            behaviorProfile,
            compatibilityScores: compatibilityScores || {
                withFamilies: 5,
                withSingles: 5,
                withSeniors: 5,
                withExperiencedOwners: 5,
                withFirstTimeOwners: 5
            },
            trainerNotes,
            recommendations: recommendations || [],
            followUpRequired: followUpRequired || false,
            nextAssessmentDate: nextAssessmentDate ? new Date(nextAssessmentDate) : undefined,
            aiMetadata: {
                lastTrained: new Date(),
                confidenceScore: 0.8
            }
        });

        await assessment.save();

        // Update pet's training notes
        if (trainerNotes) {
            pet.trainingNotes = trainerNotes;
            await pet.save();
        }

        // Log activity
        await logActivity({
            userId: req.user.id,
            role: 'trainer',
            action: 'Added Behavior Assessment',
            target: petId,
            targetModel: 'Pet',
            details: `Added behavior assessment for ${pet.name}`
        });

        console.log(`✅ Behavior assessment created for ${pet.name}`);

        res.status(201).json({
            success: true,
            message: 'Behavior assessment created successfully',
            assessment
        });

    } catch (error) {
        console.error('Create behavior assessment error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while creating behavior assessment' 
        });
    }
});

// ✅ GET training sessions for a pet
router.get('/pets/:petId/training-sessions', auth, isTrainer, async (req, res) => {
    try {
        const petId = req.params.petId;
        console.log(`🎯 Trainer ${req.user.id} fetching training sessions for pet ${petId}`);

        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify trainer has access
        if (pet.trainer && pet.trainer.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        const sessions = await TrainingSession.find({ pet: petId })
            .populate('trainer', 'name email')
            .populate('behaviorAssessment')
            .sort({ 'sessionDetails.sessionDate': -1 });

        res.json({
            success: true,
            pet: {
                _id: pet._id,
                name: pet.name,
                breed: pet.breed
            },
            sessions
        });

    } catch (error) {
        console.error('Get training sessions error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching training sessions' 
        });
    }
});

// ✅ POST new training session
router.post('/pets/:petId/training-sessions', auth, isTrainer, async (req, res) => {
    try {
        const {
            behaviorAssessmentId,
            sessionDetails,
            progressMetrics,
            aiTrainingData,
            trainerObservations,
            progressFromPrevious,
            recommendations
        } = req.body;

        const petId = req.params.petId;
        console.log(`🎯 Trainer ${req.user.id} creating training session for pet ${petId}`);

        if (!sessionDetails || !sessionDetails.sessionDate || !sessionDetails.duration) {
            return res.status(400).json({
                success: false,
                msg: 'Session date and duration are required'
            });
        }

        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ 
                success: false,
                msg: 'Pet not found' 
            });
        }

        // Verify trainer has access
        if (pet.trainer && pet.trainer.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                msg: 'Not assigned to this pet' 
            });
        }

        const session = new TrainingSession({
            pet: petId,
            trainer: req.user.id,
            behaviorAssessment: behaviorAssessmentId,
            sessionDetails: {
                sessionDate: new Date(sessionDetails.sessionDate),
                duration: sessionDetails.duration,
                sessionType: sessionDetails.sessionType,
                focusAreas: sessionDetails.focusAreas || []
            },
            progressMetrics: progressMetrics || {
                commandPerformance: {
                    sit: 0, stay: 0, come: 0, heel: 0, down: 0
                },
                behaviorScores: {
                    attentionSpan: 5,
                    impulseControl: 5,
                    socialConfidence: 5,
                    stressTolerance: 5,
                    overallProgress: 5
                },
                challengesEncountered: [],
                breakthroughs: [],
                milestones: []
            },
            aiTrainingData: aiTrainingData || {
                sessionIntensity: 'moderate',
                learningPattern: 'steady_progress',
                motivationFactors: [],
                effectiveMethods: []
            },
            trainerObservations: trainerObservations || {
                strengthsNoted: [],
                areasForImprovement: [],
                sessionSummary: '',
                homework: [],
                nextSessionFocus: []
            },
            progressFromPrevious: progressFromPrevious || 'slight_improvement',
            recommendations: recommendations || {
                nextSessionDate: undefined,
                suggestedSessionType: '',
                priorityLevel: 'medium'
            }
        });

        await session.save();

        // Log activity
        await logActivity({
            userId: req.user.id,
            role: 'trainer',
            action: 'Added Training Session',
            target: petId,
            targetModel: 'Pet',
            details: `Added training session for ${pet.name}: ${sessionDetails.sessionType}`
        });

        console.log(`✅ Training session created for ${pet.name}`);

        res.status(201).json({
            success: true,
            message: 'Training session recorded successfully',
            session
        });

    } catch (error) {
        console.error('Create training session error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while recording training session' 
        });
    }
});

// ✅ GET trainer's upcoming sessions
router.get('/upcoming-sessions', auth, isTrainer, async (req, res) => {
    try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        console.log(`📅 Trainer ${req.user.id} checking upcoming sessions`);

        const upcomingSessions = await TrainingSession.find({
            trainer: req.user.id,
            'sessionDetails.sessionDate': { 
                $gte: today,
                $lte: nextWeek
            }
        })
        .populate('pet', 'name breed images')
        .sort({ 'sessionDetails.sessionDate': 1 });

        res.json({
            success: true,
            count: upcomingSessions.length,
            upcomingSessions
        });
    } catch (error) {
        console.error('Get upcoming sessions error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching upcoming sessions' 
        });
    }
});

// ✅ GET pets needing follow-up assessments
router.get('/needs-followup', auth, isTrainer, async (req, res) => {
    try {
        const today = new Date();

        console.log(`🔔 Trainer ${req.user.id} checking pets needing follow-up`);

        const needsFollowup = await BehaviorAssessment.find({
            trainer: req.user.id,
            followUpRequired: true,
            $or: [
                { nextAssessmentDate: { $lte: today } },
                { nextAssessmentDate: { $exists: false } }
            ]
        })
        .populate('pet', 'name breed age status images')
        .sort({ assessmentDate: -1 });

        res.json({
            success: true,
            count: needsFollowup.length,
            needsFollowup
        });
    } catch (error) {
        console.error('Get needs followup error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Server error while fetching pets needing follow-up' 
        });
    }
});

module.exports = router;
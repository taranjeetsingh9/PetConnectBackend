// services/trainingService.js
const Pet = require('../models/Pet');
const User = require('../models/User');
const BehaviorAssessment = require('../models/BehaviorAssessment');
const TrainingSession = require('../models/TrainingSession');
const logActivity = require('../utils/logActivity');

class TrainingService {
  
  // ========================
  // 🏢 STAFF-ASSIGNED TRAINING
  // ========================

  // Assign professional training program (Staff only)
  async assignShelterTraining(petId, trainerId, trainingData, staffUser) {
    const { trainingDuration, trainingGoals, trainingNotes } = trainingData;

    // Verify pet exists
    const pet = await Pet.findById(petId);
    if (!pet) {
      throw new Error('Pet not found');
    }

    // Verify trainer exists and is a trainer
    const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // Professional validation
    if (pet.status === 'In Training') {
      throw new Error('Pet is already in a training program');
    }

    if (!['Available', 'Ready for Adoption', 'Unavailable'].includes(pet.status)) {
      throw new Error(`Pet cannot start training while status is: ${pet.status}`);
    }

    // 🎯 START PROFESSIONAL TRAINING PROGRAM
    pet.trainer = trainerId;
    pet.status = 'In Training';
    pet.trainingType = 'shelter_training';
    pet.trainingStartDate = new Date();
    pet.trainingDuration = trainingDuration || '4 weeks';
    pet.trainingGoals = trainingGoals || ['basic_obedience', 'socialization'];
    pet.trainingNotes = trainingNotes || 'Professional training program started';

    await pet.save();

    // 🧠 CREATE INITIAL BEHAVIOR ASSESSMENT
    const assessment = new BehaviorAssessment({
      pet: petId,
      trainer: trainerId,
      behaviorProfile: {
        energyLevel: 'moderate',
        socialBehavior: {
          withAdults: 'friendly',
          withChildren: 'good',
          withOtherPets: 'selective',
          withStrangers: 'cautious'
        },
        trainability: {
          intelligence: 'average',
          obedience: 'selective',
          trainingProgress: 'beginner'
        },
        environmentNeeds: {
          spaceRequired: 'small_yard',
          exerciseNeeds: 'moderate',
          climateTolerance: 'any'
        }
      },
      trainerNotes: `Professional training program started. ${trainingNotes || 'Standard 4-week program.'}`,
      followUpRequired: true,
      nextAssessmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
    });

    await assessment.save();

    // 📝 LOG PROFESSIONAL ACTIVITY
    await logActivity({
      userId: staffUser.id,
      role: staffUser.role,
      action: 'Started Professional Training',
      target: petId,
      targetModel: 'Pet',
      details: `Started ${trainingDuration || '4-week'} training program for ${pet.name} with trainer ${trainer.name}`
    });

    return {
      pet,
      trainer,
      assessment,
      message: `Professional training program started for ${pet.name}`
    };
  }

  // Complete training program
  async completeTrainingProgram(petId, trainerId, completionData) {
    const { finalNotes, achievements, recommendations } = completionData;

    const pet = await Pet.findById(petId);
    if (!pet) throw new Error('Pet not found');
    if (pet.trainer?.toString() !== trainerId) throw new Error('Not assigned to this pet');

    // 🎓 COMPLETE TRAINING
    pet.status = 'Training Complete';
    pet.trainingNotes = finalNotes || 'Training program completed successfully';
    
    if (achievements) pet.trainingGoals = achievements;

    await pet.save();

    // 📝 LOG COMPLETION
    await logActivity({
      userId: trainerId,
      role: 'trainer',
      action: 'Completed Training Program',
      target: petId,
      targetModel: 'Pet',
      details: `Completed training for ${pet.name}. Achievements: ${achievements?.join(', ') || 'Basic obedience'}`
    });

    return pet;
  }

  // ========================
  // 👨‍💼 ADOPTER PERSONAL TRAINING
  // ========================

  // Book personal training session (Adopter only)
  async bookPersonalTraining(petId, trainerId, sessionData, adopterUser) {
    const { sessionDate, duration, sessionType, notes } = sessionData;

    // Verify pet exists and belongs to adopter
    const pet = await Pet.findById(petId);
    if (!pet) throw new Error('Pet not found');
    
    if (pet.owner?.toString() !== adopterUser.id) {
      throw new Error('You can only book training for your own pets');
    }

    // Verify trainer exists
    const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
    if (!trainer) throw new Error('Trainer not found');

    // Check if trainer is available at requested time
    const conflictingSession = await TrainingSession.findOne({
      trainer: trainerId,
      'sessionDetails.sessionDate': new Date(sessionDate)
    });

    if (conflictingSession) {
      throw new Error('Trainer is not available at the requested time');
    }

    // 🗓️ BOOK PERSONAL SESSION
    const personalSession = {
      trainer: trainerId,
      sessionDate: new Date(sessionDate),
      duration: duration || 60, // 1 hour default
      sessionType: sessionType || 'basic_obedience',
      notes: notes || '',
      bookedBy: adopterUser.id,
      price: this.getSessionPrice(sessionType)
    };

    // Add to pet's personal training sessions
    if (!pet.personalTrainingSessions) {
      pet.personalTrainingSessions = [];
    }
    
    pet.personalTrainingSessions.push(personalSession);
    await pet.save();

    // 📝 LOG BOOKING
    await logActivity({
      userId: adopterUser.id,
      role: adopterUser.role,
      action: 'Booked Training Session',
      target: petId,
      targetModel: 'Pet',
      details: `Booked ${sessionType} session for ${pet.name} with trainer ${trainer.name}`
    });

    return {
      pet,
      session: personalSession,
      message: `Training session booked successfully for $${personalSession.price}`
    };
  }

  // Get available trainers with their specialties and rates
  async getAvailableTrainers(filters = {}) {
    const { specialization, maxRate } = filters;
    
    let query = { role: 'trainer' };
    
    if (specialization) {
      query.specialization = specialization;
    }

    const trainers = await User.find(query)
      .select('name email specialization experience yearsExperience hourlyRate')
      .sort({ experience: -1 });

    // Filter by rate if specified
    let availableTrainers = trainers;
    if (maxRate) {
      availableTrainers = trainers.filter(trainer => 
        (trainer.hourlyRate || 50) <= maxRate
      );
    }

    return availableTrainers;
  }

  // Get trainer's upcoming sessions
  async getTrainerSchedule(trainerId, startDate, endDate) {
    const sessions = await TrainingSession.find({
      trainer: trainerId,
      'sessionDetails.sessionDate': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .populate('pet', 'name breed')
    .sort({ 'sessionDetails.sessionDate': 1 });

    return sessions;
  }

  // ========================
  // 🎯 UTILITY METHODS
  // ========================

  // Get session price based on type
  getSessionPrice(sessionType) {
    const pricing = {
      'basic_obedience': 50,
      'leash_training': 60,
      'behavior_consultation': 75,
      'socialization': 55,
      'advanced_commands': 65,
      'therapy_prep': 80
    };
    
    return pricing[sessionType] || 50;
  }

  // Get training progress for a pet
  async getTrainingProgress(petId) {
    const pet = await Pet.findById(petId)
      .populate('trainer', 'name email')
      .populate('personalTrainingSessions.trainer', 'name email');

    const trainingSessions = await TrainingSession.find({ pet: petId })
      .sort({ 'sessionDetails.sessionDate': -1 });

    const completedSessions = trainingSessions.filter(session => 
      session.sessionDetails.sessionDate < new Date()
    );

    const progress = {
      pet: {
        name: pet.name,
        status: pet.status,
        trainingType: pet.trainingType,
        trainingStartDate: pet.trainingStartDate,
        trainingDuration: pet.trainingDuration,
        trainingGoals: pet.trainingGoals
      },
      trainer: pet.trainer,
      personalSessions: pet.personalTrainingSessions || [],
      professionalSessions: trainingSessions,
      stats: {
        totalSessions: trainingSessions.length,
        completedSessions: completedSessions.length,
        upcomingSessions: trainingSessions.length - completedSessions.length,
        successRate: trainingSessions.length > 0 ? 
          (completedSessions.length / trainingSessions.length) * 100 : 0
      }
    };

    return progress;
  }
}

module.exports = TrainingService;
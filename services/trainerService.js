// services/TrainerService.js
const Pet = require('../models/Pet');
const BehaviorAssessment = require('../models/BehaviorAssessment');
const TrainingSession = require('../models/TrainingSession');

class TrainerService {
  async getTrainerPets(trainerId) {
    return await Pet.find({ trainer: trainerId })
      .populate('organization', 'name')
      .select('name breed age gender status trainingNotes images');
  }

  async verifyPetAccess(petId, trainerId) {
    const pet = await Pet.findById(petId);
    if (!pet) {
      throw new Error('Pet not found');
    }

    if (pet.trainer && pet.trainer.toString() !== trainerId) {
      throw new Error('Not assigned to this pet');
    }

    return pet;
  }

  async getBehaviorAssessments(petId) {
    return await BehaviorAssessment.find({ pet: petId })
      .populate('trainer', 'name email')
      .sort({ assessmentDate: -1 });
  }

  async createBehaviorAssessment(petId, trainerId, assessmentData) {
    const {
      behaviorProfile,
      compatibilityScores,
      trainerNotes,
      recommendations,
      followUpRequired,
      nextAssessmentDate
    } = assessmentData;

    const assessment = new BehaviorAssessment({
      pet: petId,
      trainer: trainerId,
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

    // Update pet's training notes if provided
    if (trainerNotes) {
      await Pet.findByIdAndUpdate(petId, { trainingNotes: trainerNotes });
    }

    return assessment;
  }


  async getTrainingSessions(petId) {
    return await TrainingSession.find({ pet: petId })
      .populate('trainer', 'name email')
      .populate('behaviorAssessment')
      .sort({ 'sessionDetails.sessionDate': -1 });
  }

  async createTrainingSession(petId, trainerId, sessionData) {
    const {
      behaviorAssessmentId,
      sessionDetails,
      progressMetrics,
      aiTrainingData,
      trainerObservations,
      progressFromPrevious,
      recommendations
    } = sessionData;

    if (!sessionDetails || !sessionDetails.sessionDate || !sessionDetails.duration) {
      throw new Error('Session date and duration are required');
    }

    const session = new TrainingSession({
      pet: petId,
      trainer: trainerId,
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
    return session;
  }


  async getUpcomingSessions(trainerId) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return await TrainingSession.find({
      trainer: trainerId,
      'sessionDetails.sessionDate': { 
        $gte: today,
        $lte: nextWeek
      }
    })
    .populate('pet', 'name breed images')
    .sort({ 'sessionDetails.sessionDate': 1 });
  }

  async getPetsNeedingFollowup(trainerId) {
    const today = new Date();

    return await BehaviorAssessment.find({
      trainer: trainerId,
      followUpRequired: true,
      $or: [
        { nextAssessmentDate: { $lte: today } },
        { nextAssessmentDate: { $exists: false } }
      ]
    })
    .populate('pet', 'name breed age status images')
    .sort({ assessmentDate: -1 });
  }
}

module.exports = TrainerService;
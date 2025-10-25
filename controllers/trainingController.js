// controllers/trainingController.js
const TrainingService = require('../services/trainingService');
const trainingService = new TrainingService();

// 🏢 STAFF-ASSIGNED TRAINING CONTROLLERS

// Assign professional training program (Staff only)
exports.assignShelterTraining = async (req, res) => {
  try {
    const { petId } = req.params;
    const { trainerId, trainingDuration, trainingGoals, trainingNotes } = req.body;

    const result = await trainingService.assignShelterTraining(
      petId, 
      trainerId, 
      { trainingDuration, trainingGoals, trainingNotes },
      req.user
    );

    res.json({
      success: true,
      message: result.message,
      pet: result.pet,
      trainer: result.trainer,
      assessment: result.assessment
    });

  } catch (error) {
    console.error('Assign shelter training error:', error);
    res.status(400).json({
      success: false,
      msg: error.message
    });
  }
};

// Complete training program (Trainer only)
exports.completeTrainingProgram = async (req, res) => {
  try {
    const { petId } = req.params;
    const { finalNotes, achievements, recommendations } = req.body;

    const pet = await trainingService.completeTrainingProgram(
      petId,
      req.user.id,
      { finalNotes, achievements, recommendations }
    );

    res.json({
      success: true,
      message: 'Training program completed successfully',
      pet
    });

  } catch (error) {
    console.error('Complete training error:', error);
    res.status(400).json({
      success: false,
      msg: error.message
    });
  }
};

// 👨‍💼 ADOPTER PERSONAL TRAINING CONTROLLERS

// Book personal training session (Adopter only)
exports.bookPersonalTraining = async (req, res) => {
  try {
    const { petId } = req.params;
    const { trainerId, sessionDate, duration, sessionType, notes } = req.body;

    const result = await trainingService.bookPersonalTraining(
      petId,
      trainerId,
      { sessionDate, duration, sessionType, notes },
      req.user
    );

    res.json({
      success: true,
      message: result.message,
      pet: result.pet,
      session: result.session
    });

  } catch (error) {
    console.error('Book training session error:', error);
    res.status(400).json({
      success: false,
      msg: error.message
    });
  }
};

// Get available trainers for booking
exports.getAvailableTrainers = async (req, res) => {
  try {
    const { specialization, maxRate } = req.query;

    const trainers = await trainingService.getAvailableTrainers({
      specialization,
      maxRate: maxRate ? parseInt(maxRate) : undefined
    });

    res.json({
      success: true,
      trainers
    });

  } catch (error) {
    console.error('Get available trainers error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching trainers'
    });
  }
};

// Get trainer's schedule
exports.getTrainerSchedule = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { startDate, endDate } = req.query;

    const sessions = await trainingService.getTrainerSchedule(
      trainerId,
      startDate || new Date(),
      endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    );

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('Get trainer schedule error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching schedule'
    });
  }
};

// Get training progress for a pet
exports.getTrainingProgress = async (req, res) => {
  try {
    const { petId } = req.params;

    const progress = await trainingService.getTrainingProgress(petId);

    res.json({
      success: true,
      progress
    });

  } catch (error) {
    console.error('Get training progress error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching training progress'
    });
  }
};

// Cancel personal training session
exports.cancelTrainingSession = async (req, res) => {
  try {
    const { petId, sessionId } = req.params;

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        msg: 'Pet not found'
      });
    }

    // Find the session
    const session = pet.personalTrainingSessions.id(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        msg: 'Training session not found'
      });
    }

    // Check permissions
    const isAdopter = session.bookedBy.toString() === req.user.id;
    const isStaff = ['staff', 'admin'].includes(req.user.role);
    const isTrainer = session.trainer.toString() === req.user.id;

    if (!isAdopter && !isStaff && !isTrainer) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to cancel this session'
      });
    }

    // Cancel the session
    session.status = 'cancelled';
    await pet.save();

    res.json({
      success: true,
      message: 'Training session cancelled successfully',
      session
    });

  } catch (error) {
    console.error('Cancel training session error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while cancelling session'
    });
  }
};
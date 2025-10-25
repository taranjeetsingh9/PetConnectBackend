// controllers/TrainerController.js
const TrainerService = require('../services/trainerService');
const logActivity = require('../utils/logActivity');

class TrainerController {
  constructor() {
    this.trainerService = new TrainerService();
  }

  // GET all pets assigned to current trainer
  async getMyTrainees(req, res) {
    try {
      const pets = await this.trainerService.getTrainerPets(req.user.id);
      
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
  }

  // GET behavior assessments for a pet
  async getBehaviorAssessments(req, res) {
    try {
      const petId = req.params.petId;
      console.log(`🔍 Trainer ${req.user.id} fetching behavior assessments for pet ${petId}`);

      const pet = await this.trainerService.verifyPetAccess(petId, req.user.id);
      const assessments = await this.trainerService.getBehaviorAssessments(petId);

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
      
      if (error.message === 'Pet not found') {
        return res.status(404).json({ 
          success: false,
          msg: error.message 
        });
      }
      
      if (error.message === 'Not assigned to this pet') {
        return res.status(403).json({ 
          success: false,
          msg: error.message 
        });
      }

      res.status(500).json({ 
        success: false,
        msg: 'Server error while fetching behavior assessments' 
      });
    }
  }

  // POST new behavior assessment
  async createBehaviorAssessment(req, res) {
    try {
      const petId = req.params.petId;
      console.log(`🧠 Trainer ${req.user.id} creating behavior assessment for pet ${petId}`);

      await this.trainerService.verifyPetAccess(petId, req.user.id);
      
      const assessment = await this.trainerService.createBehaviorAssessment(
        petId, 
        req.user.id, 
        req.body
      );

      const pet = await this.trainerService.verifyPetAccess(petId, req.user.id);

      // Log activity
      await logActivity({
        userId: req.user.id,
        role: 'trainer',
        action: 'Added Behavior Assessment',
        target: petId,
        targetModel: 'Pet',
        details: `Added behavior assessment for ${pet.name}`
      });

      console.log(` Behavior assessment created for ${pet.name}`);

      res.status(201).json({
        success: true,
        message: 'Behavior assessment created successfully',
        assessment
      });

    } catch (error) {
      console.error('Create behavior assessment error:', error);
      
      if (error.message === 'Pet not found') {
        return res.status(404).json({ 
          success: false,
          msg: error.message 
        });
      }
      
      if (error.message === 'Not assigned to this pet') {
        return res.status(403).json({ 
          success: false,
          msg: error.message 
        });
      }

      res.status(500).json({ 
        success: false,
        msg: 'Server error while creating behavior assessment' 
      });
    }
  }

  // GET training sessions for a pet
  async getTrainingSessions(req, res) {
    try {
      const petId = req.params.petId;
      console.log(`🎯 Trainer ${req.user.id} fetching training sessions for pet ${petId}`);

      const pet = await this.trainerService.verifyPetAccess(petId, req.user.id);
      const sessions = await this.trainerService.getTrainingSessions(petId);

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
      
      if (error.message === 'Pet not found') {
        return res.status(404).json({ 
          success: false,
          msg: error.message 
        });
      }
      
      if (error.message === 'Not assigned to this pet') {
        return res.status(403).json({ 
          success: false,
          msg: error.message 
        });
      }

      res.status(500).json({ 
        success: false,
        msg: 'Server error while fetching training sessions' 
      });
    }
  }

  // POST new training session
  async createTrainingSession(req, res) {
    try {
      const petId = req.params.petId;
      console.log(`🎯 Trainer ${req.user.id} creating training session for pet ${petId}`);

      await this.trainerService.verifyPetAccess(petId, req.user.id);
      
      const session = await this.trainerService.createTrainingSession(
        petId, 
        req.user.id, 
        req.body
      );

      const pet = await this.trainerService.verifyPetAccess(petId, req.user.id);

      // Log activity
      await logActivity({
        userId: req.user.id,
        role: 'trainer',
        action: 'Added Training Session',
        target: petId,
        targetModel: 'Pet',
        details: `Added training session for ${pet.name}: ${req.body.sessionDetails?.sessionType}`
      });

      console.log(` Training session created for ${pet.name}`);

      res.status(201).json({
        success: true,
        message: 'Training session recorded successfully',
        session
      });

    } catch (error) {
      console.error('Create training session error:', error);
      
      if (error.message === 'Session date and duration are required') {
        return res.status(400).json({
          success: false,
          msg: error.message
        });
      }
      
      if (error.message === 'Pet not found') {
        return res.status(404).json({ 
          success: false,
          msg: error.message 
        });
      }
      
      if (error.message === 'Not assigned to this pet') {
        return res.status(403).json({ 
          success: false,
          msg: error.message 
        });
      }

      res.status(500).json({ 
        success: false,
        msg: 'Server error while recording training session' 
      });
    }
  }

  // GET trainer's upcoming sessions
  async getUpcomingSessions(req, res) {
    try {
      console.log(`📅 Trainer ${req.user.id} checking upcoming sessions`);

      const upcomingSessions = await this.trainerService.getUpcomingSessions(req.user.id);

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
  }

  // GET pets needing follow-up assessments
  async getPetsNeedingFollowup(req, res) {
    try {
      console.log(`🔔 Trainer ${req.user.id} checking pets needing follow-up`);

      const needsFollowup = await this.trainerService.getPetsNeedingFollowup(req.user.id);

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
  }
}

module.exports = TrainerController;
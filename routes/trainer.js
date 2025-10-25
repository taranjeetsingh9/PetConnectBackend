// routes/trainer.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isTrainer = require('../middleware/isTrainer');
const TrainerController = require('../controllers/trainerController');

const trainerController = new TrainerController();

// GET all pets assigned to current trainer
router.get('/my-trainees', auth, isTrainer, (req, res) => 
  trainerController.getMyTrainees(req, res)
);

// GET behavior assessments for a pet
router.get('/pets/:petId/behavior-assessments', auth, isTrainer, (req, res) => 
  trainerController.getBehaviorAssessments(req, res)
);

// POST new behavior assessment
router.post('/pets/:petId/behavior-assessments', auth, isTrainer, (req, res) => 
  trainerController.createBehaviorAssessment(req, res)
);

// GET training sessions for a pet
router.get('/pets/:petId/training-sessions', auth, isTrainer, (req, res) => 
  trainerController.getTrainingSessions(req, res)
);

// POST new training session
router.post('/pets/:petId/training-sessions', auth, isTrainer, (req, res) => 
  trainerController.createTrainingSession(req, res)
);

// GET trainer's upcoming sessions
router.get('/upcoming-sessions', auth, isTrainer, (req, res) => 
  trainerController.getUpcomingSessions(req, res)
);

// GET pets needing follow-up assessments
router.get('/needs-followup', auth, isTrainer, (req, res) => 
  trainerController.getPetsNeedingFollowup(req, res)
);

module.exports = router;
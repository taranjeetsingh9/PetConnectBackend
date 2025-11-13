// routes/trainingRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const trainingController = require('../controllers/trainingController');

//  STAFF-ASSIGNED TRAINING ROUTES

// Assign professional training program (Staff/Admin only)
router.post('/shelter-training/:petId/assign', 
  auth, 
  roleAuth(['staff', 'admin']), 
  trainingController.assignShelterTraining
);

// Complete training program (Trainer only)
router.patch('/shelter-training/:petId/complete', 
  auth, 
  roleAuth(['trainer']), 
  trainingController.completeTrainingProgram
);

//  ADOPTER PERSONAL TRAINING ROUTES

// Book personal training session (Adopter only)
router.post('/personal-training/:petId/book', 
  auth, 
  roleAuth(['adopter']), 
  trainingController.bookPersonalTraining
);

// Get available trainers for booking (All authenticated users)
router.get('/trainers/available', 
  auth, 
  trainingController.getAvailableTrainers
);

// Get trainer's schedule (Trainer or Staff/Admin)
router.get('/trainers/:trainerId/schedule', 
  auth, 
  trainingController.getTrainerSchedule
);

// Get training progress for a pet (Owner, Trainer, or Staff)
router.get('/progress/:petId', 
  auth, 
  trainingController.getTrainingProgress
);

// Cancel personal training session (Adopter, Trainer, or Staff)
router.patch('/personal-training/:petId/sessions/:sessionId/cancel', 
  auth, 
  trainingController.cancelTrainingSession
);

module.exports = router;
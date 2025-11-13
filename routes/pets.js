const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const isVet = require('../middleware/isVet');
const { petImagesUpload } = require('../middleware/upload');
const petController = require('../controllers/petController');

// Basic CRUD
router.get('/', auth, petController.getPets);
router.get('/:id', auth, petController.getPetById);
router.get('/:id/trainer', auth, petController.getPetWithTrainer); 
router.post('/', auth, roleAuth(['staff', 'admin']), petImagesUpload.array('images', 5), petController.createPet);
router.patch('/:id', auth, roleAuth(['staff', 'admin']), petController.updatePet);
router.delete('/:id', auth, roleAuth(['staff', 'admin']), petController.deletePet);

// Status / Health / Training
router.patch('/:id/status', auth, petController.updatePetStatus);
router.patch('/:id/details', auth, roleAuth(['vet', 'trainer', 'admin']), petController.updatePetDetails);
router.patch('/:id/health', auth, isVet, petController.updatePetHealth);
router.patch('/:id/health-status', auth, isVet, petController.updatePetHealthStatus);
router.patch('/:id/training', auth, petController.updateTrainingNotes);
router.patch('/:id/assign-vet', auth, roleAuth(['staff', 'admin']), petController.assignVet);

// Adoption / Foster
router.post('/:id/adopt', auth, roleAuth(['adopter','staff', 'admin']), petController.requestAdoption);
router.post('/:id/foster', auth, roleAuth(['adopter', 'staff', 'admin']), petController.requestFoster);
router.get('/:id/foster-requests', auth, petController.getFosterRequests);
router.patch('/:id/foster-requests/:requestId', auth, petController.handleFosterRequest);

// Browse
router.get('/browse/all', auth, petController.browsePets);

// Current user info
router.get('/me', auth, petController.getCurrentUser);

// Trainer Management Routes (Staff/Admin only)
router.get('/management/available-for-training', auth, roleAuth(['staff', 'admin']), petController.getPetsAvailableForTraining);
router.get('/management/trainers', auth, roleAuth(['staff', 'admin']), petController.getAllTrainers);
router.get('/management/assigned-trainers', auth, roleAuth(['staff', 'admin']), petController.getPetsWithTrainers);
router.patch('/:id/assign-trainer', auth, roleAuth(['staff', 'admin']), petController.assignTrainerToPet);
router.patch('/:id/remove-trainer', auth, roleAuth(['staff', 'admin']), petController.removeTrainerFromPet);

module.exports = router;


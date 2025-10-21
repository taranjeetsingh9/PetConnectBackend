const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isVet = require('../middleware/isVet');
const VetPetController = require('../controllers/vetPetController');

router.get('/my-patients', auth, isVet, VetPetController.getMyPatients);
router.get('/pets/:petId/medical-history', auth, isVet, VetPetController.getPetMedicalHistory);
router.post('/pets/:petId/medical-records', auth, isVet, VetPetController.createMedicalRecord);
router.post('/pets/:petId/vaccinations', auth, isVet, VetPetController.createVaccination);
router.get('/overdue-vaccinations', auth, isVet, VetPetController.getOverdueVaccinations);
router.get('/upcoming-checkups', auth, isVet, VetPetController.getUpcomingCheckups);

module.exports = router;
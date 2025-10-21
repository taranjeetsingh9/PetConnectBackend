const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { petImagesUpload } = require('../middleware/upload');
const petFilesController = require('../controllers/petFilesController');

// Create a personal pet listing
router.post('/user-pet/upload', auth, petImagesUpload.array('images', 8), petFilesController.createPersonalPet);

// Add images to personal pet listing
router.post('/user-pet/:id/add-images', auth, petImagesUpload.array('images', 5), petFilesController.addPetImages);

// Get current user's personal listings
router.get('/my-listings', auth, petFilesController.getMyListings);

// Get all personal listings (with filters)
router.get('/listings', auth, petFilesController.getAllListings);

// Update personal pet listing
router.patch('/user-pet/:id', auth, petFilesController.updatePersonalListing);

// Delete personal pet listing
router.delete('/user-pet/:id', auth, petFilesController.deletePersonalListing);

// Get detailed listings with foster requests and analytics
router.get('/my-listings/detailed', auth, petFilesController.getDetailedListings);

// Start foster chat
router.post('/:id/foster-requests/:requestId/start-chat', auth, petFilesController.startFosterChat);

// Schedule meeting for foster request
router.patch('/:id/foster-requests/:requestId/schedule-meeting', auth, petFilesController.scheduleFosterMeeting);

// Get current user's foster requests
router.get('/my-foster-requests', auth, petFilesController.getMyFosterRequests);

module.exports = router;

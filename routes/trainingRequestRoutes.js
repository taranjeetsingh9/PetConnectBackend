// routes/trainingRequestRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const trainingRequestController = require('../controllers/trainingRequestController');

// 🎯 ADOPTER ROUTES
router.get('/trainers/available', 
    auth, 
    trainingRequestController.getAvailableTrainers
);

router.post('/pets/:petId/request', 
    auth, 
    roleAuth(['adopter']), 
    trainingRequestController.createTrainingRequest
);

router.get('/my-requests', 
    auth, 
    roleAuth(['adopter']), 
    trainingRequestController.getAdopterRequests
);

router.patch('/requests/:requestId/cancel', 
    auth, 
    roleAuth(['adopter']), 
    trainingRequestController.cancelTrainingRequest
);

// 🎯 TRAINER ROUTES
router.get('/trainer/requests', 
    auth, 
    roleAuth(['trainer']), 
    trainingRequestController.getTrainerRequests
);

router.patch('/requests/:requestId/approve', 
    auth, 
    roleAuth(['trainer']), 
    trainingRequestController.approveTrainingRequest
);

router.patch('/requests/:requestId/reject', 
    auth, 
    roleAuth(['trainer']), 
    trainingRequestController.rejectTrainingRequest
);

// 🔍 GENERAL ROUTES (Adopter, Trainer, Staff)
router.get('/requests/:requestId', 
    auth, 
    trainingRequestController.getTrainingRequestById
);

//  ADD THIS TEST ENDPOINT TO VERIFY ROUTES ARE WORKING
router.get('/test', 
    auth, 
    (req, res) => {
        res.json({ 
            success: true, 
            message: 'Training routes are working!',
            user: req.user 
        });
    }
);

module.exports = router;
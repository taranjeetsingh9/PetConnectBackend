// routes/adoptions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requestAdoption, getOrganizationRequests, updateRequestStatus, getMyRequests, confirmMeeting, sendMeetingReminder, getMyAdoptedPets, scheduleMeeting,  completeMeeting,
    submitMeetingFeedback } = require('../controllers/adoptionController');
const roleAuth = require('../middleware/roleAuth');

// 🐾 Adopter routes
router.post('/:petId/request', auth, roleAuth(['adopter']), requestAdoption);
router.get('/my-requests', auth, roleAuth(['adopter']), getMyRequests);
router.get('/my-adopted-pets', auth, roleAuth(['adopter']), getMyAdoptedPets);
router.post('/:requestId/schedule-meeting', auth, roleAuth(['adopter']), scheduleMeeting);
router.patch('/:id/confirm-meeting', auth, roleAuth(['adopter']), confirmMeeting);
router.post('/:id/feedback', auth, roleAuth(['adopter']), submitMeetingFeedback);

// 🧑‍💼 Staff/Admin routes
router.get('/requests', auth, roleAuth(['staff', 'admin']), getOrganizationRequests);
router.patch('/:id/status', auth, roleAuth(['staff', 'admin']), updateRequestStatus);
router.post('/:id/complete-meeting', auth, roleAuth(['staff', 'admin']), completeMeeting);
router.post('/:id/send-reminder', auth, roleAuth(['staff', 'admin']), sendMeetingReminder);
// PATCH - mark meeting as completed (staff only)
// router.patch('/:id/complete-meeting', auth, roleAuth(['staff']), completeMeeting);



module.exports = router;
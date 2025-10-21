// routes/adoptions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requestAdoption, getOrganizationRequests, updateRequestStatus, getMyRequests, confirmMeeting, sendMeetingReminder } = require('../controllers/adoptionController');
const roleAuth = require('../middleware/roleAuth');

// Routes
router.post('/:petId/request', auth, roleAuth(['adopter']), requestAdoption);
router.get('/requests', auth, roleAuth(['staff', 'admin']), getOrganizationRequests);
router.patch('/:id/status', auth, roleAuth(['staff', 'admin']), updateRequestStatus);
router.get('/my-requests', auth, roleAuth(['adopter']), getMyRequests);
router.patch('/:id/confirm-meeting', auth, roleAuth(['adopter']), confirmMeeting);
router.post('/:id/send-reminder', auth, roleAuth(['staff', 'admin']), sendMeetingReminder);

module.exports = router;
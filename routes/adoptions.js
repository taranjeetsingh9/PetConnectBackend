// routes/adoptions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
    requestAdoption, getOrganizationRequests, updateRequestStatus, getMyRequests, 
    confirmMeeting, sendMeetingReminder, getMyAdoptedPets, scheduleMeeting,  
    completeMeeting,
    submitMeetingFeedback, getRequestDetails,
    cancelRequest,
    rescheduleMeeting,
    getAdoptionStats,
    bulkUpdateStatus,
    sendAdoptionAgreement,
    signAgreement,
    processPayment,
    getAgreementDetails,getPaymentDetails,initiatePayment } = require('../controllers/adoptionController');
const roleAuth = require('../middleware/roleAuth');

// 🐾 Adopter routes
router.post('/:petId/request', auth, roleAuth(['adopter']), requestAdoption);
router.get('/my-requests', auth, roleAuth(['adopter']), getMyRequests);
router.get('/my-adopted-pets', auth, roleAuth(['adopter']), getMyAdoptedPets);
router.post('/:requestId/schedule-meeting', auth, roleAuth(['adopter']), scheduleMeeting);
router.patch('/:id/confirm-meeting', auth, roleAuth(['adopter']), confirmMeeting);
router.post('/:id/feedback', auth, roleAuth(['adopter']), submitMeetingFeedback);

//  Staff/Admin routes
router.get('/requests', auth, roleAuth(['staff', 'admin']), getOrganizationRequests);
router.patch('/:id/status', auth, roleAuth(['staff', 'admin']), updateRequestStatus);
router.post('/:id/complete-meeting', auth, roleAuth(['staff', 'admin']), completeMeeting);
router.post('/:id/send-reminder', auth, roleAuth(['staff', 'admin']), sendMeetingReminder);

//  NEW ROUTES
router.get('/:id/details', auth, roleAuth(['adopter', 'staff', 'admin']), getRequestDetails);
router.delete('/:id/cancel', auth, roleAuth(['adopter']), cancelRequest);
router.patch('/:id/reschedule-meeting', auth, roleAuth(['adopter', 'staff', 'admin']), rescheduleMeeting);
router.get('/stats/organization', auth, roleAuth(['staff', 'admin']), getAdoptionStats);
router.patch('/bulk/status', auth, roleAuth(['staff', 'admin']), bulkUpdateStatus);

// Agreement & Payment routes
router.post('/:id/send-agreement', auth, roleAuth(['staff', 'admin']), sendAdoptionAgreement);
router.post('/agreements/:agreementId/sign', auth, roleAuth(['adopter']), signAgreement);
router.post('/:id/process-payment', auth, roleAuth(['adopter']), processPayment);
router.get('/agreements/:agreementId', auth, roleAuth(['adopter', 'staff', 'admin']), getAgreementDetails);
router.get('/:requestId/payment-details', auth, getPaymentDetails);
router.post('/:requestId/initiate-payment', auth, initiatePayment);


module.exports = router;
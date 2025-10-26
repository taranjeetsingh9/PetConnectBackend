const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const auth = require('../middleware/auth');

// Set/update availability
router.post('/:userId', auth, availabilityController.setAvailability);

// Get availability (optional day query)
router.get('/:userId', auth, availabilityController.getAvailability);

// Delete availability (optional day query)
router.delete('/:userId', auth, availabilityController.deleteAvailability);

// NEW ROUTE: Get all available staff
router.get('/available/staff', auth, availabilityController.getAvailableStaff);

module.exports = router;

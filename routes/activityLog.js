// routes/activityLog.js
const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Admin can view all logs
router.get('/', auth, roleAuth(['admin']), activityLogController.getAllLogs);

// Specific user route
router.get('/:userId', auth, activityLogController.getUserLogs);

module.exports = router;


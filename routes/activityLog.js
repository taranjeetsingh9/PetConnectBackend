// routes/activityLog.js
const express = require('express');
const router = express.Router();
const { getAllLogs, getUserLogs } = require('../controllers/activityLogController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Admin can view all logs
router.get('/', auth, roleAuth(['admin']), getAllLogs);

// specific user route. // for futre approaches.
router.get('/:userId', auth, getUserLogs);

module.exports = router;

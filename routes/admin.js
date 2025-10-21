const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// Analytics
router.get('/analytics', auth, isAdmin, adminController.getAnalytics);

// User management
router.get('/users', auth, isAdmin, adminController.getUsers);
router.patch('/users/:userId/role', auth, isAdmin, adminController.updateUserRole);
router.delete('/users/:userId', auth, isAdmin, adminController.deleteUser);

// Organization management
router.get('/organizations', auth, isAdmin, adminController.getOrganizations);
router.post('/organizations', auth, isAdmin, adminController.createOrganization);

// Activity logs
router.get('/activity-logs', auth, isAdmin, adminController.getActivityLogs);

// System management
router.get('/system-health', auth, isAdmin, adminController.getSystemHealth);

module.exports = router;

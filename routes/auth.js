const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Sign up
router.post('/signup', authController.signup);

// Login
router.post('/login', authController.login);

// Get current user
router.get("/me", auth, authController.getCurrentUser);

// Update profile
router.patch('/users/profile', auth, authController.updateProfile);

module.exports = router;

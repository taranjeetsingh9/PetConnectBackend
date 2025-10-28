// routes/agreements.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const {
  getAgreement,
  getSignaturePage,
  signAgreement,
  downloadAgreement
} = require('../controllers/agreementController');

// 🐾 Adopter routes
router.get('/:id', auth, getAgreement); // Get agreement details
router.get('/:id/sign', auth, getSignaturePage); // Signature capture page
router.post('/:id/sign', auth, signAgreement); // Process signature
router.get('/:id/download', auth, downloadAgreement); // Download PDF

module.exports = router;
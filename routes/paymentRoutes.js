// routes/paymentRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const { 
  getPaymentDetails, 
  initiatePayment 
} = require('../controllers/adoptionController');

const { 
  confirmPayment, 
  handleWebhook 
} = require('../controllers/paymentController');

const auth = require('../middleware/auth');

// Adoption payment endpoints
router.post('/adoptions/:requestId/initiate-payment', auth, initiatePayment);
router.get('/adoptions/:requestId/payment-details', auth, getPaymentDetails);

// Payment confirmation & webhooks
router.post('/:paymentId/confirm', auth, confirmPayment);
router.get('/:paymentId', auth, (req, res) => { // Use inline function for getPaymentDetails to avoid name conflict
  const paymentController = require('../controllers/paymentController');
  return paymentController.getPaymentDetails(req, res);
});

// Stripe webhook (no auth - Stripe calls this directly)
router.post('/webhook', express.raw({type: 'application/json'}), handleWebhook);

module.exports = router;
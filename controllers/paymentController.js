// controllers/paymentController.js
const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const AdoptionRequest = require('../models/AdopterRequest');

exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId)
      .populate('adoptionRequest');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    const confirmResult = await paymentService.confirmPayment(payment.paymentIntentId);
    
    if (confirmResult.success) {
      // Update payment record
      payment.status = 'completed';
      payment.receiptUrl = confirmResult.receiptUrl;
      payment.paidAt = new Date();
      await payment.save();

      // Update adoption request status
      await AdoptionRequest.findByIdAndUpdate(
        payment.adoptionRequest._id,
        { status: 'finalized' }
      );

      res.json({ 
        success: true, 
        message: 'Payment confirmed and adoption finalized!',
        receiptUrl: confirmResult.receiptUrl
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Payment not yet confirmed' 
      });
    }

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'adoptionRequest',
        populate: { path: 'pet', select: 'name breed' }
      });

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        currency: payment.currency,
        paymentIntentId: payment.paymentIntentId,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
        adoptionRequest: payment.adoptionRequest
      }
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    await paymentService.handleWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
};
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  adoptionRequest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdoptionRequest', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded','requires_action',   
    'requires_payment_method',],
    default: 'pending'
  },
  paymentMethod: String,
  transactionId: String,
  receiptUrl: String,
  paidAt: Date
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Payment', paymentSchema);
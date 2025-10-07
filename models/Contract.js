// models/Contract.js
const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

  type: { type: String, enum: ['adoption', 'foster'], required: true },
  terms: String,
  adoptionFee: Number,

  // Blockchain
  blockchainId: { type: String },       
  transactionHash: { type: String },    
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Contract', ContractSchema);

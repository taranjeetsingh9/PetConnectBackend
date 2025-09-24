// models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },           // optional, if reviewing a pet
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }, // optional, if reviewing organization
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: String,
  
  // Optional blockchain reference for immutable reviews
  blockchainId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);


const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String },                      
  action: { type: String, required: true },     
  target: { type: String },                     
  targetModel: { type: String },                 
  details: mongoose.Schema.Types.Mixed,          
  ipAddress: { type: String },                 
  blockchainId: { type: String }                
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
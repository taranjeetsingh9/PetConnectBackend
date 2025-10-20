const mongoose = require('mongoose');

const FosterChatSchema = new mongoose.Schema({
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    lastReadAt: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: Date.now }
  }],
  
  fosterRequest: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  
  lastMessage: String,
  lastMessageAt: { type: Date, default: Date.now },
  
  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  isActive: { type: Boolean, default: true },
  archivedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: Date
  }]
  
}, { timestamps: true });

// Indexes for performance
FosterChatSchema.index({ 'participants.user': 1, lastMessageAt: -1 });
FosterChatSchema.index({ fosterRequest: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('FosterChat', FosterChatSchema);
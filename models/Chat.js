const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    lastReadAt: { type: Date, default: Date.now }, //  WHEN user last read
    joinedAt: { type: Date, default: Date.now }     //  WHEN user joined chat
  }],
  
  adoptionRequest: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdoptionRequest',
    required: true 
  },
  
  lastMessage: String,
  lastMessageAt: { type: Date, default: Date.now },
  
  //  BETTER: Track unread counts per user
  unreadCounts: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // NEW: Chat metadata
  isActive: { type: Boolean, default: true },
  archivedBy: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: Date
  }]
  
}, { timestamps: true });

//  Index for performance
ChatSchema.index({ 'participants.user': 1, lastMessageAt: -1 });
ChatSchema.index({ adoptionRequest: 1 }, { unique: true }); // One chat per adoption

module.exports = mongoose.model('Chat', ChatSchema);
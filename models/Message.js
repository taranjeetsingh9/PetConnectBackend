const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chat: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chat', 
    required: true 
  },
  
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  content: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'system', 'meeting_scheduled'],
    default: 'text'
  },
  
  //  IMPROVED: Track read status with timestamps
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  
  // NEW: Message metadata
  attachments: [{
    url: String,
    type: String,
    filename: String,
    size: Number
  }],
  
  //  NEW: For system messages (like "Meeting scheduled")
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }

}, { timestamps: true });

// Better indexing
MessageSchema.index({ chat: 1, createdAt: 1 }); // For chronological order
MessageSchema.index({ createdAt: -1 }); // For recent messages
MessageSchema.index({ 'readBy.user': 1 }); // For read status queries

module.exports = mongoose.model('Message', MessageSchema);
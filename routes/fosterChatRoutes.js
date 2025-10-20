const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FosterChat = require('../models/FosterChat');
const Message = require('../models/Message');
const Pet = require('../models/Pet');

// GET /api/foster-chats/user-chats - Get all foster chats for current user
router.get('/user-chats', auth, async (req, res) => {
  try {
    const fosterChats = await FosterChat.find({
      'participants.user': req.user.id,
      isActive: true
    })
    .populate('participants.user', 'name email avatar')
    .populate('pet', 'name breed images status')
    .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      count: fosterChats.length,
      chats: fosterChats
    });
  } catch (error) {
    console.error('Get foster chats error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while fetching foster chats' 
    });
  }
});

// GET /api/foster-chats/:chatId - Get specific foster chat
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await FosterChat.findOne({
      _id: chatId,
      'participants.user': req.user.id
    })
    .populate('participants.user', 'name email avatar role')
    .populate('pet', 'name breed images status location');

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Foster chat not found or access denied' 
      });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Get foster chat error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while fetching foster chat' 
    });
  }
});

// GET /api/foster-chats/:chatId/messages - Get messages for foster chat
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify user has access to this foster chat
    const chat = await FosterChat.findOne({
      _id: chatId,
      'participants.user': req.user.id
    });

    if (!chat) {
      return res.status(403).json({ 
        success: false, 
        msg: 'Access denied to this chat' 
      });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email avatar role')
      .sort({ createdAt: 1 });

    res.json({ 
      success: true, 
      count: messages.length, 
      messages 
    });
  } catch (error) {
    console.error('Get foster chat messages error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while fetching messages' 
    });
  }
});

// POST /api/foster-chats/:chatId/messages - Send message in foster chat
router.post('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Message content is required' 
      });
    }

    // Verify user has access to foster chat
    const chat = await FosterChat.findOne({
      _id: chatId,
      'participants.user': req.user.id
    });

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Foster chat not found or access denied' 
      });
    }

    // Create and save message (reuse your existing Message model)
    const message = new Message({
      chat: chatId,
      sender: req.user.id,
      content: content.trim(),
      messageType,
      readBy: [{ user: req.user.id, readAt: new Date() }],
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
      metadata: req.body.metadata || {}
    });

    await message.save();

    // Update foster chat with last message info
    chat.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
    chat.lastMessageAt = new Date();

    // Increment unread count for other participants
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== req.user.id) {
        const currentCount = chat.unreadCounts.get(participant.user.toString()) || 0;
        chat.unreadCounts.set(participant.user.toString(), currentCount + 1);
      }
    });

    await chat.save();

    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email avatar role');

    res.json({
      success: true,
      message: populatedMessage,
      chatUpdate: {
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt
      }
    });

  } catch (error) {
    console.error('Send foster chat message error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while sending message' 
    });
  }
});

// PATCH /api/foster-chats/:chatId/read - Mark messages as read
router.patch('/:chatId/read', auth, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await FosterChat.findOne({
      _id: chatId,
      'participants.user': req.user.id
    });

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Foster chat not found' 
      });
    }

    // Reset unread count for this user
    chat.unreadCounts.set(req.user.id.toString(), 0);
    await chat.save();

    res.json({
      success: true,
      msg: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while marking messages as read' 
    });
  }
});

module.exports = router;
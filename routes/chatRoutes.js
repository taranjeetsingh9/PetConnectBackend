const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const AdoptionRequest = require('../models/AdopterRequest');
const Chat = require('../models/chat');


// We'll add routes here
/**
 * @route   GET /api/chats
 * @desc    Get all chats for current user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
      const chats = await Chat.find({
        'participants.user': req.user.id,
        isActive: true
      })
      .populate('participants.user', 'name email role')
      .populate({
        path: 'adoptionRequest',
        populate: { path: 'pet', select: 'name breed images' }
      })
      .sort({ lastMessageAt: -1 });
  
      res.json({
        success: true,
        count: chats.length,
        chats
      });
    } catch (error) {
      console.error('Get chats error:', error);
      res.status(500).json({ 
        success: false, 
        msg: 'Server error while fetching chats' 
      });
    }
  });

  /**
 * @route   GET /api/chats/:adoptionRequestId
 * @desc    Get or create chat for an adoption request
 * @access  Private
 */
// router.get('/:adoptionRequestId', auth, async (req, res) => {
//     try {
//       const { adoptionRequestId } = req.params;
  
//       // Verify adoption request exists
//       const adoptionRequest = await AdoptionRequest.findById(adoptionRequestId)
//         .populate('adopter')
//         .populate('organization');
  
//       if (!adoptionRequest) {
//         return res.status(404).json({ 
//           success: false, 
//           msg: 'Adoption request not found' 
//         });
//       }
  
//       // Check authorization
//       const isAdopter = adoptionRequest.adopter._id.toString() === req.user.id;
//       const isStaff = req.user.organization && 
//                      adoptionRequest.organization._id.toString() === req.user.organization.toString();
  
//       if (!isAdopter && !isStaff) {
//         return res.status(403).json({ 
//           success: false, 
//           msg: 'Not authorized to access this chat' 
//         });
//       }
  
//       // Find or create chat
//       let chat = await Chat.findOne({ adoptionRequest: adoptionRequestId })
//         .populate('participants.user', 'name email role')
//         .populate({
//           path: 'adoptionRequest',
//           populate: [
//             { path: 'pet', select: 'name breed images status' },
//             { path: 'adopter', select: 'name email' }
//           ]
//         });
  
//       if (!chat) {
//         // We'll implement chat creation in next step
//         return res.status(404).json({
//           success: false,
//           msg: 'Chat not found for this adoption request'
//         });
//       }
  
//       res.json({
//         success: true,
//         chat
//       });
  
//     } catch (error) {
//       console.error('Get chat error:', error);
//       res.status(500).json({ 
//         success: false, 
//         msg: 'Server error while fetching chat' 
//       });
//     }
//   });

/**
 * @route   GET /api/chats/:adoptionRequestId
 * @desc    Get or create chat for an adoption request
 * @access  Private
 */
router.get('/:adoptionRequestId', auth, async (req, res) => {
    try {
      const { adoptionRequestId } = req.params;
  
      // Verify adoption request exists
      const adoptionRequest = await AdoptionRequest.findById(adoptionRequestId)
        .populate('adopter')
        .populate('organization');
  
      if (!adoptionRequest) {
        return res.status(404).json({ 
          success: false, 
          msg: 'Adoption request not found' 
        });
      }
  
      // Check authorization
      const isAdopter = adoptionRequest.adopter._id.toString() === req.user.id;
      const isStaff = req.user.organization && 
                     adoptionRequest.organization._id.toString() === req.user.organization.toString();
  
      if (!isAdopter && !isStaff) {
        return res.status(403).json({ 
          success: false, 
          msg: 'Not authorized to access this chat' 
        });
      }
  
      // ✅ FIXED: Auto-create chat if doesn't exist
      let chat = await Chat.findOne({ adoptionRequest: adoptionRequestId })
        .populate('participants.user', 'name email role')
        .populate({
          path: 'adoptionRequest',
          populate: [
            { path: 'pet', select: 'name breed images status' },
            { path: 'adopter', select: 'name email' }
          ]
        });
  
      if (!chat) {
        console.log('🔧 Creating new chat for adoption:', adoptionRequestId);
        
        // Create participants array
        const participants = [
          { user: adoptionRequest.adopter._id, role: 'adopter' }
        ];
  
        // Add staff members from organization
        const User = require('../models/User');
        const staffMembers = await User.find({ 
          organization: adoptionRequest.organization._id,
          role: 'staff'
        }).select('_id name email');
  
        staffMembers.forEach(staff => {
          participants.push({ user: staff._id, role: 'staff' });
        });
  
        // Create new chat
        chat = new Chat({
          participants,
          adoptionRequest: adoptionRequestId,
          lastMessage: `Chat started for ${adoptionRequest.pet.name}'s adoption`,
          lastMessageAt: new Date()
        });
  
        await chat.save();
        
        // Populate the created chat
        chat = await Chat.findById(chat._id)
          .populate('participants.user', 'name email role')
          .populate({
            path: 'adoptionRequest',
            populate: [
              { path: 'pet', select: 'name breed images status' },
              { path: 'adopter', select: 'name email' }
            ]
          });
  
        console.log('✅ New chat created:', chat._id);
      }
  
      res.json({
        success: true,
        chat
      });
  
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({ 
        success: false, 
        msg: 'Server error while fetching chat' 
      });
    }
  });


/**
 * @route GET /api/chats/:chatId/messages
 * @desc  Get all messages for a chat
 * @access Private
 */
router.get('/:chatId/messages', auth, async (req, res) => {
    try {
      const { chatId } = req.params;
  
      const messages = await Message.find({ chat: chatId })
        .populate('sender', 'name email role')
        .sort({ createdAt: 1 }); // chronological order
  
      res.json({ success: true, count: messages.length, messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ success: false, msg: 'Server error while fetching messages' });
    }
  });
  



/**
 * @route   POST /api/chats/:chatId/messages
 * @desc    Send a message in chat
 * @access  Private
 */
router.post('/:chatId/messages', auth, async (req, res) => {
    try {
      const { chatId } = req.params;
      const { content, messageType = 'text' } = req.body;
  
      // Validate input
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          msg: 'Message content is required' 
        });
      }
  
      // Verify user has access to chat
      const chat = await Chat.findOne({
        _id: chatId,
        'participants.user': req.user.id
      }).populate('participants.user', 'name email role');
  
      if (!chat) {
        return res.status(404).json({ 
          success: false, 
          msg: 'Chat not found or access denied' 
        });
      }

      const now = new Date();
  
      // Create and save message
      const message = new Message({
        chat: chatId,
        sender: req.user.id,
        content: content.trim(),
        messageType,

        // test 

         // store readBy as embedded object(s) per your schema
  readBy: [{ user: req.user.id, readAt: now }],
  // attachments and metadata can be set from req.body if provided
  attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
  metadata: req.body.metadata || {}
        // readBy: [req.user.id] // Sender has read their own message
      });
  
      await message.save();
  
      // Update chat with last message info
      chat.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
      chat.lastMessageAt = new Date();
  
      // Increment unread count for other participants
      chat.participants.forEach(participant => {
        if (participant.user._id.toString() !== req.user.id) {
          const currentCount = chat.unreadCounts.get(participant.user._id.toString()) || 0;
          chat.unreadCounts.set(participant.user._id.toString(), currentCount + 1);
        }
      });
  
      await chat.save();
  
      // Populate message for response
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name email role');
  
      res.json({
        success: true,
        message: populatedMessage,
        chatUpdate: {
          lastMessage: chat.lastMessage,
          lastMessageAt: chat.lastMessageAt
        }
      });
  
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ 
        success: false, 
        msg: 'Server error while sending message' 
      });
    }
  });
module.exports = router;
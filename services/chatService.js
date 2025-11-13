const Chat = require('../models/chat');
const AdoptionRequest = require('../models/AdopterRequest');
const User = require('../models/User');
const Message = require('../models/Message');

const createError = (msg, status = 400) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

class ChatService {
  /**
   * Get all chats for a user
   */
  async getAllChats(userId) {
    const chats = await Chat.find({
      'participants.user': userId,
      isActive: true
    })
      .populate('participants.user', 'name email role')
      .populate({
        path: 'adoptionRequest',
        populate: { path: 'pet', select: 'name breed images' }
      })
      .sort({ lastMessageAt: -1 });

    return { success: true, count: chats.length, chats };
  }

  /**
   * Get or create chat for an adoption request
   */
  async getOrCreateChat(userId, adoptionRequestId) {
    const adoptionRequest = await AdoptionRequest.findById(adoptionRequestId)
      .populate('adopter')
      .populate('organization')
      .populate('pet');

    if (!adoptionRequest) throw createError('Adoption request not found', 404);

    // Authorization check: adopter or staff of organization
    const user = await User.findById(userId);
    const isAdopter = adoptionRequest.adopter._id.toString() === userId;
    const isStaff =
      user.organization &&
      adoptionRequest.organization &&
      adoptionRequest.organization._id &&
      adoptionRequest.organization._id.toString() === user.organization.toString();

    if (!isAdopter && !isStaff) throw createError('Not authorized', 403);

    // Try to find existing chat
    let chat = await Chat.findOne({ adoptionRequest: adoptionRequestId })
      .populate('participants.user', 'name email role')
      .populate({
        path: 'adoptionRequest',
        populate: [
          { path: 'pet', select: 'name breed images status' },
          { path: 'adopter', select: 'name email' }
        ]
      });

    // If no chat exists, create one
    if (!chat) {
      const participants = [{ user: adoptionRequest.adopter._id, role: 'adopter' }];

      // Add staff from organization
      if (adoptionRequest.organization && adoptionRequest.organization._id) {
        const staffMembers = await User.find({
          organization: adoptionRequest.organization._id,
          role: 'staff'
        }).select('_id name email');

        staffMembers.forEach(s => participants.push({ user: s._id, role: 'staff' }));
      }

      chat = new Chat({
        participants,
        adoptionRequest: adoptionRequestId,
        lastMessage: `Chat started for ${adoptionRequest.pet?.name || 'pet'}'s adoption`,
        lastMessageAt: new Date()
      });
      await chat.save();

      // Repopulate for response
      chat = await Chat.findById(chat._id)
        .populate('participants.user', 'name email role')
        .populate({
          path: 'adoptionRequest',
          populate: [
            { path: 'pet', select: 'name breed images status' },
            { path: 'adopter', select: 'name email' }
          ]
        });
    }

    return { success: true, chat };
  }

  /**
   * Get messages for a chat (ensures access)
   */
  async getMessages(userId, chatId) {
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId
    });
    if (!chat) throw createError('Chat not found or access denied', 404);

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name email role')
      .sort({ createdAt: 1 });

    return { success: true, count: messages.length, messages };
  }

  /**
   * Send message in a chat
   */
  async sendMessage(
    userId,
    chatId,
    content,
    messageType = 'text',
    attachments = [],
    metadata = {}
  ) {
    if (!content || !content.trim()) throw createError('Message content is required', 400);

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId
    });
    if (!chat) throw createError('Chat not found or access denied', 404);

    const now = new Date();
    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content: content.trim(),
      messageType,
      readBy: [{ user: userId, readAt: now }],
      attachments: Array.isArray(attachments) ? attachments : [],
      metadata: metadata || {}
    });

    // Update chat's last message
    chat.lastMessage =
      content.length > 100 ? content.substring(0, 100) + '...' : content;
    chat.lastMessageAt = now;

    // Update unread count for other users
    chat.participants.forEach(p => {
      if (p.user.toString() !== userId) {
        const current = chat.unreadCounts.get(p.user.toString()) || 0;
        chat.unreadCounts.set(p.user.toString(), current + 1);
      }
    });

    await chat.save();

    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name email role'
    );

    return {
      success: true,
      message: populatedMessage,
      chatUpdate: {
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt
      }
    };
  }
}

// Create singleton instance
const chatService = new ChatService();
module.exports = {
  ChatService,
  chatService,
  // Legacy bindings (backward-compatible)
  getAllChats: chatService.getAllChats.bind(chatService),
  getOrCreateChat: chatService.getOrCreateChat.bind(chatService),
  getMessages: chatService.getMessages.bind(chatService),
  sendMessage: chatService.sendMessage.bind(chatService),
};

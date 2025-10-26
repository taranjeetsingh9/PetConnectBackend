// services/chatService.js
const Chat = require('../../models/chat');
const AdoptionRequest = require('../../models/AdopterRequest');
const User = require('../../models/User');
const Message = require('../../models/Message');

const createError = (msg, status = 400) => {
  const err = new Error(msg); err.status = status; return err;
};

exports.getAllChats = async (userId) => {
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
};

exports.getOrCreateChat = async (userId, adoptionRequestId) => {
  const adoptionRequest = await AdoptionRequest.findById(adoptionRequestId)
    .populate('adopter')
    .populate('organization')
    .populate('pet');

  if (!adoptionRequest) throw createError('Adoption request not found', 404);

  // Authorization: adopter or staff of organization
  const isAdopter = adoptionRequest.adopter._id.toString() === userId;
  const isStaff = adoptionRequest.organization && adoptionRequest.organization._id && adoptionRequest.organization._id.toString() === (await User.findById(userId).then(u => u.organization?.toString()));
  if (!isAdopter && !isStaff) throw createError('Not authorized', 403);

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
    const participants = [{ user: adoptionRequest.adopter._id, role: 'adopter' }];

    // Add staff members in org (if organization exists)
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
};

exports.getMessages = async (userId, chatId) => {
  // Ensure user has access
  const chat = await Chat.findOne({ _id: chatId, 'participants.user': userId });
  if (!chat) throw createError('Chat not found or access denied', 404);

  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name email role')
    .sort({ createdAt: 1 });

  return { success: true, count: messages.length, messages };
};

exports.sendMessage = async (userId, chatId, content, messageType = 'text', attachments = [], metadata = {}) => {
  if (!content || !content.trim()) throw createError('Message content is required', 400);

  const chat = await Chat.findOne({ _id: chatId, 'participants.user': userId });
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

  chat.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
  chat.lastMessageAt = new Date();

  chat.participants.forEach(participant => {
    if (participant.user.toString() !== userId) {
      const cur = chat.unreadCounts.get(participant.user.toString()) || 0;
      chat.unreadCounts.set(participant.user.toString(), cur + 1);
    }
  });

  await chat.save();

  const populatedMessage = await Message.findById(message._id).populate('sender', 'name email role');
  return { success: true, message: populatedMessage, chatUpdate: { lastMessage: chat.lastMessage, lastMessageAt: chat.lastMessageAt } };
};

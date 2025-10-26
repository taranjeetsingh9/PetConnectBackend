const FosterChat = require('../../models/FosterChat');
const Message = require('../../models/Message');
const { MESSAGE_TYPES } = require('../../constants/chatConstants');


exports.getUserChats = async (userId) => {
  const chats = await FosterChat.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'name email avatar')
  .populate('pet', 'name breed images status')
  .sort({ lastMessageAt: -1 });

  return { success: true, count: chats.length, chats };
};

exports.getFosterChat = async (userId, chatId) => {
  const chat = await FosterChat.findOne({
    _id: chatId,
    'participants.user': userId
  })
  .populate('participants.user', 'name email avatar role')
  .populate('pet', 'name breed images status location');

  if (!chat) throw new Error('Foster chat not found or access denied');

  return { success: true, chat };
};

exports.getChatMessages = async (userId, chatId) => {
  const chat = await FosterChat.findOne({ _id: chatId, 'participants.user': userId });
  if (!chat) throw new Error('Access denied to this chat');

  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name email avatar role')
    .sort({ createdAt: 1 });

  return { success: true, count: messages.length, messages };
};

exports.sendMessage = async (userId, chatId, content, messageType, attachments, metadata) => {
  if (!content || !content.trim()) throw new Error('Message content is required');

  const chat = await FosterChat.findOne({ _id: chatId, 'participants.user': userId });
  if (!chat) throw new Error('Foster chat not found or access denied');

  const message = await Message.create({
    chat: chatId,
    sender: userId,
    content: content.trim(),
    messageType,
    readBy: [{ user: userId, readAt: new Date() }],
    attachments: Array.isArray(attachments) ? attachments : [],
    metadata: metadata || {}
  });

  chat.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
  chat.lastMessageAt = new Date();

  chat.participants.forEach(participant => {
    if (participant.user.toString() !== userId) {
      const currentCount = chat.unreadCounts.get(participant.user.toString()) || 0;
      chat.unreadCounts.set(participant.user.toString(), currentCount + 1);
    }
  });

  await chat.save();

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name email avatar role');

  return {
    success: true,
    message: populatedMessage,
    chatUpdate: {
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt
    }
  };
};

exports.markAsRead = async (userId, chatId) => {
  const chat = await FosterChat.findOne({
    _id: chatId,
    'participants.user': userId
  });

  if (!chat) throw new Error('Foster chat not found');

  chat.unreadCounts.set(userId.toString(), 0);
  await chat.save();

  return { success: true, msg: 'Messages marked as read' };
};

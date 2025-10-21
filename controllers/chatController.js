// controllers/chatController.js
const chatService = require('../services/chatService');

exports.getAllChats = async (req, res) => {
  try {
    const result = await chatService.getAllChats(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.getOrCreateChat = async (req, res) => {
  try {
    const result = await chatService.getOrCreateChat(req.user.id, req.params.adoptionRequestId);
    res.json(result);
  } catch (error) {
    console.error('Get or create chat error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const result = await chatService.getMessages(req.user.id, req.params.chatId);
    res.json(result);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, messageType = 'text', attachments, metadata } = req.body;
    const result = await chatService.sendMessage(
      req.user.id, req.params.chatId, content, messageType, attachments, metadata
    );
    res.json(result);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};


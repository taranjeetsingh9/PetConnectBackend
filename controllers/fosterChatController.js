const fosterChatService = require('../services/fosterChatService');

exports.getUserChats = async (req, res) => {
  try {
    const result = await fosterChatService.getUserChats(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Get foster chats error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.getFosterChat = async (req, res) => {
  try {
    const result = await fosterChatService.getFosterChat(req.user.id, req.params.chatId);
    res.json(result);
  } catch (error) {
    console.error('Get foster chat error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const result = await fosterChatService.getChatMessages(req.user.id, req.params.chatId);
    res.json(result);
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, messageType = 'text', attachments, metadata } = req.body;
    const result = await fosterChatService.sendMessage(
      req.user.id, req.params.chatId, content, messageType, attachments, metadata
    );
    res.json(result);
  } catch (error) {
    console.error('Send foster chat message error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const result = await fosterChatService.markAsRead(req.user.id, req.params.chatId);
    res.json(result);
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ success: false, msg: error.message });
  }
};

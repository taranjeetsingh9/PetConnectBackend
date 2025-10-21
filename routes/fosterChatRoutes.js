const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fosterChatController = require('../controllers/fosterChatController');


// router.get('/test', (req, res) => {
//   res.json({ success: true, msg: ' Foster Chat route connected successfully!' }); // working so no need to worry.
// });

// GET all user chats
router.get('/user-chats', auth, fosterChatController.getUserChats);

// GET single chat
router.get('/:chatId', auth, fosterChatController.getFosterChat);

// GET messages in chat
router.get('/:chatId/messages', auth, fosterChatController.getChatMessages);

// POST send message
router.post('/:chatId/messages', auth, fosterChatController.sendMessage);

// PATCH mark as read
router.patch('/:chatId/read', auth, fosterChatController.markAsRead);

module.exports = router;


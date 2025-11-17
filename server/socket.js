const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message'); 
const Chat = require('../models/chat'); 
const FosterChat = require('../models/FosterChat'); 

let io;
async function getUserName(userId) {
  try {
    const user = await User.findById(userId).select('name');
    return user ? user.name : 'User';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'User';
  }
}

const setupSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5001"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'], 
    pingTimeout: 30000
  });

  // Socket.io middleware for authentication - SIMPLIFIED VERSION
// server/socket.js - UPDATED TO MATCH YOUR EXISTING JWT STRUCTURE
io.use(async (socket, next) => {
    try {
      console.log('🔐 Socket auth attempt...');
      
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('No token provided'));
      }
  
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 JWT decoded structure:', decoded);
      
      // Your auth.js uses: req.user = decoded.user;
      // So your JWT tokens are probably: { user: { id: ..., ... } }
      
      let userId, userRole;
      
      if (decoded.user && decoded.user.id) {
        // Your current structure: { user: { id: ..., role: ... } }
        userId = decoded.user.id;
        userRole = decoded.user.role;
        console.log(' Using user.id structure');
      } else if (decoded.id) {
        // Fallback: direct id structure { id: ..., role: ... }
        userId = decoded.id;
        userRole = decoded.role;
        console.log('Using direct id structure');
      } else {
        console.log(' Unrecognized token structure:', decoded);
        return next(new Error('Invalid token structure'));
      }
      
      if (!userId) {
        console.log(' No user ID found in token');
        return next(new Error('No user ID in token'));
      }
      
      socket.userId = userId;
      socket.userRole = userRole || 'adopter';
      
      console.log('Socket authenticated - User ID:', socket.userId, 'Role:', socket.userRole);
      next();
      
    } catch (error) {
      console.error('Socket auth failed:', error.message);
      next(new Error('Authentication failed: ' + error.message));
    }
  });
  io.on('connection', (socket) => {
    console.log(' User connected - ID:', socket.userId, 'Role:', socket.userRole, 'Socket:', socket.id);

    //  FIX: Join user to BOTH room formats for compatibility
    socket.join(socket.userId); // For your Notifier class (no prefix)
    socket.join(`user-${socket.userId}`); // For your chat system (with prefix)
    console.log(` User ${socket.userId} joined rooms: ${socket.userId} AND user-${socket.userId}`);

    // Join specific chat room
    socket.on('join-chat', (chatId) => {
      socket.join(`chat-${chatId}`);
      console.log(` User ${socket.userId} joined chat room: ${chatId}`);
      
      // Notify others in the chat that user joined
      socket.to(`chat-${chatId}`).emit('user-joined-chat', {
        userId: socket.userId,
        chatId: chatId,
        timestamp: new Date().toISOString()
      });
    });

    // Leave chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat-${chatId}`);
      console.log(` User ${socket.userId} left chat room: ${chatId}`);
    });


// test it 
socket.on('send-message', async (data) => {
  try {
    const { chatId, content, messageType = 'text' } = data;
    
    console.log(` Pure WebSocket: User ${socket.userId} sending to chat ${chatId}:`, content);

    //  Check both Chat AND FosterChat models
    let chat = await Chat.findOne({
      _id: chatId,
      'participants.user': socket.userId
    });

    let chatModel = 'Chat';
    
    if (!chat) {
      // Try FosterChat if not found in Chat
      chat = await FosterChat.findOne({
        _id: chatId,
        'participants.user': socket.userId
      });
      chatModel = 'FosterChat';
    }

    if (!chat) {
      console.log(' No chat access for user:', socket.userId);
      socket.emit('message-error', { 
        message: 'No access to this chat',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`Found ${chatModel} for Pure WebSocket message`);

    // Create and save message to database
    const message = new Message({
      chat: chatId,
      sender: socket.userId,
      content: content.trim(),
      messageType,
      readBy: [{ 
        user: socket.userId,
        readAt: new Date()
      }]
    });

    await message.save();
    console.log(' Message saved to database:', message._id);

    // Update chat's last message info
    chat.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
    chat.lastMessageAt = new Date();
    
    // Increment unread counts for other participants
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== socket.userId) {
        const currentCount = chat.unreadCounts.get(participant.user.toString()) || 0;
        chat.unreadCounts.set(participant.user.toString(), currentCount + 1);
      }
    });

    await chat.save();
    console.log(' Chat updated with last message');

    // Populate message for real-time emission
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email avatar role');

    console.log('Message populated for broadcast:', populatedMessage._id);

    // BROADCAST TO ALL PARTICIPANTS IN REAL-TIME
    io.to(`chat-${chatId}`).emit('new-message', populatedMessage);
    console.log(`Message broadcasted to chat-${chatId}`);

    //  Send success confirmation to sender
    socket.emit('message-sent', {
      messageId: populatedMessage._id,
      timestamp: new Date().toISOString()
    });

    // Send notifications to users not in chat
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== socket.userId) {
        io.to(`user-${participant.user}`).emit('new-chat-notification', {
          chatId: chatId,
          message: content,
          sender: populatedMessage.sender.name,
          petName: chat.pet ? chat.pet.name : 'a pet',
          timestamp: new Date().toISOString()
        });
        console.log(` Notification sent to user-${participant.user}`);
      }
    });

    console.log(` Pure WebSocket message completed for ${chatModel}`);

  } catch (error) {
    console.error(' Pure WebSocket send-message error:', error);
    socket.emit('message-error', { 
      message: 'Failed to send message',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
// test end


    
    // Add this new event handler for chat validation
    socket.on('validate-chat-access', async (data, callback) => {
      try {
        const { chatId } = data;
        
        // Check both Chat and FosterChat models
        let chat = await Chat.findOne({
          _id: chatId,
          'participants.user': socket.userId
        });
        
        if (!chat) {
          chat = await FosterChat.findOne({
            _id: chatId,
            'participants.user': socket.userId
          });
        }
    
        if (chat) {
          callback({ success: true, hasAccess: true });
        } else {
          callback({ success: true, hasAccess: false });
        }
      } catch (error) {
        console.error('Validate chat access error:', error);
        callback({ success: false, error: error.message });
      }
    });
    

//  Handle message delivery status
socket.on('message-delivered', (data) => {
  console.log('Message delivered to recipient:', data);
  // You can add delivery receipts here if needed
});

//  Handle message read receipts  
socket.on('message-read', (data) => {
  console.log('Message read by recipient:', data);
  // You can add read receipts here if needed
});

// Handle chat presence (who's online in chat)
socket.on('chat-presence', async (data) => {
  try {
    const { chatId, isActive } = data;
    const userName = await getUserName(socket.userId);
    
    console.log(` ${userName} ${isActive ? 'joined' : 'left'} chat ${chatId}`);
    
    socket.to(`chat-${chatId}`).emit('user-presence', {
      userId: socket.userId,
      userName: userName,
      chatId: chatId,
      isActive: isActive,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat presence error:', error);
  }
});


    // Add this event handler for getting chat participants
    socket.on('get-chat-participants', async (data, callback) => {
      try {
        const { chatId } = data;
        
        // Check both Chat and FosterChat models
        let chat = await Chat.findById(chatId)
          .populate('participants.user', 'name email avatar');
        
        if (!chat) {
          chat = await FosterChat.findById(chatId)
            .populate('participants.user', 'name email avatar');
        }
    
        if (chat) {
          callback({ 
            success: true, 
            participants: chat.participants 
          });
        } else {
          callback({ success: false, error: 'Chat not found' });
        }
      } catch (error) {
        console.error('Get chat participants error:', error);
        callback({ success: false, error: error.message });
      }
    });


    socket.on('typing-start', async (data) => {
      try {
        const { chatId } = data;
        const userName = await getUserName(socket.userId);
        
        console.log(`⌨️ ${userName} started typing in chat ${chatId}`);
        
        socket.to(`chat-${chatId}`).emit('user-typing', {
          userId: socket.userId,
          userName: userName,
          chatId: chatId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Typing start error:', error);
      }
    });
    
    socket.on('typing-stop', async (data) => {
      try {
        const { chatId } = data;
        const userName = await getUserName(socket.userId);
        
        console.log(`⌨️ ${userName} stopped typing in chat ${chatId}`);
        
        socket.to(`chat-${chatId}`).emit('user-stop-typing', {
          userId: socket.userId,
          userName: userName,
          chatId: chatId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Typing stop error:', error);
      }
    });

// IMPROVED: Mark messages as read with better logging
socket.on('mark-messages-read', async (data) => {
  try {
    const { chatId } = data;
    
    console.log(` User ${socket.userId} marking messages as read in chat ${chatId}`);
    
    //  Check both Chat AND FosterChat models
    let chat = await Chat.findById(chatId);
    let chatModel = 'Chat';
    
    if (!chat) {
      chat = await FosterChat.findById(chatId);
      chatModel = 'FosterChat';
    }

    if (chat && chat.unreadCounts) {
      const previousCount = chat.unreadCounts.get(socket.userId.toString()) || 0;
      chat.unreadCounts.set(socket.userId.toString(), 0);
      await chat.save();
      console.log(`Unread counts reset for ${chatModel} chat ${chatId} (was: ${previousCount})`);
    }

    // Notify others that messages were read
    socket.to(`chat-${chatId}`).emit('messages-read', {
      userId: socket.userId,
      chatId: chatId,
      timestamp: new Date().toISOString()
    });

    console.log(` Messages marked as read in ${chatModel} chat ${chatId}`);

  } catch (error) {
    console.error('Mark messages read error:', error);
    socket.emit('error', { 
      message: 'Failed to mark messages as read',
      error: error.message 
    });
  }
});
    // test end

    // Test: Send immediate welcome message
    socket.emit('welcome', {
      message: 'Connected to real-time notifications & chat!',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });

    // Handle custom events
    socket.on('ping', (data) => {
      console.log(' Ping from user:', socket.userId, data);
      socket.emit('pong', { 
        message: 'Pong!', 
        timestamp: new Date().toISOString(),
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(' User disconnected:', socket.userId, 'Reason:', reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error for user', socket.userId, ':', error);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { setupSocket, getIO };
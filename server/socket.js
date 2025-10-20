const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message'); // Add this
const Chat = require('../models/chat'); // Add this

let io;

const setupSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: ["http://localhost:3000", "http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5001"],
      methods: ["GET", "POST"],
      credentials: true
    }
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
      
      // ✅ FIX: Match your existing JWT structure from auth.js
      // Your auth.js uses: req.user = decoded.user;
      // So your JWT tokens are probably: { user: { id: ..., ... } }
      
      let userId, userRole;
      
      if (decoded.user && decoded.user.id) {
        // Your current structure: { user: { id: ..., role: ... } }
        userId = decoded.user.id;
        userRole = decoded.user.role;
        console.log('✅ Using user.id structure');
      } else if (decoded.id) {
        // Fallback: direct id structure { id: ..., role: ... }
        userId = decoded.id;
        userRole = decoded.role;
        console.log('✅ Using direct id structure');
      } else {
        console.log('❌ Unrecognized token structure:', decoded);
        return next(new Error('Invalid token structure'));
      }
      
      if (!userId) {
        console.log('❌ No user ID found in token');
        return next(new Error('No user ID in token'));
      }
      
      socket.userId = userId;
      socket.userRole = userRole || 'adopter';
      
      console.log('✅ Socket authenticated - User ID:', socket.userId, 'Role:', socket.userRole);
      next();
      
    } catch (error) {
      console.error('❌ Socket auth failed:', error.message);
      next(new Error('Authentication failed: ' + error.message));
    }
  });
  io.on('connection', (socket) => {
    console.log('✅ User connected - ID:', socket.userId, 'Role:', socket.userRole, 'Socket:', socket.id);

    // Join user to their personal room
    socket.join(`user-${socket.userId}`);
    console.log(`📍 User ${socket.userId} joined room user-${socket.userId}`);


// test chat notification

// ✅ NEW: CHAT-RELATED EVENTS

    // Join specific chat room
    socket.on('join-chat', (chatId) => {
      socket.join(`chat-${chatId}`);
      console.log(`💬 User ${socket.userId} joined chat room: ${chatId}`);
      
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
      console.log(`💬 User ${socket.userId} left chat room: ${chatId}`);
    });

    // Send real-time message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, messageType = 'text' } = data;
        
        console.log(`💬 User ${socket.userId} sending message to chat ${chatId}:`, content);

        // Validate user has access to this chat
        const chat = await Chat.findOne({
          _id: chatId,
          'participants.user': socket.userId
        });

        if (!chat) {
          socket.emit('error', { message: 'No access to this chat' });
          return;
        }

        // Create and save message to database
        const message = new Message({
          chat: chatId,
          sender: socket.userId,
          content: content.trim(),
          messageType,
          // readBy: [socket.userId] // Sender has read their own message
          readBy: [{ 
            user: socket.userId,  // Use object format instead of direct string
            readAt: new Date()
          }]
        });

        await message.save();

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

        // Populate message for real-time emission
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name email role');

        // ✅ Broadcast to ALL participants in the chat room
        io.to(`chat-${chatId}`).emit('new-message', populatedMessage);

        // ✅ Also send notifications to users who are not currently in the chat
        chat.participants.forEach(participant => {
          if (participant.user.toString() !== socket.userId) {
            io.to(`user-${participant.user}`).emit('new-chat-notification', {
              chatId: chatId,
              message: content,
              sender: populatedMessage.sender.name,
              petName: chat.petName || 'a pet',
              timestamp: new Date().toISOString()
            });
          }
        });

        console.log(`✅ Message delivered to chat ${chatId}`);

      } catch (error) {
        console.error('❌ Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
      const { chatId } = data;
      socket.to(`chat-${chatId}`).emit('user-typing', {
        userId: socket.userId,
        userName: 'User', // You might want to fetch actual user name
        chatId: chatId
      });
    });

    socket.on('typing-stop', (data) => {
      const { chatId } = data;
      socket.to(`chat-${chatId}`).emit('user-stop-typing', {
        userId: socket.userId,
        chatId: chatId
      });
    });

    // Mark messages as read
    socket.on('mark-messages-read', async (data) => {
      try {
        const { chatId } = data;
        
        // Update unread counts in chat
        const chat = await Chat.findById(chatId);
        if (chat && chat.unreadCounts) {
          chat.unreadCounts.set(socket.userId.toString(), 0);
          await chat.save();
        }

        // Notify others that messages were read
        socket.to(`chat-${chatId}`).emit('messages-read', {
          userId: socket.userId,
          chatId: chatId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Mark messages read error:', error);
      }
    });


// test notification end




    // Test: Send immediate welcome message
    socket.emit('welcome', {
      message: 'Connected to real-time notifications & chat!',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });

    // Handle custom events
    socket.on('ping', (data) => {
      console.log('🏓 Ping from user:', socket.userId, data);
      socket.emit('pong', { 
        message: 'Pong!', 
        timestamp: new Date().toISOString(),
        userId: socket.userId
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.userId, 'Reason:', reason);
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
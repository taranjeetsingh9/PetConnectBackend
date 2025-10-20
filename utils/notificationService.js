// utils/notificationService.js
const Notification = require('../models/Notification');
const { getIO } = require('../server/socket');

// Notification types for consistent usage
const NOTIFICATION_TYPES = {
  ADOPTION_APPROVED: 'adoption_approved',
  ADOPTION_REJECTED: 'adoption_rejected',
  ADOPTION_FINALIZED: 'adoption_finalized',
  MEETING_SCHEDULED: 'meeting_scheduled',
  MEETING_CONFIRMED: 'meeting_confirmed',
  NEW_MESSAGE: 'new_message',
  SYSTEM_ANNOUNCEMENT: 'system_announcement'
};

/**
 * Create a new notification for a user
 */
// const createNotification = async (userId, type, message, meta = {}) => {
//   try {
//     const notification = new Notification({
//       user: userId,
//       type,
//       message,
//       meta, // Can store related entity IDs, pet info, etc.
//       read: false
//     });
    
//     await notification.save();
//     console.log(`✅ Notification created for user ${userId}: ${type}`);
    
//     return notification;
//   } catch (error) {
//     console.error('❌ Notification creation failed:', error);
//     throw error;
//   }
// };
// Update the createNotification function:
const createNotification = async (userId, type, message, meta = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      type,
      message,
      meta,
      read: false
    });
    
    await notification.save();
    console.log(`✅ Notification created for user ${userId}: ${type}`);
    
    // ✅ NEW: Emit real-time notification
    try {
      const io = getIO();
      const unreadCount = await Notification.countDocuments({ 
        user: userId, 
        read: false 
      });
      
      io.to(`user-${userId}`).emit('new-notification', {
        notification: {
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          meta: notification.meta,
          read: notification.read,
          createdAt: notification.createdAt
        },
        unreadCount
      });
      
      console.log(`📢 Real-time notification sent to user ${userId}`);
    } catch (socketError) {
      console.log('⚠️ Socket.io not available, notification saved to DB only');
    }
    
    return notification;
  } catch (error) {
    console.error('❌ Notification creation failed:', error);
    throw error;
  }
};
/**
 * Get all notifications for a user (latest first)
 */
const getUserNotifications = async (userId, limit = 20) => {
  try {
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name email'); // Optional: populate user details
    
    return notifications;
  } catch (error) {
    console.error('❌ Failed to fetch notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true }
    );
    
    return notification;
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true }
    );
    
    return result;
  } catch (error) {
    console.error('❌ Failed to mark all notifications as read:', error);
    throw error;
  }
};
// Temporary test - remove after verification
console.log('✅ Notification service loaded successfully');

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  NOTIFICATION_TYPES
};
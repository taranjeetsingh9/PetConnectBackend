const Notification = require('../models/Notification');


/**
 * Creates a notification document.
 * payload: { user, type, message, meta }
 * options: { emitSocket: true, socketIoInstance, sendEmail: false }
 */
// async function createNotification(payload, options = {}) {
//     const { user, type, message, meta } = payload;
  
//     if (!user || !type || !message) {
//       throw new Error('Notification requires user, type, and message.');
//     }
  
//     // Save in MongoDB
//     const notification = new Notification({
//       user,
//       type,
//       message,
//       meta,
//     });
  
//     await notification.save();
  
//     // Optional: emit via Socket.io
//     if (options.emitSocket && options.socketIoInstance) {
//       options.socketIoInstance.to(String(user)).emit('notification', {
//         id: notification._id,
//         type,
//         message,
//         meta,
//         createdAt: notification.createdAt,
//       });
//     }
  
//     // Optional: handle email later
//     if (options.sendEmail) {
//       console.log(`📧 Email notification queued for user ${user}: ${message}`);
//       // integrate Nodemailer / AWS SES / SendGrid later
//     }
  
//     return notification;
//   }

/**
 * Creates one or more notification documents.
 * payload: { user(s), type, message, meta }
 * options: { emitSocket: true, sendEmail: false }
 */

const { getIO } = require('../server/socket');


async function createNotification(payload, options = {}) {
  const { user, users, type, message, meta } = payload;

  if ((!user && !users) || !type || !message) {
    throw new Error('Notification requires user(s), type, and message.');
  }

  const userList = Array.isArray(users) ? users : [user];

  const notifications = await Promise.all(
    userList.map(async (userId) => {
      const notification = new Notification({
        user: userId,
        type,
        message,
        meta,
      });
      await notification.save();

      // Optional Socket.IO emit
      if (options.emitSocket) {
        try {
          const io = getIO();
          if (io) {
            io.to(`user-${userId}`).emit('notification', {
              id: notification._id,
              type,
              message,
              meta,
              createdAt: notification.createdAt,
            });
          } else {
            console.warn('⚠️ Socket.io instance not initialized yet.');
          }
        } catch (err) {
          console.error('Socket emission failed:', err.message);
        }
      }

      // Optional email placeholder
      if (options.sendEmail) {
        console.log(`📧 Email queued for user ${userId}: ${message}`);
      }

      return notification;
    })
  );

  return notifications;
}


  
  async function getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }
  
  async function markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { read: true } },
      { new: true }
    );
  }
  
  async function markAllAsRead(userId) {
    return Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );
  }
  
  async function deleteNotification(id, userId) {
    return Notification.findOneAndDelete({ _id: id, user: userId });
  }
  
  module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
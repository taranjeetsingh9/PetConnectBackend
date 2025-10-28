// services/notificationService.js
const Notification = require('../models/Notification');
const { getIO } = require('../server/socket');
const emailService = require('./emailService');

class NotificationService {
  /**
   * Create notification(s) for user(s)
   */
  static async create(payload, options = {}) {
    const { user, users, type, message, meta, priority = 'normal' } = payload;

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
          priority,
          read: false
        });
        
        await notification.save();

        // Real-time emission
        if (options.realTime !== false) {
          await this.emitRealTime(notification);
        }

        // // External integrations
        // if (options.sendEmail) {
        //   await this.queueEmail(notification);
        // }

        if (options.sendSMS) {
          await this.queueSMS(notification);
        }

        //email 
        if (options.sendEmail) {
          await this.sendEmailNotification(notificationData, options);
        }

        return notification;
      })
    );

    console.log(`✅ Created ${notifications.length} notification(s) for type: ${type}`);
    return notifications;
  }

  /**
   * Emit real-time notification via Socket.io
   */
  static async emitRealTime(notification) {
    try {
      const io = getIO();
      if (io) {
        const userRoom = `user-${notification.user}`;
        io.to(userRoom).emit('notification', {
          id: notification._id,
          type: notification.type,
          message: notification.message,
          meta: notification.meta,
          createdAt: notification.createdAt,
          priority: notification.priority
        });
        console.log(`📢 Real-time notification sent to ${userRoom}`);
      }
    } catch (err) {
      console.error('❌ Socket emission failed:', err.message);
    }
  }

  /**
   * Queue email for microservice (RabbitMQ/SQS ready)
   */
  static async queueEmail(notification) {
    // Microservice integration point
    console.log(`📧 Email queued for user ${notification.user}: ${notification.message}`);
    // await emailQueue.add('send-notification-email', { notification });
  }

  /**
   * Queue SMS for microservice
   */
  static async queueSMS(notification) {
    console.log(`📱 SMS queued for user ${notification.user}`);
    // await smsQueue.add('send-notification-sms', { notification });
  }

  /**
   * Get user notifications with pagination
   */
  static async getByUser(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    let query = { user: userId };
    if (unreadOnly) query.read = false;

    return Notification.find(query)
      .sort({ createdAt: -1, priority: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        } 
      },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        } 
      }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
    return result;
  }

  /**
   * Delete notification
   */
  static async delete(notificationId, userId) {
    return Notification.findOneAndDelete({ _id: notificationId, user: userId });
  }

  /**
   * Get unread count for user (for badges)
   */
  static async getUnreadCount(userId) {
    return Notification.countDocuments({ 
      user: userId, 
      read: false 
    });
  }

  /**
   * Clean up old notifications (cron job ready)
   */
  static async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
    return result;
  }

// email logic
/**
 * Send email notification based on type
 */
static async sendEmailNotification(notification, options) {
  try {
    const { type, user, message, meta } = notification;
    
    // Get user email and name (you'll need to implement this based on your User model)
    const userInfo = await this.getUserEmailInfo(user);
    
    if (!userInfo || !userInfo.email) {
      console.warn('No email found for user:', user);
      return;
    }

    switch (type) {
      case 'adoption_request_new':
        await emailService.sendAdoptionRequestEmail(
          userInfo.email,
          userInfo.name,
          meta.petName,
          meta.requestId
        );
        break;
        
      case 'adoption_approved':
        await emailService.sendAdoptionApprovedEmail(
          userInfo.email,
          userInfo.name,
          meta.petName,
          meta.chatId
        );
        break;
        
      case 'meeting_scheduled':
        await emailService.sendMeetingScheduledEmail(
          userInfo.email,
          userInfo.name,
          meta.petName,
          meta.meetingDate,
          meta.meetingType,
          meta.meetingLink
        );
        break;
        
      case 'agreement_sent':
        await emailService.sendAgreementEmail(
          userInfo.email,
          userInfo.name,
          meta.petName,
          meta.signUrl,
          7 // 7 days expiry
        );
        break;
        
      case 'agreement_signed':
        await emailService.sendAgreementSignedEmail(
          userInfo.email,
          userInfo.name,
          meta.petName
        );
        break;
        
      case 'payment_completed':
        await emailService.sendPaymentConfirmationEmail(
          userInfo.email,
          userInfo.name,
          meta.petName,
          meta.amount,
          meta.receiptUrl
        );
        break;
        
      case 'adoption_finalized':
        await emailService.sendAdoptionFinalizedEmail(
          userInfo.email,
          userInfo.name,
          meta.petName,
          meta.certificateUrl
        );
        break;
        
      default:
        // Send generic notification email for unhandled types
        await emailService.sendGenericNotificationEmail(
          userInfo.email,
          userInfo.name,
          message,
          type
        );
        break;
    }
    
    console.log(`📧 Email sent for ${type} to ${userInfo.email}`);
  } catch (error) {
    console.error('❌ Email notification failed:', error);
    // Don't throw - email failure shouldn't break the main flow
  }
}

/**
 * Get user email information
 */
static async getUserEmailInfo(userId) {
  try {
    // Replace with your actual User model and fields
    const User = require('../models/User');
    const user = await User.findById(userId).select('email name').lean();
    
    return {
      email: user?.email,
      name: user?.name || 'Pet Lover'
    };
  } catch (error) {
    console.error('Error fetching user email info:', error);
    return null;
  }
}




}

// Keep existing function exports for backward compatibility
const createNotification = NotificationService.create.bind(NotificationService);
const getUserNotifications = NotificationService.getByUser.bind(NotificationService);
const markAsRead = NotificationService.markAsRead.bind(NotificationService);
const markAllAsRead = NotificationService.markAllAsRead.bind(NotificationService);
const deleteNotification = NotificationService.delete.bind(NotificationService);

module.exports = {
  // Class export for new usage
  NotificationService,
  
  // Function exports for existing code
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

const Notification = require('../models/Notification');
const { getIO } = require('../server/socket');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const User = require('../models/User');


const getStaffUsers = async (organizationId) => {
  return await User.find({ 
    organization: organizationId, 
    role: 'staff' 
  }).select('_id name email');
};

/**
 * Enterprise notification dispatcher
 */
class Notifier {
  static async notifyUser({ user, type, message, meta = {} }, context = {}) {
    try {
      const io = context.io || getIO();
      
      if (!user || !type || !message) {
        throw new Error('Notification requires user, type, and message.');
      }

        // Save in MongoDB directly
        const notification = new Notification({
          user,
          type,
          message,
          meta,
        });
        await notification.save();


           // Handle Socket.io emission
      if (io) {
        io.to(String(user)).emit('notification', {
          id: notification._id,
          type,
          message,
          meta,
          createdAt: notification.createdAt,
        });
      }

      if (context.sendEmail) {
        console.log(`📧 Email notification queued for user ${user}: ${message}`);
        // integrate Nodemailer / AWS SES / SendGrid later
      }

      console.log(` Notification sent to user ${user}: ${type}`);
      return notification;
    } catch (error) {
      console.error(' Notifier error:', error.message);
      throw error; // Let caller handle errors
    }
  }

  static async notifyUsers(users, { type, message, meta = {} }, context = {}) {
    const notifications = await Promise.all(
      users.map(user => 
        this.notifyUser({ 
          user: user._id || user, 
          type, 
          message, 
          meta 
        }, context)
      )
    );
    return notifications;
  }

  // Specific notification methods for better DX
  static async notifyAdoptionRequest(pet, adopter, context = {}) {
    const staffUsers = await getStaffUsers(pet.organization);
    
    return this.notifyUsers(staffUsers, {
      type: NOTIFICATION_TYPES.ADOPTION_REQUEST_NEW,
      message: `New adoption request for ${pet.name}`,
      meta: { 
        petId: pet._id, 
        adopterId: adopter._id,
        action: 'review_request'
      }
    }, context);
  }

  static async notifyAdoptionApproved(request, context = {}) {
    return this.notifyUser({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.ADOPTION_APPROVED,
      message: ` Your adoption request for "${request.pet.name}" is approved!`,
      meta: { 
        petId: request.pet._id, 
        requestId: request._id,
        action: 'open_chat'
      }
    }, context);
  }
}

module.exports = Notifier;
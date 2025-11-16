const { AdoptionService } = require('./adoptionService');
const { NotificationService } = require('./notificationService');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');

class ReminderService {
  async sendMeetingReminders() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Find meetings happening in the next 24 hours
      const upcomingMeetings = await AdoptionRequest.find({
        'meeting.date': {
          $gte: now,
          $lte: tomorrow
        },
        'meeting.confirmed': true,
        'meeting.status': 'scheduled'
      })
      .populate('pet')
      .populate('adopter')
      .populate('meeting.staff');

      for (const request of upcomingMeetings) {
        const meeting = request.meeting;
        
        // Send reminder to adopter
        await NotificationService.create({
          user: request.adopter._id,
          type: NOTIFICATION_TYPES.MEETING_REMINDER,
          message: `Reminder: Your ${meeting.type} meeting for ${request.pet.name} is tomorrow at ${meeting.date.toLocaleString()}`,
          meta: {
            meetingDate: meeting.date,
            petId: request.pet._id,
            requestId: request._id,
            meetingType: meeting.type,
            meetingLink: meeting.meetingLink,
            action: 'view_meeting_preparation'
          }
        }, { realTime: true, sendEmail: true });

        // Send reminder to staff
        await NotificationService.create({
          user: meeting.staff._id,
          type: NOTIFICATION_TYPES.MEETING_REMINDER,
          message: `Reminder: You have a ${meeting.type} meeting with ${request.adopter.name} for ${request.pet.name} tomorrow`,
          meta: {
            meetingDate: meeting.date,
            petId: request.pet._id,
            requestId: request._id,
            adopterName: request.adopter.name,
            action: 'view_meeting_details'
          }
        }, { realTime: true });
        
        console.log(` Sent reminders for meeting: ${request._id}`);
      }
      
      return { sent: upcomingMeetings.length };
    } catch (error) {
      console.error('Error sending reminders:', error);
      throw error;
    }
  }
}

module.exports = new ReminderService();
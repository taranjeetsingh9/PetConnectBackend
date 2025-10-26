// services/adoptionService.js
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Chat = require('../models/chat');
const { NotificationService } = require('../services/notificationService');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');
const ADOPTION_STATUS = require('../constants/adoptionStatus');
const availabilityService = require('./availabilityService');
const Availability = require('../models/Availability');


const createError = (msg, status = 400) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

// Helper function (can also be moved inside the class as private)
const getStaffUsers = async (organizationId) => {
  return await User.find({ organization: organizationId, role: 'staff' }).select('_id name email');
};

class AdoptionService {
  async getMyRequests(userId) {
    const requests = await AdoptionRequest.find({ adopter: userId })
      .populate('pet', 'name breed age gender status images')
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    return requests.filter(r => r.pet !== null);
  }

  async requestAdoption(user, petId) {
    const pet = await Pet.findById(petId).populate('organization');
    if (!pet) throw createError('Pet not found', 404);
    if (pet.status !== 'Available') throw createError('Pet is not available', 400);

    const existing = await AdoptionRequest.findOne({ pet: pet._id, adopter: user.id });
    if (existing) throw createError('You have already requested this pet', 400);

    const request = await new AdoptionRequest({
      pet: pet._id,
      adopter: user.id,
      organization: pet.organization._id
    }).save();

    const staffUsers = await getStaffUsers(pet.organization._id);

    await NotificationService.create({
      users: staffUsers.map(s => s._id.toString()),
      type: NOTIFICATION_TYPES.ADOPTION_REQUEST_NEW,
      message: `New adoption request for ${pet.name}`,
      meta: { petId: pet._id.toString(), adopterId: user.id.toString(), requestId: request._id.toString(), action: 'review_request' }
    }, { realTime: true });

    return { msg: 'Adoption request submitted', request };
  }

  // async updateRequestStatus(user, requestId, body) {
  //   const { status: rawStatus, meetingDate } = body;
  //   if (!rawStatus) throw createError('Status is required');

  //   const status = String(rawStatus).toLowerCase();
  //   const ALLOWED = [ ADOPTION_STATUS.APPROVED,
  //     ADOPTION_STATUS.IGNORED,
  //     ADOPTION_STATUS.REJECTED,
  //     ADOPTION_STATUS.ON_HOLD,
  //     ADOPTION_STATUS.FINALIZED,
  //     ADOPTION_STATUS.MEETING,
  //     ADOPTION_STATUS.CHAT ];
  //   if (!ALLOWED.includes(status)) throw createError('Invalid status value');


  //   const request = await AdoptionRequest.findById(requestId)
  //     .populate('pet')
  //     .populate('adopter')
  //     .populate('organization');
  //   if (!request) throw createError('Adoption request not found', 404);

  //   const staff = await User.findById(user.id).select('organization');
  //   if (!staff || !staff.organization || String(request.organization._id) !== String(staff.organization)) {
  //     throw createError('Not authorized to manage this request', 403);
  //   }

  //   // Handle ignored/rejected
  //   if ([ADOPTION_STATUS.IGNORED, ADOPTION_STATUS.REJECTED].includes(status)) {
  //     request.status = status;
  //     await request.save();
  //     await NotificationService.create({
  //       user: request.adopter._id,
  //       type: NOTIFICATION_TYPES.ADOPTION_REJECTED,
  //       message: `Your adoption request for "${request.pet.name}" was ${status}.`,
  //       meta: { petId: request.pet._id, requestId: request._id, action: 'browse_other_pets' }
  //     }, { realTime: true });
  //     return { msg: `Request ${status}`, request };
  //   }

  //   // Handle approved
  //   if (status === ADOPTION_STATUS.APPROVED) {
  //     request.status = ADOPTION_STATUS.APPROVED;
  //     await request.save();
  //     await AdoptionRequest.updateMany(
  //       { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: [ADOPTION_STATUS.PENDING, ADOPTION_STATUS.ON_HOLD] } },
  //       { $set: { status: ADOPTION_STATUS.PENDING } }
  //     );

  //     const staffMembers = await getStaffUsers(request.organization._id);
  //     const participants = [{ user: request.adopter._id, role: 'adopter' }, ...staffMembers.map(s => ({ user: s._id, role: 'staff' }))];

  //     const chat = await new Chat({
  //       participants,
  //       adoptionRequest: request._id,
  //       lastMessage: `Chat started for ${request.pet.name}'s adoption process`,
  //       lastMessageAt: new Date()
  //     }).save();

  //     await NotificationService.create({
  //       user: request.adopter._id,
  //       type: NOTIFICATION_TYPES.ADOPTION_APPROVED,
  //       message: `Your adoption request for "${request.pet.name}" is approved! You can now chat with staff.`,
  //       meta: { petId: request.pet._id, requestId: request._id, chatId: chat._id, action: 'open_chat' }
  //     }, { realTime: true });

  //     return { msg: 'Request approved. Chat created.', request };
  //   }

  //   // Handle meeting
  //   if (status === ADOPTION_STATUS.MEETING) {
  //     if (!meetingDate) throw createError('Meeting date is required');
  //     request.status = ADOPTION_STATUS.MEETING;
  //     request.meeting = { date: new Date(meetingDate), confirmed: false };
  //     await request.save();
  //     await NotificationService.create({
  //       user: request.adopter._id,
  //       type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
  //       message: `Meeting scheduled for "${request.pet.name}" on ${new Date(meetingDate).toLocaleString()}.`,
  //       meta: { meetingDate, petId: request.pet._id, requestId: request._id, action: 'confirm_meeting' }
  //     }, { realTime: true });
  //     return { msg: 'Meeting scheduled', request };
  //   }

  //   // Handle finalized
  //   if (status === ADOPTION_STATUS.FINALIZED) {
  //     request.status = ADOPTION_STATUS.FINALIZED;
  //     await request.save();

  //     const updatedPet = await Pet.findByIdAndUpdate(
  //       request.pet._id,
  //       { $set: { status: 'Adopted', adopter: request.adopter._id } },
  //       { new: true }
  //     );

  //     await AdoptionRequest.updateMany(
  //       { pet: request.pet._id, _id: { $ne: request._id }, status: { $nin:[ADOPTION_STATUS.FINALIZED, ADOPTION_STATUS.REJECTED]} },
  //       { $set: { status: ADOPTION_STATUS.REJECTED } }
  //     );

  //     await NotificationService.create({
  //       user: request.adopter._id,
  //       type: NOTIFICATION_TYPES.ADOPTION_FINALIZED,
  //       message: `Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
  //       meta: { petId: request.pet._id, requestId: request._id, action: 'view_pet_profile' }
  //     }, { realTime: true, sendEmail: true });

  //     return { msg: 'Adoption finalized', request, pet: updatedPet };
  //   }

  //   return { msg: 'Status updated', request };
  // }

  // consistent version of updateRequestStatus
  
  async updateRequestStatus(user, requestId, body) {
    const { status: rawStatus, meetingDate } = body;
    if (!rawStatus) throw createError('Status is required');
  
    const status = String(rawStatus).toLowerCase();
    const ALLOWED = [
      ADOPTION_STATUS.APPROVED,
      ADOPTION_STATUS.IGNORED,
      ADOPTION_STATUS.REJECTED,
      ADOPTION_STATUS.ON_HOLD,
      ADOPTION_STATUS.FINALIZED,
      ADOPTION_STATUS.MEETING,
      ADOPTION_STATUS.CHAT
    ];
    if (!ALLOWED.includes(status)) throw createError('Invalid status value');
  
    // Fetch adoption request
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');
    if (!request) throw createError('Adoption request not found', 404);
  
    // Verify staff permission
    const staff = await User.findById(user.id).select('organization');
    if (!staff || !staff.organization || String(request.organization._id) !== String(staff.organization)) {
      throw createError('Not authorized to manage this request', 403);
    }
  
    // Prepare default return object
    const result = {
      success: true,
      msg: '',
      request,
      pet: null,
      chat: null
    };
  
    // --- Handle IGNORED / REJECTED ---
    if ([ADOPTION_STATUS.IGNORED, ADOPTION_STATUS.REJECTED].includes(status)) {
      request.status = status;
      await request.save();
  
      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_REJECTED,
        message: `Your adoption request for "${request.pet.name}" was ${status}.`,
        meta: { petId: request.pet._id, requestId: request._id, action: 'browse_other_pets' }
      }, { realTime: true });
  
      result.msg = `Request ${status}`;
      return result;
    }
  
    // --- Handle APPROVED ---
    if (status === ADOPTION_STATUS.APPROVED) {
      request.status = ADOPTION_STATUS.APPROVED;
      await request.save();
  
      // Put other requests for the same pet on hold
      await AdoptionRequest.updateMany(
        { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: ['pending', ADOPTION_STATUS.ON_HOLD] } },
        { $set: { status: ADOPTION_STATUS.ON_HOLD } }
      );
  
      // Create chat for adopter + staff
      const staffMembers = await getStaffUsers(request.organization._id);
      const participants = [{ user: request.adopter._id, role: 'adopter' }, ...staffMembers.map(s => ({ user: s._id, role: 'staff' }))];
  
      const chat = await new Chat({
        participants,
        adoptionRequest: request._id,
        lastMessage: `Chat started for ${request.pet.name}'s adoption process`,
        lastMessageAt: new Date()
      }).save();
  
      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_APPROVED,
        message: `Your adoption request for "${request.pet.name}" is approved! You can now chat with staff.`,
        meta: { petId: request.pet._id, requestId: request._id, chatId: chat._id, action: 'open_chat' }
      }, { realTime: true });
  
      result.msg = 'Request approved. Chat created.';
      result.chat = chat;
      return result;
    }
  
    // --- Handle MEETING ---
    if (status === ADOPTION_STATUS.MEETING) {
      if (!meetingDate) throw createError('Meeting date is required');
  
      request.status = ADOPTION_STATUS.MEETING;
      request.meeting = { date: new Date(meetingDate), confirmed: false };
      await request.save();
  
      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
        message: `Meeting scheduled for "${request.pet.name}" on ${new Date(meetingDate).toLocaleString()}.`,
        meta: { meetingDate, petId: request.pet._id, requestId: request._id, action: 'confirm_meeting' }
      }, { realTime: true });
  
      result.msg = 'Meeting scheduled';
      return result;
    }
  
    // --- Handle FINALIZED ---
    if (status === ADOPTION_STATUS.FINALIZED) {
      request.status = ADOPTION_STATUS.FINALIZED;
      await request.save();
  
      const updatedPet = await Pet.findByIdAndUpdate(
        request.pet._id,
        { $set: { status: 'Adopted', adopter: request.adopter._id } },
        { new: true }
      );
  
      // Reject all other pending requests for the same pet
      await AdoptionRequest.updateMany(
        { pet: request.pet._id, _id: { $ne: request._id }, status: { $nin: [ADOPTION_STATUS.FINALIZED, ADOPTION_STATUS.REJECTED] } },
        { $set: { status: ADOPTION_STATUS.REJECTED } }
      );
  
      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_FINALIZED,
        message: `Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
        meta: { petId: request.pet._id, requestId: request._id, action: 'view_pet_profile' }
      }, { realTime: true, sendEmail: true });
  
      result.msg = 'Adoption finalized';
      result.pet = updatedPet;
      return result;
    }
  
    // --- Handle CHAT or other allowed statuses ---
    request.status = status;
    await request.save();
    result.msg = 'Status updated';
    return result;
  }

  async confirmMeeting(user, requestId, notes) {
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');
    if (!request) throw createError('Adoption request not found', 404);
    if (request.adopter._id.toString() !== user.id) throw createError('Not authorized', 403);
    if (request.status !== 'meeting' || !request.meeting?.date) throw createError('No meeting scheduled');

    request.meeting.confirmed = true;
    request.meeting.confirmedAt = new Date();
    request.meeting.adopterNotes = notes;
    await request.save();

    const staffUsers = await getStaffUsers(request.organization._id);

    await NotificationService.create({
      users: staffUsers.map(s => s._id),
      type: NOTIFICATION_TYPES.MEETING_CONFIRMED,
      message: `${request.adopter.name} confirmed meeting for ${request.pet.name} on ${request.meeting.date.toLocaleString()}`,
      meta: { meetingDate: request.meeting.date, petId: request.pet._id, requestId: request._id, action: 'view_meeting_details' }
    }, { realTime: true });

    return { msg: 'Meeting confirmed successfully', request };
  }

  async sendMeetingReminder(requestId) {
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter');
    if (!request) throw createError('Adoption request not found', 404);
    if (request.status !== 'meeting' || !request.meeting?.date) throw createError('No meeting scheduled');

    await NotificationService.create({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.MEETING_REMINDER,
      message: `Reminder: Your meeting for ${request.pet.name} is scheduled for ${request.meeting.date.toLocaleString()}.`,
      meta: { petId: request.pet._id, requestId: request._id, meetingDate: request.meeting.date, action: 'confirm_meeting' }
    }, { realTime: true, sendEmail: true });

    return { msg: 'Meeting reminder sent', adopter: request.adopter.email, meetingDate: request.meeting.date };
  }

  async getMyAdoptedPets(adopterId) {
    const adoptedPets = await AdoptionRequest.find({
      adopter: adopterId,
      status: { $in: ['approved', 'finalized', 'meeting'] }
    })
    .populate('pet', 'name breed images status')
    .sort({ updatedAt: -1 });

    const pets = adoptedPets.map(r => r.pet);
    return { success: true, count: pets.length, pets };
  }

  async getOrganizationRequests(userId) {
    const staff = await User.findById(userId).select('organization');
    if (!staff || !staff.organization) throw createError('Staff does not belong to an organization', 403);

    const requests = await AdoptionRequest.find({ organization: staff.organization })
      .populate({
        path: 'pet',
        match: { organization: staff.organization, isDeleted: { $ne: true } },
        select: 'name breed status images'
      })
      .populate('adopter', 'name email location')
      .sort({ createdAt: -1 });

    return requests.filter(r => r.pet !== null);
  }

// /**
//  * Schedule a meeting for an adoption request
//  * @param {Object} user - adopter user object  
//  * @param {String} requestId - adoption request id
//  * @param {String} staffId - staff/vet/trainer id
//  * @param {Object} slot - { day: 'Monday', startTime: '10:00', endTime: '11:00', date: '2025-10-27' }
//  */
// async scheduleMeeting(user, requestId, staffId, slot) {
//   console.log('📅 Schedule meeting called:', { requestId, staffId, slot });
  
//   // 1. Fetch adoption request
//   const request = await AdoptionRequest.findById(requestId)
//     .populate('pet')
//     .populate('adopter')
//     .populate('organization');
//   if (!request) throw createError('Adoption request not found', 404);
//   if (request.adopter._id.toString() !== user.id) throw createError('Not authorized', 403);

//   // 2. Validate slot has required fields
//   if (!slot.date || !slot.startTime || !slot.endTime) {
//     throw createError('Slot must have date, startTime, and endTime');
//   }

//   // 3. Verify the staff actually has this availability slot
//   const staffAvailability = await Availability.findOne({ 
//     user: staffId,
//     'slots.date': new Date(slot.date),
//     'slots.startTime': slot.startTime,
//     'slots.endTime': slot.endTime
//   });

//   if (!staffAvailability) {
//     throw createError('Selected time slot is not available or has been booked by someone else');
//   }

//   // 4. Create meeting date by combining slot.date and slot.startTime
//   const meetingDate = new Date(slot.date);
//   const [hours, minutes] = slot.startTime.split(':').map(Number);
//   meetingDate.setHours(hours, minutes, 0, 0);

//   // Validate the date
//   if (isNaN(meetingDate.getTime())) {
//     throw createError('Invalid meeting date');
//   }

//   // 5. Check if meeting date is in the future
//   if (meetingDate < new Date()) {
//     throw createError('Cannot schedule meeting in the past');
//   }

//   // 6. Check for conflicts with other meetings for this staff member
//   const conflict = await AdoptionRequest.findOne({
//     'meeting.date': {
//       $gte: new Date(meetingDate.getTime() - 30 * 60 * 1000), // 30 minutes before
//       $lte: new Date(meetingDate.getTime() + 30 * 60 * 1000)  // 30 minutes after
//     },
//     _id: { $ne: requestId } // Exclude current request
//   });

//   if (conflict) {
//     throw new Error('This time slot is already booked. Please choose another time.');
//   }

//   // 7. Remove the booked slot from staff's availability
//   await Availability.findOneAndUpdate(
//     { user: staffId },
//     { 
//       $pull: { 
//         slots: {
//           date: new Date(slot.date),
//           startTime: slot.startTime,
//           endTime: slot.endTime
//         }
//       } 
//     }
//   );

//   // 8. Save meeting details to adoption request
//   request.status = 'meeting';
//   request.meeting = {
//     date: meetingDate,
//     confirmed: false
//   };
  
//   await request.save();

//   // 9. Notify adopter
//   await NotificationService.create({
//     user: request.adopter._id,
//     type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
//     message: `Meeting scheduled for "${request.pet.name}" on ${meetingDate.toLocaleString()}`,
//     meta: { 
//       meetingDate: meetingDate, 
//       petId: request.pet._id, 
//       requestId: request._id, 
//       action: 'confirm_meeting' 
//     }
//   }, { realTime: true });

//   // 10. Notify staff
//   await NotificationService.create({
//     user: staffId,
//     type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
//     message: `You have a new meeting scheduled with "${request.adopter.name}" for pet "${request.pet.name}" on ${meetingDate.toLocaleString()}`,
//     meta: { 
//       meetingDate: meetingDate, 
//       petId: request.pet._id, 
//       requestId: request._id, 
//       action: 'view_meeting' 
//     }
//   }, { realTime: true });

//   console.log('✅ Meeting scheduled successfully');
//   return { 
//     success: true,
//     msg: 'Meeting scheduled successfully', 
//     request 
//   };
// }

async scheduleMeeting(user, requestId, staffId, slot) {
  try {
    console.log('📅 Schedule meeting called:', { requestId, staffId, slot });

    // 1. Fetch adoption request
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');
    if (!request) throw createError('Adoption request not found', 404);
    if (request.adopter._id.toString() !== user.id) throw createError('Not authorized', 403);

    // 2. Validate slot has required fields
    if (!slot.date || !slot.startTime || !slot.endTime) {
      throw createError('Slot must have date, startTime, and endTime');
    }

    // 3. Create meeting date by combining slot.date and slot.startTime
    const meetingDate = new Date(slot.date);
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    meetingDate.setHours(hours, minutes, 0, 0);

    // Validate the date
    if (isNaN(meetingDate.getTime())) {
      throw createError('Invalid meeting date');
    }

    // 4. Check if meeting date is in the future
    if (meetingDate < new Date()) {
      throw createError('Cannot schedule meeting in the past');
    }

    // 5. Update with meeting details
    request.status = ADOPTION_STATUS.MEETING;
    request.meeting = {
      date: meetingDate,
      staff: staffId, // Store staff ID
      startTime: slot.startTime,
      endTime: slot.endTime,
      confirmed: false,
      scheduledAt: new Date()
    };

    await request.save();

    // 6. Notify adopter
    await NotificationService.create({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
      message: `Meeting scheduled for "${request.pet.name}" on ${meetingDate.toLocaleString()}`,
      meta: { 
        meetingDate: meetingDate, 
        petId: request.pet._id, 
        requestId: request._id, 
        action: 'confirm_meeting' 
      }
    }, { realTime: true });

    // 7. Notify staff
    await NotificationService.create({
      user: staffId,
      type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
      message: `You have a new meeting scheduled with "${request.adopter.name}" for pet "${request.pet.name}" on ${meetingDate.toLocaleString()}`,
      meta: { 
        meetingDate: meetingDate, 
        petId: request.pet._id, 
        requestId: request._id, 
        action: 'view_meeting' 
      }
    }, { realTime: true });

    console.log('✅ Meeting scheduled successfully');
    return { 
      success: true,
      msg: 'Meeting scheduled successfully', 
      request 
    };

  } catch (error) {
    console.error('❌ Error in scheduleMeeting:', error);
    throw error; // Re-throw the error
  }
}


}

// Singleton instance for backward compatibility
const adoptionService = new AdoptionService();

module.exports = {
  AdoptionService,
  adoptionService,

  // Legacy bindings for production
  getMyRequests: adoptionService.getMyRequests.bind(adoptionService),
  requestAdoption: adoptionService.requestAdoption.bind(adoptionService),
  updateRequestStatus: adoptionService.updateRequestStatus.bind(adoptionService),
  confirmMeeting: adoptionService.confirmMeeting.bind(adoptionService),
  sendMeetingReminder: adoptionService.sendMeetingReminder.bind(adoptionService),
  getMyAdoptedPets: adoptionService.getMyAdoptedPets.bind(adoptionService),
  getOrganizationRequests: adoptionService.getOrganizationRequests.bind(adoptionService),
  scheduleMeeting: adoptionService.scheduleMeeting.bind(adoptionService)
};

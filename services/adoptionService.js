// services/adoptionService.js
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Chat = require('../models/chat');
const { NotificationService } = require('../services/notificationService');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');

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

  async updateRequestStatus(user, requestId, body) {
    const { status: rawStatus, meetingDate } = body;
    if (!rawStatus) throw createError('Status is required');

    const status = String(rawStatus).toLowerCase();
    const ALLOWED = ['approved', 'ignored', 'rejected', 'on-hold', 'finalized', 'chat', 'meeting'];
    if (!ALLOWED.includes(status)) throw createError('Invalid status value');

    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');
    if (!request) throw createError('Adoption request not found', 404);

    const staff = await User.findById(user.id).select('organization');
    if (!staff || !staff.organization || String(request.organization._id) !== String(staff.organization)) {
      throw createError('Not authorized to manage this request', 403);
    }

    // Handle ignored/rejected
    if (['ignored', 'rejected'].includes(status)) {
      request.status = status;
      await request.save();
      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_REJECTED,
        message: `Your adoption request for "${request.pet.name}" was ${status}.`,
        meta: { petId: request.pet._id, requestId: request._id, action: 'browse_other_pets' }
      }, { realTime: true });
      return { msg: `Request ${status}`, request };
    }

    // Handle approved
    if (status === 'approved') {
      request.status = 'approved';
      await request.save();
      await AdoptionRequest.updateMany(
        { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: ['pending', 'on-hold'] } },
        { $set: { status: 'on-hold' } }
      );

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

      return { msg: 'Request approved. Chat created.', request };
    }

    // Handle meeting
    if (status === 'meeting') {
      if (!meetingDate) throw createError('Meeting date is required');
      request.status = 'meeting';
      request.meeting = { date: new Date(meetingDate), confirmed: false };
      await request.save();
      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
        message: `Meeting scheduled for "${request.pet.name}" on ${new Date(meetingDate).toLocaleString()}.`,
        meta: { meetingDate, petId: request.pet._id, requestId: request._id, action: 'confirm_meeting' }
      }, { realTime: true });
      return { msg: 'Meeting scheduled', request };
    }

    // Handle finalized
    if (status === 'finalized') {
      request.status = 'finalized';
      await request.save();

      const updatedPet = await Pet.findByIdAndUpdate(
        request.pet._id,
        { $set: { status: 'Adopted', adopter: request.adopter._id } },
        { new: true }
      );

      await AdoptionRequest.updateMany(
        { pet: request.pet._id, _id: { $ne: request._id }, status: { $nin: ['finalized', 'rejected'] } },
        { $set: { status: 'rejected' } }
      );

      await NotificationService.create({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_FINALIZED,
        message: `Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
        meta: { petId: request.pet._id, requestId: request._id, action: 'view_pet_profile' }
      }, { realTime: true, sendEmail: true });

      return { msg: 'Adoption finalized', request, pet: updatedPet };
    }

    return { msg: 'Status updated', request };
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
  getOrganizationRequests: adoptionService.getOrganizationRequests.bind(adoptionService)
};

// services/adoptionService.js
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Chat = require('../models/chat');
const Notifier = require('../utils/notifier');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');

// Helper
const getStaffUsers = async (organizationId) => {
  return await User.find({ organization: organizationId, role: 'staff' }).select('_id name email');
};

exports.requestAdoption = async (user, petId) => {
  const pet = await Pet.findById(petId).populate('organization');
  if (!pet) throw { status: 404, message: 'Pet not found' };
  if (pet.status !== 'Available') throw { status: 400, message: 'Pet is not available' };

  const existing = await AdoptionRequest.findOne({ pet: pet._id, adopter: user.id });
  if (existing) throw { status: 400, message: 'You have already requested this pet' };

  const request = await new AdoptionRequest({
    pet: pet._id,
    adopter: user.id,
    organization: pet.organization._id
  }).save();

  const staffUsers = await getStaffUsers(pet.organization._id);
  await Notifier.notifyUsers(staffUsers, {
    type: NOTIFICATION_TYPES.ADOPTION_REQUEST_NEW,
    message: `New adoption request for ${pet.name}`,
    meta: { petId: pet._id, adopterId: user.id, requestId: request._id, action: 'review_request' }
  });

  return { msg: 'Adoption request submitted', request };
};

exports.getOrganizationRequests = async (userId) => {
  const staff = await User.findById(userId).select('organization');
  if (!staff || !staff.organization) throw { status: 403, message: 'Staff does not belong to an organization' };

  const requests = await AdoptionRequest.find({ organization: staff.organization })
    .populate({
      path: 'pet',
      match: { organization: staff.organization, _id: { $exists: true } },
      select: 'name breed status images'
    })
    .populate('adopter', 'name email location')
    .sort({ createdAt: -1 });

  return requests.filter(req => req.pet !== null);
};

exports.updateRequestStatus = async (user, requestId, body) => {
  const { status: rawStatus, meetingDate } = body;
  if (!rawStatus) throw { status: 400, message: 'Status is required' };
  
  const status = String(rawStatus).toLowerCase();
  const ALLOWED = ['approved', 'ignored', 'rejected', 'on-hold', 'finalized', 'chat', 'meeting'];
  if (!ALLOWED.includes(status)) throw { status: 400, message: 'Invalid status value' };

  const request = await AdoptionRequest.findById(requestId)
    .populate('pet')
    .populate('adopter')
    .populate('organization');
  if (!request) throw { status: 404, message: 'Adoption request not found' };

  const staff = await User.findById(user.id).select('organization');
  if (!staff || !staff.organization || String(request.organization._id) !== String(staff.organization)) {
    throw { status: 403, message: 'Not authorized to manage this request' };
  }

  // CASE HANDLING
  if (['ignored', 'rejected'].includes(status)) {
    request.status = status;
    await request.save();
    await Notifier.notifyUser({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.ADOPTION_REJECTED,
      message: `Your adoption request for "${request.pet.name}" was ${status}.`,
      meta: { petId: request.pet._id, requestId: request._id, action: 'browse_other_pets' }
    });
    return { msg: `Request ${status}`, request };
  }

  if (status === 'approved') {
    request.status = 'approved';
    await request.save();
    await AdoptionRequest.updateMany(
      { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: ['pending', 'on-hold'] } },
      { $set: { status: 'on-hold' } }
    );

    const staffMembers = await getStaffUsers(request.organization._id);
    const participants = [
      { user: request.adopter._id, role: 'adopter' },
      ...staffMembers.map(s => ({ user: s._id, role: 'staff' }))
    ];

    const chat = await new Chat({
      participants,
      adoptionRequest: request._id,
      lastMessage: `Chat started for ${request.pet.name}'s adoption process`,
      lastMessageAt: new Date()
    }).save();

    await Notifier.notifyUser({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.ADOPTION_APPROVED,
      message: `Your adoption request for "${request.pet.name}" is approved! You can now chat with staff.`,
      meta: { petId: request.pet._id, requestId: request._id, chatId: chat._id, action: 'open_chat' }
    });

    return { msg: 'Request approved. Chat created.', request };
  }

  if (status === 'meeting') {
    if (!meetingDate) throw { status: 400, message: 'Meeting date is required' };
    request.status = 'meeting';
    request.meeting = { date: new Date(meetingDate), confirmed: false };
    await request.save();

    await Notifier.notifyUser({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
      message: `Meeting scheduled for "${request.pet.name}" on ${new Date(meetingDate).toLocaleString()}.`,
      meta: { meetingDate, petId: request.pet._id, requestId: request._id, action: 'confirm_meeting' }
    });

    return { msg: 'Meeting scheduled', request };
  }

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

    await Notifier.notifyUser({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.ADOPTION_FINALIZED,
      message: ` Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
      meta: { petId: request.pet._id, requestId: request._id, action: 'view_pet_profile' }
    }, { sendEmail: true });

    return { msg: 'Adoption finalized', request, pet: updatedPet };
  }

  return { msg: 'Status updated', request };
};

exports.getMyRequests = async (userId) => {
  return await AdoptionRequest.find({ adopter: userId })
    .populate('pet', 'name breed age gender status images')
    .populate('organization', 'name')
    .sort({ createdAt: -1 });
};

exports.confirmMeeting = async (user, requestId, notes) => {
  const request = await AdoptionRequest.findById(requestId)
    .populate('pet')
    .populate('adopter')
    .populate('organization');

  if (!request) throw { status: 404, message: 'Adoption request not found' };
  if (request.adopter._id.toString() !== user.id) throw { status: 403, message: 'Not authorized' };
  if (request.status !== 'meeting' || !request.meeting?.date) throw { status: 400, message: 'No meeting scheduled' };

  request.meeting.confirmed = true;
  request.meeting.confirmedAt = new Date();
  request.meeting.adopterNotes = notes;
  await request.save();

  const staffUsers = await getStaffUsers(request.organization._id);
  await Notifier.notifyUsers(staffUsers, {
    type: NOTIFICATION_TYPES.MEETING_CONFIRMED,
    message: `${request.adopter.name} confirmed meeting for ${request.pet.name} on ${request.meeting.date.toLocaleString()}`,
    meta: { meetingDate: request.meeting.date, petId: request.pet._id, requestId: request._id, action: 'view_meeting_details' }
  });

  return { msg: 'Meeting confirmed successfully', request };
};

exports.sendMeetingReminder = async (requestId) => {
  const request = await AdoptionRequest.findById(requestId)
    .populate('pet')
    .populate('adopter');
  if (!request) throw { status: 404, message: 'Adoption request not found' };
  if (request.status !== 'meeting' || !request.meeting?.date) throw { status: 400, message: 'No meeting scheduled' };

  await Notifier.notifyUser({
    user: request.adopter._id,
    type: NOTIFICATION_TYPES.MEETING_REMINDER,
    message: ` Reminder: Your meeting for ${request.pet.name} is scheduled for ${request.meeting.date.toLocaleString()}.`,
    meta: { petId: request.pet._id, requestId: request._id, meetingDate: request.meeting.date, action: 'confirm_meeting' }
  }, { sendEmail: true });

  return { msg: 'Meeting reminder sent', adopter: request.adopter.email, meetingDate: request.meeting.date };
};


exports.getMyAdoptedPets = async (adopterId) => {
  try {
      console.log(`🐾 Adopter ${adopterId} fetching their adopted pets`);
      
      // Find adoption requests that are approved or finalized
      const adoptedPets = await AdoptionRequest.find({
          adopter: adopterId,
          status: { $in: ['approved', 'finalized', 'meeting'] }
      })
      .populate('pet', 'name breed age images status')
      .sort({ updatedAt: -1 });

      const pets = adoptedPets.map(request => request.pet);

      return {
          success: true,
          count: pets.length,
          pets
      };
  } catch (error) {
      console.error('Get adopted pets service error:', error);
      return { 
          success: false,
          msg: 'Server error while fetching adopted pets',
          status: 500
      };
  }
};

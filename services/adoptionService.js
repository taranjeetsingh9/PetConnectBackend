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
const AdoptionAgreement = require('../models/AdoptionAgreement');
const Payment = require('../models/Payment'); 
const Document = require('../models/Document');


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
      .populate('organization')
    
    if (!request) throw createError('Adoption request not found', 404);
    if (request.adopter._id.toString() !== user.id) throw createError('Not authorized', 403);
    if (request.status !== 'meeting' || !request.meeting?.date) throw createError('No meeting scheduled');
  
    // Generate meeting preparation guide based on type
    const preparationGuide = this.generatePreparationGuide(request.meeting.type, request.pet);
  
    request.meeting.confirmed = true;
    request.meeting.confirmedAt = new Date();
    request.meeting.adopterNotes = notes;
    request.meeting.preparationGuide = preparationGuide; // Store preparation info
    await request.save();
  
    const staffUsers = await getStaffUsers(request.organization._id);
  
    // Enhanced notification with preparation info
    await NotificationService.create({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.MEETING_CONFIRMED,
      message: `Your ${request.meeting.type} meeting for "${request.pet.name}" is confirmed!`,
      meta: { 
        meetingDate: request.meeting.date, 
        petId: request.pet._id, 
        requestId: request._id, 
        meetingType: request.meeting.type,
        meetingLink: request.meeting.meetingLink,
        preparationGuide: preparationGuide,
        action: 'view_meeting_preparation'
      }
    }, { realTime: true });
  
    // Notify staff with preparation info
    await NotificationService.create({
      users: staffUsers.map(s => s._id),
      type: NOTIFICATION_TYPES.MEETING_CONFIRMED,
      message: `${request.adopter.name} confirmed ${request.meeting.type} meeting for ${request.pet.name}`,
      meta: { 
        meetingDate: request.meeting.date, 
        petId: request.pet._id, 
        requestId: request._id,
        meetingType: request.meeting.type,
        adopterNotes: notes,
        action: 'view_meeting_details'
      }
    }, { realTime: true });
  
    return { 
      msg: 'Meeting confirmed successfully', 
      request,
      preparationGuide: preparationGuide
    };
  }
  
  // Helper function to generate preparation guides
  generatePreparationGuide(meetingType, pet) {
    const baseGuide = {
      title: `Meeting Preparation for ${pet.name}`,
      petInfo: {
        name: pet.name,
        breed: pet.breed,
        age: pet.age,
        specialNeeds: pet.specialNeeds || 'None noted'
      }
    };
  
    if (meetingType === 'virtual') {
      return {
        ...baseGuide,
        type: 'virtual',
        checklist: [
          'Test your internet connection',
          'Ensure camera and microphone work',
          'Find a quiet, well-lit space',
          'Have questions ready about pet care',
          'Prepare to discuss your home environment'
        ],
        tips: [
          'Join 5 minutes early to test audio/video',
          'Have a notepad ready for important information',
          'Be prepared to show your living space via camera if requested'
        ],
        whatToBring: [
          'Valid ID (for verification)',
          'List of questions about the pet',
          'Information about your living situation'
        ]
      };
    } else {
      return {
        ...baseGuide,
        type: 'in-person',
        checklist: [
          'Arrive 10-15 minutes early',
          'Bring valid government-issued ID',
          'Wear comfortable, appropriate clothing',
          'Leave young children at home (unless pre-approved)',
          'Be prepared to spend 45-60 minutes at the shelter'
        ],
        tips: [
          'The pet may be nervous - move slowly and speak softly',
          'Ask about the pet\'s routine and preferences',
          'Be honest about your experience and lifestyle',
          'Take notes during the meeting'
        ],
        whatToBring: [
          'Valid photo ID',
          'Proof of address (if required)',
          'List of questions for staff',
          'Any family members involved in decision (if applicable)'
        ]
      };
    }
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


async scheduleMeeting(user, requestId, staffId, slot) {
  try {
    console.log('📅 Schedule meeting called:', { requestId, staffId, slot });

    // 1. Fetch adoption request (your existing code)
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');
    if (!request) throw createError('Adoption request not found', 404);
    if (request.adopter._id.toString() !== user.id) throw createError('Not authorized', 403);

    // 2. Create meeting date (your existing code)
    const meetingDate = new Date(slot.date);
    const [hours, minutes] = slot.startTime.split(':').map(Number);
    meetingDate.setHours(hours, minutes, 0, 0);

    // 3. Generate meeting link based on type
    let meetingLink = '';
    let meetingType = 'virtual'; // Default to virtual
    
    if (slot.location && slot.location !== 'virtual') {
      meetingType = 'in-person';
      meetingLink = ''; // No link for in-person
    } else {
      // Generate simple Google Meet link (no API needed)
      const meetingId = `pet-adoption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      meetingLink = `https://meet.google.com/new?hs=191&authuser=0`; // Simple meet link
    }

    // 4. Update with enhanced meeting details
    request.status = ADOPTION_STATUS.MEETING;
    request.meeting = {
      date: meetingDate,
      staff: staffId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: meetingType,
      status: 'scheduled',
      location: slot.location || 'Virtual Meeting',
      meetingLink: meetingLink,
      confirmed: false,
      scheduledAt: new Date(),
      agenda: `Discuss ${request.pet.name}'s adoption process and compatibility`
    };

    await request.save();

    // 5. Enhanced notifications (your existing notification code)
    await NotificationService.create({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
      message: `${
        meetingType === 'virtual' ? 'Virtual meeting' : 'In-person visit'
      } scheduled for "${request.pet.name}" on ${meetingDate.toLocaleString()}`,
      meta: { 
        meetingDate: meetingDate, 
        petId: request.pet._id, 
        requestId: request._id, 
        meetingType: meetingType,
        action: 'confirm_meeting' 
      }
    }, { realTime: true });

    // Notify staff
    await NotificationService.create({
      user: staffId,
      type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
      message: `New ${meetingType} meeting scheduled with "${request.adopter.name}" for ${request.pet.name}`,
      meta: { 
        meetingDate: meetingDate, 
        petId: request.pet._id, 
        requestId: request._id,
        meetingType: meetingType
      }
    }, { realTime: true });

    console.log('Meeting scheduled successfully');
    return { 
      success: true,
      msg: `${meetingType === 'virtual' ? 'Virtual meeting' : 'In-person visit'} scheduled successfully!`, 
      request 
    };

  } catch (error) {
    console.error('Error in scheduleMeeting:', error);
    throw error;
  }
}



async completeMeeting(user, requestId, notes) {
  console.log('completeMeeting called', { user, requestId, notes });
  const request = await AdoptionRequest.findById(requestId)
    .populate('pet')
    .populate('adopter')
    .populate('organization');

    console.log('🧾 Found request:', request ? request._id : 'None', 'Status:', request?.status, 'Org:', request?.organization);
  if (!request) throw createError('Adoption request not found', 404);
  
  // Verify staff permissions
  const staff = await User.findById(user.id).select('organization');
  if (!staff || !staff.organization || String(request.organization._id) !== String(staff.organization)) {
    throw createError('Not authorized to manage this request', 403);
  }

  if (request.status !== 'meeting' || !request.meeting) {
    throw createError('No meeting scheduled for this request');
  }

  // Update meeting status
  request.meeting.status = 'completed';
  request.meeting.completedAt = new Date();
  request.meeting.staffNotes = notes;
  
  await request.save();

  // Notify adopter
  await NotificationService.create({
    users: [
      request.adopter._id.toString(), 
      staff._id.toString()             
    ],
    type: NOTIFICATION_TYPES.MEETING_COMPLETED,
    message: `Your meeting for "${request.pet.name}" has been completed. Next steps will be communicated soon.`,
    meta: {
      petId: request.pet._id,
      requestId: request._id,
      action: 'view_request_status'
    }
  }, { realTime: true });

  return {
    msg: 'Meeting completed successfully',
    request
  };
}

// Adopter submits meeting feedback
async submitMeetingFeedback(user, requestId, feedback) {
  const request = await AdoptionRequest.findById(requestId)
    .populate('pet')
    .populate('organization');

  if (!request) throw createError('Adoption request not found', 404);
  if (request.adopter.toString() !== user.id) throw createError('Not authorized', 403);

  if (!request.meeting) {
    throw createError('No meeting found for this request');
  }

  // Store feedback
  request.meeting.adopterFeedback = feedback;
  request.meeting.feedbackSubmittedAt = new Date();
  await request.save();

  // Notify staff
  const staffUsers = await getStaffUsers(request.organization._id);
  await NotificationService.create({
    users: staffUsers.map(s => s._id),
    type: NOTIFICATION_TYPES.MEETING_FEEDBACK,
    message: `${user.name} provided feedback for ${request.pet.name} meeting`,
    meta: {
      petId: request.pet._id,
      requestId: request._id,
      feedback: feedback,
      action: 'view_meeting_feedback'
    }
  }, { realTime: true });

  return {
    msg: 'Feedback submitted successfully'
  };


}


  //  Get single request details
  async getRequestDetails(requestId, userId) {
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet', 'name breed age gender status images medicalHistory specialNeeds')
      .populate('adopter', 'name email phone location')
      .populate('organization', 'name address contactInfo');
    
    if (!request) throw createError('Adoption request not found', 404);
    
    // Authorization check
    if (request.adopter._id.toString() !== userId && 
        request.organization._id.toString() !== (await User.findById(userId)).organization?.toString()) {
      throw createError('Not authorized', 403);
    }
    
    return request;
  }

  // Cancel adoption request (adopter)
  async cancelRequest(userId, requestId) {
    const request = await AdoptionRequest.findOne({ 
      _id: requestId, 
      adopter: userId 
    });
    
    if (!request) throw createError('Adoption request not found', 404);
    
    const allowedStatuses = ['pending', 'on_hold'];
    if (!allowedStatuses.includes(request.status)) {
      throw createError('Cannot cancel request in current status', 400);
    }
    
    request.status = 'cancelled';
    await request.save();
    
    // Notify organization
    const staffUsers = await getStaffUsers(request.organization);
    await NotificationService.create({
      users: staffUsers.map(s => s._id.toString()),
      type: NOTIFICATION_TYPES.ADOPTION_CANCELLED,
      message: `Adoption request for pet ${request.pet} was cancelled`,
      meta: { 
        petId: request.pet, 
        requestId: request._id.toString(),
        action: 'view_requests'
      }
    }, { realTime: true });
    
    return { msg: 'Adoption request cancelled successfully' };
  }

  //  Reschedule meeting
  async rescheduleMeeting(user, requestId, newSlot) {
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');
    
    if (!request) throw createError('Adoption request not found', 404);
    
    // Verify authorization (staff or adopter)
    const isAdopter = request.adopter._id.toString() === user.id;
    const isStaff = await this.isStaffOfOrganization(user.id, request.organization._id);
    
    if (!isAdopter && !isStaff) {
      throw createError('Not authorized to reschedule this meeting', 403);
    }
    
    if (request.status !== 'meeting') {
      throw createError('No meeting scheduled for this request', 400);
    }
    
    const meetingDate = new Date(newSlot.date);
    const [hours, minutes] = newSlot.startTime.split(':').map(Number);
    meetingDate.setHours(hours, minutes, 0, 0);
    
    // Update meeting details
    request.meeting.date = meetingDate;
    request.meeting.startTime = newSlot.startTime;
    request.meeting.endTime = newSlot.endTime;
    request.meeting.location = newSlot.location;
    request.meeting.confirmed = false; // Reset confirmation
    request.meeting.rescheduledAt = new Date();
    request.meeting.rescheduledBy = user.id;
    
    await request.save();
    
    // Notify both parties
    const notificationPromises = [];
    
    // Notify adopter
    notificationPromises.push(
      NotificationService.create({
        user: request.adopter._id.toString(),
        type: NOTIFICATION_TYPES.MEETING_RESCHEDULED,
        message: `Meeting for "${request.pet.name}" has been rescheduled to ${meetingDate.toLocaleString()}`,
        meta: { 
          meetingDate: meetingDate, 
          petId: request.pet._id.toString(), 
          requestId: request._id.toString(),
          action: 'confirm_meeting'
        }
      }, { realTime: true })
    );
    
    // Notify staff
    const staffUsers = await getStaffUsers(request.organization._id);
    notificationPromises.push(
      NotificationService.create({
        users: staffUsers.map(s => s._id.toString()),
        type: NOTIFICATION_TYPES.MEETING_RESCHEDULED,
        message: `Meeting for "${request.pet.name}" has been rescheduled by ${user.name}`,
        meta: { 
          meetingDate: meetingDate, 
          petId: request.pet._id.toString(), 
          requestId: request._id.toString(),
          rescheduledBy: user.name
        }
      }, { realTime: true })
    );
    
    await Promise.all(notificationPromises);
    
    return { msg: 'Meeting rescheduled successfully', request };
  }

  // Helper method to check staff authorization
  async isStaffOfOrganization(userId, organizationId) {
    const user = await User.findById(userId).select('organization role');
    return user && user.role === 'staff' && user.organization.toString() === organizationId.toString();
  }

  //  Get adoption statistics for organization
  async getAdoptionStats(organizationId) {
    const stats = await AdoptionRequest.aggregate([
      { 
        $match: { 
          organization: organizationId 
        } 
      },
      {
        $lookup: {
          from: 'pets',
          localField: 'pet',
          foreignField: '_id',
          as: 'pet'
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          pets: { $push: '$pet.name' }
        }
      }
    ]);
    
    const totalRequests = await AdoptionRequest.countDocuments({ organization: organizationId });
    const finalizedAdoptions = await AdoptionRequest.countDocuments({ 
      organization: organizationId, 
      status: 'finalized' 
    });
    
    return {
      totalRequests,
      finalizedAdoptions,
      statusBreakdown: stats,
      successRate: totalRequests > 0 ? (finalizedAdoptions / totalRequests * 100).toFixed(2) : 0
    };
  }

  // Bulk status update for staff
  async bulkUpdateStatus(user, requestIds, status) {
    const staff = await User.findById(user.id).select('organization');
    if (!staff?.organization) throw createError('Staff organization not found', 403);
    
    const requests = await AdoptionRequest.find({
      _id: { $in: requestIds },
      organization: staff.organization
    }).populate('pet adopter');
    
    if (requests.length !== requestIds.length) {
      throw createError('Some requests not found or not authorized', 404);
    }
    
    const results = [];
    
    for (const request of requests) {
      try {
        const result = await this.updateRequestStatus(user, request._id.toString(), { status });
        results.push({
          requestId: request._id,
          success: true,
          message: result.msg
        });
      } catch (error) {
        results.push({
          requestId: request._id,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

/**
 * Enhanced sendAdoptionAgreement with Cloudinary PDF storage
 */
async sendAdoptionAgreement(staffUser, requestId, customClauses = []) {
  const request = await AdoptionRequest.findById(requestId)
    .populate('pet adopter organization');

  if (!request) throw createError('Adoption request not found', 404);
  
  // Verify staff permissions
  if (!await this.isStaffOfOrganization(staffUser.id, request.organization._id)) {
    throw createError('Not authorized', 403);
  }

  if (request.status !== 'meeting' || request.meeting?.status !== 'completed') {
    throw createError('Meeting must be completed before sending agreement', 400);
  }

  // Generate professional PDF agreement
  const eSignatureService = require('./eSignatureService');
  const cloudinaryDocService = require('./services/cloudinaryDocumentService');
  
  const pdfBytes = await eSignatureService.generateAgreementPDF(request, customClauses);
  
  // Upload PDF to Cloudinary
  const cloudinaryResult = await cloudinaryDocService.uploadAgreementPDF(pdfBytes, requestId);
  
  // Generate secure signature token
  const signatureToken = eSignatureService.generateSignatureToken(requestId, request.adopter._id);

  // Generate agreement content hash for legal integrity
  const agreementHash = this.generateContentHash(pdfBytes);

  // Create agreement record
  const agreement = await AdoptionAgreement.create({
    adoptionRequest: requestId,
    template: this.generateAgreementTemplate(request),
    customClauses,
    status: 'sent',
    sentAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    cloudinaryPublicId: cloudinaryResult.public_id,
    pdfUrl: cloudinaryResult.url,
    signatureToken: signatureToken,
    agreementHash: agreementHash,
    metadata: {
      generatedAt: new Date(),
      pdfSize: cloudinaryResult.bytes,
      customClausesCount: customClauses.length,
      cloudinaryVersion: cloudinaryResult.version,
      storageProvider: 'cloudinary'
    }
  });

  console.log('📝 Professional agreement created with Cloudinary storage:', agreement._id);

  // Generate secure download URL
  const secureDownloadUrl = cloudinaryDocService.generateSignedURL(cloudinaryResult.public_id);

  // Notify adopter with secure signing link
  await NotificationService.create({
    user: request.adopter._id.toString(),
    type: NOTIFICATION_TYPES.AGREEMENT_SENT,
    message: `Professional adoption agreement for ${request.pet.name} is ready for your digital signature`,
    meta: {
      petId: request.pet._id.toString(),
      requestId: request._id.toString(),
      agreementId: agreement._id.toString(),
      signUrl: `/agreements/${agreement._id}/sign?token=${signatureToken}`,
      downloadUrl: secureDownloadUrl,
      expiresAt: agreement.expiresAt,
      action: 'review_agreement'
    }
  }, { realTime: true, sendEmail: true });

  // Notify staff
  const staffUsers = await getStaffUsers(request.organization._id);
  await NotificationService.create({
    users: staffUsers.map(s => s._id.toString()),
    type: NOTIFICATION_TYPES.AGREEMENT_SENT,
    message: `Adoption agreement sent to ${request.adopter.name} for ${request.pet.name}`,
    meta: {
      petId: request.pet._id.toString(),
      requestId: request._id.toString(),
      agreementId: agreement._id.toString(),
      adopterName: request.adopter.name,
      action: 'view_agreement_status'
    }
  }, { realTime: true });

  return { 
    success: true,
    msg: 'Professional adoption agreement sent successfully', 
    agreement: {
      id: agreement._id,
      status: agreement.status,
      expiresAt: agreement.expiresAt,
      signUrl: `/agreements/${agreement._id}/sign?token=${signatureToken}`,
      downloadUrl: secureDownloadUrl,
      cloudinaryPublicId: cloudinaryResult.public_id
    }
  };
}

  // Sign agreement (adopter)
  async signAgreement(adopterUser, agreementId, signature) {
    const agreement = await AdoptionAgreement.findById(agreementId)
      .populate('adoptionRequest');

    if (!agreement) throw createError('Agreement not found', 404);
    
    const request = await AdoptionRequest.findById(agreement.adoptionRequest._id)
      .populate('adopter')
      .populate('organization');

    if (request.adopter._id.toString() !== adopterUser.id) {
      throw createError('Not authorized to sign this agreement', 403);
    }

    if (agreement.status !== 'sent') {
      throw createError('Agreement cannot be signed', 400);
    }

    if (new Date() > agreement.expiresAt) {
      agreement.status = 'expired';
      await agreement.save();
      throw createError('Agreement has expired', 400);
    }

    // Update agreement with signature
    agreement.signedDocument = {
      url: await this.uploadSignedDocument(agreement, signature),
      signedAt: new Date(),
      signature: signature,
      ipAddress: adopterUser.ipAddress // From request
    };
    agreement.status = 'signed';
    await agreement.save();

    // Notify staff
    const staffUsers = await getStaffUsers(request.organization._id);
    await NotificationService.create({
      users: staffUsers.map(s => s._id.toString()),
      type: NOTIFICATION_TYPES.AGREEMENT_SIGNED,
      message: `${request.adopter.name} signed adoption agreement for ${request.pet.name}`,
      meta: {
        petId: request.pet._id.toString(),
        requestId: request._id.toString(),
        agreementId: agreement._id.toString(),
        action: 'review_signed_agreement'
      }
    }, { realTime: true });

    return { msg: 'Agreement signed successfully', agreement };
  }

  // Process payment after agreement signed
  async processPayment(adopterUser, requestId, paymentMethod, paymentDetails) {
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet')
      .populate('adopter')
      .populate('organization');

    if (!request) throw createError('Adoption request not found', 404);
    if (request.adopter._id.toString() !== adopterUser.id) {
      throw createError('Not authorized', 403);
    }

    // Check if agreement is signed
    const agreement = await AdoptionAgreement.findOne({ 
      adoptionRequest: requestId, 
      status: 'signed' 
    });
    
    if (!agreement) {
      throw createError('Adoption agreement must be signed before payment', 400);
    }

    // Calculate adoption fee
    const amount = await this.calculateAdoptionFee(request.pet._id);

    // Process payment (integrate with Stripe/PayPal)
    const paymentResult = await this.processPaymentWithGateway(
      amount, 
      paymentMethod, 
      paymentDetails
    );

    // Create payment record
    const payment = await Payment.create({
      adoptionRequest: requestId,
      amount: amount,
      status: paymentResult.success ? 'completed' : 'failed',
      paymentMethod: paymentMethod,
      transactionId: paymentResult.transactionId,
      receiptUrl: paymentResult.receiptUrl,
      paidAt: paymentResult.success ? new Date() : null
    });

    if (paymentResult.success) {
      // Finalize adoption automatically
      await this.updateRequestStatus(
        { id: (await getStaffUsers(request.organization._id))[0]._id }, // Use staff user
        requestId, 
        { status: 'finalized' }
      );

      await NotificationService.create({
        user: request.adopter._id.toString(),
        type: NOTIFICATION_TYPES.PAYMENT_COMPLETED,
        message: `Payment completed and adoption finalized for ${request.pet.name}!`,
        meta: {
          petId: request.pet._id.toString(),
          requestId: request._id.toString(),
          paymentId: payment._id.toString(),
          action: 'view_adoption_details'
        }
      }, { realTime: true, sendEmail: true });
    }

    return {
      success: paymentResult.success,
      msg: paymentResult.success ? 'Payment completed and adoption finalized' : 'Payment failed',
      payment,
      receiptUrl: paymentResult.receiptUrl
    };
  }

  //  Helper methods
  generateAgreementTemplate(request) {
    return `
      ADOPTION AGREEMENT
      
      This Agreement is made between ${request.organization.name} and ${request.adopter.name}.
      
      Pet Details:
      - Name: ${request.pet.name}
      - Breed: ${request.pet.breed}
      - Age: ${request.pet.age}
      
      Terms and Conditions:
      1. Adopter agrees to provide proper care and veterinary treatment
      2. Adopter cannot transfer ownership without organization consent
      3. Organization may conduct follow-up visits
      4. If adopter can no longer care for pet, it must be returned to organization
      
      Signed electronically on ${new Date().toLocaleDateString()}
    `;
  }


  // Get agreement details
  async getAgreementDetails(user, agreementId) {
    const agreement = await AdoptionAgreement.findById(agreementId)
      .populate({
        path: 'adoptionRequest',
        populate: { path: 'adopter organization pet' }
      });

    if (!agreement) throw createError('Agreement not found', 404);
    
    const request = agreement.adoptionRequest;

    // Authorization check
    const isAdopter = request.adopter._id.toString() === user.id;
    const isStaff = await this.isStaffOfOrganization(user.id, request.organization._id);
    
    if (!isAdopter && !isStaff) {
      throw createError('Not authorized to view this agreement', 403);
    }

    return agreement;
  }

  async calculateAdoptionFee(petId) {
    const pet = await Pet.findById(petId);
    // Base fee + adjustments for age, breed, etc.
    let fee = 150; // Base adoption fee
    
    if (pet.age < 1) fee += 50; // Puppy/kitten fee
    if (pet.specialNeeds) fee -= 25; // Discount for special needs
    
    return fee;
  }

  //  ADD THIS MISSING HELPER METHOD
  async uploadSignedDocument(agreement, signature) {
    // In a real app, you'd generate and upload a PDF
    // For now, return a placeholder URL
    return `https://your-app.com/agreements/${agreement._id}/signed.pdf`;
  }

  // ADD THIS MISSING HELPER METHOD  
  async processPaymentWithGateway(amount, paymentMethod, paymentDetails) {
    // Simplified - integrate with Stripe/PayPal in real app
    console.log(`Processing payment: $${amount} via ${paymentMethod}`);
    
    // Simulate payment processing (90% success rate for demo)
    const success = Math.random() > 0.1;
    
    return {
      success,
      transactionId: success ? `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null,
      receiptUrl: success ? `https://your-app.com/receipts/txn_${Date.now()}` : null
    };
  }


  async processDigitalSignature(adopterUser, agreementId, signatureData, req) {
    try {
      console.log('🖊️ Processing digital signature...');
      
      const eSignatureService = require('./eSignatureService');
      const cloudinaryDocService = require('./services/cloudinaryDocumentService');
      
      const agreement = await AdoptionAgreement.findById(agreementId)
        .populate({
          path: 'adoptionRequest',
          populate: { path: 'adopter organization pet' }
        });
  
      if (!agreement) throw createError('Agreement not found', 404);
      
      const request = agreement.adoptionRequest;
  
      // Validate authorization
      if (request.adopter._id.toString() !== adopterUser.id) {
        throw createError('Not authorized to sign this agreement', 403);
      }
  
      if (agreement.status !== 'sent') {
        throw createError('Agreement cannot be signed', 400);
      }
  
      if (new Date() > agreement.expiresAt) {
        agreement.status = 'expired';
        await agreement.save();
        throw createError('Agreement has expired', 400);
      }
  
      // Load original PDF from Cloudinary
      const originalPdfUrl = agreement.pdfUrl;
      console.log('📥 Loading original PDF from:', originalPdfUrl);
  
      // In production, you'd fetch the PDF from Cloudinary
      // For now, we'll regenerate it (in production, download from Cloudinary)
      const originalPdfBytes = await eSignatureService.generateAgreementPDF(
        request, 
        agreement.customClauses.map(c => c.clause)
      );
  
      // Add digital signature to PDF
      const signedPdfBytes = await eSignatureService.addSignatureToPDF(
        originalPdfBytes,
        signatureData.signature,
        {
          adopterName: request.adopter.name,
          signedAt: signatureData.signedAt,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          contentHash: agreement.agreementHash,
          petName: request.pet.name
        }
      );
  
      // Upload signed PDF to Cloudinary
      const signedCloudinaryResult = await cloudinaryDocService.uploadAgreementPDF(
        signedPdfBytes, 
        agreementId, 
        'signed'
      );
  
      // Update agreement with signature data
      agreement.signedDocument = {
        cloudinaryPublicId: signedCloudinaryResult.public_id,
        url: signedCloudinaryResult.url,
        signature: signatureData.signature,
        signatureHash: this.generateSignatureHash(signatureData.signature),
        signedAt: new Date(signatureData.signedAt),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        contentHash: agreement.agreementHash,
        verified: true
      };
      
      agreement.status = 'signed';
      agreement.metadata.signedAt = new Date();
      await agreement.save();
  
      console.log('✅ Digital signature processed successfully');
  
      // Notify staff
      const staffUsers = await getStaffUsers(request.organization._id);
      await NotificationService.create({
        users: staffUsers.map(s => s._id.toString()),
        type: NOTIFICATION_TYPES.AGREEMENT_SIGNED,
        message: `${request.adopter.name} digitally signed adoption agreement for ${request.pet.name}`,
        meta: {
          petId: request.pet._id.toString(),
          requestId: request._id.toString(),
          agreementId: agreement._id.toString(),
          signedDocumentUrl: signedCloudinaryResult.url,
          action: 'review_signed_agreement'
        }
      }, { realTime: true });
  
      return {
        success: true,
        msg: 'Agreement signed successfully',
        agreement: {
          id: agreement._id,
          status: agreement.status,
          signedDocumentUrl: signedCloudinaryResult.url,
          redirectTo: `/adoptions/${request._id}/payment` // Next step
        }
      };
  
    } catch (error) {
      console.error('❌ Digital signature processing failed:', error);
      throw error;
    }
  }

/**
 * Get agreement details for frontend (MVCS pattern)
 */
async getAgreementForSigning(user, agreementId) {
  try {
    const agreement = await this.getAgreementDetails(user, agreementId);
    
    // Verify user is the adopter
    if (agreement.adoptionRequest.adopter._id.toString() !== user.id) {
      throw createError('Not authorized to access this agreement', 403);
    }

    return {
      id: agreement._id,
      status: agreement.status,
      pdfUrl: agreement.pdfUrl,
      downloadUrl: agreement.signedDocument?.url || agreement.pdfUrl,
      expiresAt: agreement.expiresAt,
      adoptionRequest: {
        id: agreement.adoptionRequest._id,
        pet: agreement.adoptionRequest.pet,
        adopter: agreement.adoptionRequest.adopter,
        organization: agreement.adoptionRequest.organization
      },
      canSign: agreement.status === 'sent' && 
               new Date() < agreement.expiresAt,
      metadata: {
        customClausesCount: agreement.customClauses.length,
        daysUntilExpiry: Math.ceil((agreement.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
      }
    };

  } catch (error) {
    console.error('Error getting agreement for signing:', error);
    throw error;
  }
}

/**
 * Generate signature capture HTML page (MVCS pattern)
 */
async generateSignaturePage(user, agreementId) {
  try {
    const agreement = await this.getAgreementDetails(user, agreementId);
    
    // Authorization check
    if (agreement.adoptionRequest.adopter._id.toString() !== user.id) {
      throw createError('Not authorized to sign this agreement', 403);
    }

    if (agreement.status !== 'sent') {
      throw createError('Agreement cannot be signed', 400);
    }

    if (new Date() > agreement.expiresAt) {
      throw createError('Agreement has expired', 400);
    }

    const eSignatureService = require('./eSignatureService');
    return eSignatureService.generateSignatureCaptureHTML(
      agreement._id,
      agreement.adoptionRequest.pet.name
    );

  } catch (error) {
    console.error('Error generating signature page:', error);
    throw error;
  }
}

/**
 * Process digital signature (MVCS pattern)
 */
async processDigitalSignature(user, agreementId, signatureData, req) {
  try {
    console.log('Processing digital signature for agreement:', agreementId);
    
    const eSignatureService = require('./eSignatureService');
    const cloudinaryDocService = require('./services/cloudinaryDocumentService');
    
    const agreement = await AdoptionAgreement.findById(agreementId)
      .populate({
        path: 'adoptionRequest',
        populate: { path: 'adopter organization pet' }
      });

    if (!agreement) throw createError('Agreement not found', 404);
    
    const request = agreement.adoptionRequest;

    // Authorization check
    if (request.adopter._id.toString() !== user.id) {
      throw createError('Not authorized to sign this agreement', 403);
    }

    if (agreement.status !== 'sent') {
      throw createError('Agreement cannot be signed', 400);
    }

    if (new Date() > agreement.expiresAt) {
      agreement.status = 'expired';
      await agreement.save();
      throw createError('Agreement has expired', 400);
    }

    // Load original PDF (in production, fetch from Cloudinary)
    const originalPdfBytes = await eSignatureService.generateAgreementPDF(
      request, 
      agreement.customClauses.map(c => c.clause)
    );

    // Add digital signature to PDF
    const signedPdfBytes = await eSignatureService.addSignatureToPDFSimple(
      originalPdfBytes,
      signatureData.signature,
      {
        adopterName: request.adopter.name,
        signedAt: signatureData.signedAt,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        petName: request.pet.name
      }
    );

    // Upload signed PDF to Cloudinary
    const signedCloudinaryResult = await cloudinaryDocService.uploadAgreementPDF(
      signedPdfBytes, 
      agreementId, 
      'signed'
    );

    // Update agreement with signature data
    agreement.signedDocument = {
      cloudinaryPublicId: signedCloudinaryResult.public_id,
      url: signedCloudinaryResult.url,
      signature: signatureData.signature,
      signatureHash: this.generateSignatureHash(signatureData.signature),
      signedAt: new Date(signatureData.signedAt),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      contentHash: agreement.agreementHash,
      verified: true
    };
    
    agreement.status = 'signed';
    agreement.metadata.signedAt = new Date();
    await agreement.save();

    console.log(' Digital signature processed successfully');

    // Notify staff
    const staffUsers = await getStaffUsers(request.organization._id);
    await NotificationService.create({
      users: staffUsers.map(s => s._id.toString()),
      type: NOTIFICATION_TYPES.AGREEMENT_SIGNED,
      message: `${request.adopter.name} digitally signed adoption agreement for ${request.pet.name}`,
      meta: {
        petId: request.pet._id.toString(),
        requestId: request._id.toString(),
        agreementId: agreement._id.toString(),
        signedDocumentUrl: signedCloudinaryResult.url,
        action: 'review_signed_agreement'
      }
    }, { realTime: true });

    return {
      success: true,
      msg: 'Agreement signed successfully',
      agreement: {
        id: agreement._id,
        status: agreement.status,
        signedDocumentUrl: signedCloudinaryResult.url,
        redirectTo: `/adoptions/${request._id}/payment` // Next step
      }
    };

  } catch (error) {
    console.error('Error processing digital signature:', error);
    throw error;
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
    scheduleMeeting: adoptionService.scheduleMeeting.bind(adoptionService),
    completeMeeting: adoptionService.completeMeeting.bind(adoptionService),
    submitMeetingFeedback: adoptionService.submitMeetingFeedback.bind(adoptionService),
    getRequestDetails: adoptionService.getRequestDetails.bind(adoptionService),
    cancelRequest: adoptionService.cancelRequest.bind(adoptionService),
    rescheduleMeeting: adoptionService.rescheduleMeeting.bind(adoptionService),
    getAdoptionStats: adoptionService.getAdoptionStats.bind(adoptionService),
    bulkUpdateStatus: adoptionService.bulkUpdateStatus.bind(adoptionService),
    sendAdoptionAgreement: adoptionService.sendAdoptionAgreement.bind(adoptionService),
    signAgreement: adoptionService.signAgreement.bind(adoptionService),
    processPayment: adoptionService.processPayment.bind(adoptionService),
    getAgreementDetails: adoptionService.getAgreementDetails.bind(adoptionService),
    getAgreementForSigning: adoptionService.getAgreementForSigning.bind(adoptionService),
    generateSignaturePage: adoptionService.generateSignaturePage.bind(adoptionService),
    processDigitalSignature: adoptionService.processDigitalSignature.bind(adoptionService)
};

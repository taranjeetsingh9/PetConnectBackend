
// routes/adoptions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createNotification, NOTIFICATION_TYPES } = require('../utils/notificationService');


// --- Role Based Middleware --- shift later
const roleAuth = (allowedRoles) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ msg: 'Access denied: Insufficient role permissions' });
    }
    req.userRole = user.role;
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error during role check');
  }
};

// Helper function to get staff users for an organization
const getStaffUsers = async (organizationId) => {
  const User = require('../models/User');
  return await User.find({ 
    organization: organizationId, 
    role: 'staff' 
  }).select('_id name email');
};

/**
 * @route   POST /api/adoptions/:petId/request
 * @desc    Adopter expresses interest in a pet
 * @access  Private (Adopter only)
 */
router.post('/:petId/request', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.petId);
    if (!pet) return res.status(404).json({ msg: 'Pet not found' });
    if (pet.status !== 'Available') return res.status(400).json({ msg: 'Pet is not available' });

    // Check duplicate
    const existingRequest = await AdoptionRequest.findOne({ pet: pet._id, adopter: req.user.id });
    if (existingRequest) return res.status(400).json({ msg: 'You have already requested this pet' });

    const request = new AdoptionRequest({
      pet: pet._id,
      adopter: req.user.id,
      organization: pet.organization
    });

    await request.save();
    res.json({ msg: 'Adoption request submitted', request });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/adoptions/requests
 * @desc    Get all adoption requests for staff's organization
 * @access  Private (Staff only)
 */
router.get('/requests', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const staff = await User.findById(req.user.id).select('organization');
    if (!staff || !staff.organization) {
      return res.status(403).json({ msg: 'Staff does not belong to an organization' });
    }

    const requests = await AdoptionRequest.find()
      .populate({
        path: 'pet',
        match: { organization: staff.organization },
        select: 'name breed status images'
      })
      .populate('adopter', 'name email location');

    // filter out requests with no matching pet
    const filtered = requests.filter(r => r.pet !== null);
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PATCH /api/adoptions/:id/status
 * @desc    Staff update adoption request status (approve, reject, ignore, chat, finalized, etc.)
 * @access  Private (Staff/Admin only)
 */
router.patch('/:id/status', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    // const { status: rawStatus } = req.body;
    const { status: rawStatus, meetingDate } = req.body;
    if (!rawStatus) return res.status(400).json({ msg: 'Status is required' });

    const status = String(rawStatus).toLowerCase();
    const ALLOWED = ['approved', 'ignored', 'rejected', 'on-hold', 'finalized', 'chat', 'meeting'];

    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }

    const request = await AdoptionRequest.findById(req.params.id)
      .populate({
        path: 'pet',
        populate: { path: 'organization', select: '_id name' }
      })
      .populate('adopter');

    if (!request) return res.status(404).json({ msg: 'Adoption request not found' });

    const staff = await User.findById(req.user.id).select('organization');
    if (!staff || !staff.organization) {
      return res.status(403).json({ msg: 'Staff does not belong to any organization' });
    }

    if (!request.pet || String(request.pet.organization?._id) !== String(staff.organization)) {
      return res.status(403).json({ msg: 'Not authorized to manage this request' });
    }

    // if (['ignored','rejected'].includes(status)) {
    //   request.status = status;
    //   await request.save();
    //   await Notification.create({
    //     user: request.adopter._id,
    //     type: `adoption_${status}`,
    //     message: `Your adoption request for "${request.pet.name}" was ${status}.`,
    //     meta: { pet: request.pet._id, request: request._id }
    //   });
    //   return res.json({ msg: `Adoption ${status}`, request });
    // }

    // testing

    if (['ignored','rejected'].includes(status)) {
      request.status = status;
      await request.save();
      
      // ✅ ENHANCED: Use notification service
      await createNotification(
        request.adopter._id,
        status === 'rejected' ? NOTIFICATION_TYPES.ADOPTION_REJECTED : 'adoption_ignored',
        `Your adoption request for "${request.pet.name}" was ${status}.`,
        { 
          petId: request.pet._id, 
          petName: request.pet.name,
          requestId: request._id,
          action: 'browse_other_pets'
        }
      );
      
      return res.json({ msg: `Adoption ${status}`, request });
    }

    // testing end



    
// adoption flow
    // if (status === 'approved') {
    //   request.status = 'approved';
    //   await request.save();
    
    //   // Pet remains Available until finalized
    //   // Other requests for same pet → on-hold
    //   await AdoptionRequest.updateMany(
    //     { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: ['pending', 'on-hold'] } },
    //     { $set: { status: 'on-hold' } }
    //   );
    
    //   await Notification.create({
    //     user: request.adopter._id,
    //     type: 'adoption_approved',
    //     message: `Your adoption request for "${request.pet.name}" is approved! Please chat with staff to schedule a meeting and finalize the adoption.`,
    //     meta: { pet: request.pet._id, request: request._id }
    //   });
    
    //   return res.json({ msg: 'Request approved. Awaiting chat/meeting.', request });
    // }

    // testr
    if (status === 'approved') {
      request.status = 'approved';
      await request.save();
    
      // Pet remains Available until finalized
      // Other requests for same pet → on-hold
      await AdoptionRequest.updateMany(
        { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: ['pending', 'on-hold'] } },
        { $set: { status: 'on-hold' } }
      );
    // autocreate chat message
 // ✅ NEW: Auto-create chat for approved adoption
 try {
  console.log('🔧 Creating chat for approved adoption:', request._id);
  
  // Create participants array
  const participants = [
    { user: request.adopter._id, role: 'adopter' }
  ];

  // Add staff members from the organization
  const User = require('../models/User');
  const staffMembers = await User.find({ 
    organization: request.organization._id,
    role: 'staff'
  }).select('_id name email');

  staffMembers.forEach(staff => {
    participants.push({ user: staff._id, role: 'staff' });
  });

  // Create the chat
  const chat = new Chat({
    participants,
    adoptionRequest: request._id,
    lastMessage: `Chat started for ${request.pet.name}'s adoption process`,
    lastMessageAt: new Date()
  });

  await chat.save();
  console.log('✅ Chat created successfully:', chat._id);


  await createNotification(
    request.adopter._id,
    NOTIFICATION_TYPES.NEW_MESSAGE,
    `💬 Chat started! You can now message the shelter about ${request.pet.name}'s adoption.`,
    {
      adoptionRequestId: request._id,
      petId: request.pet._id,
      petName: request.pet.name,
      action: 'open_chat'
    }
  );

} catch (chatError) {
  console.error('❌ Failed to create chat:', chatError);
  // Don't fail the approval if chat creation fails
}

    // chat message logic end



      //  Use notification service
      await createNotification(
        request.adopter._id,
        NOTIFICATION_TYPES.ADOPTION_APPROVED,
        `🎉 Your adoption request for "${request.pet.name}" is approved! Please chat with staff to schedule a meeting and finalize the adoption.`,
        { 
          petId: request.pet._id, 
          petName: request.pet.name,
          requestId: request._id,
          action: 'start_chat'
        }
      );
    
      return res.json({ msg: 'Request approved. Awaiting chat/meeting.', request });
    }
    // testended
  
    // Chat flow
    if (status === 'chat') {
      request.status = 'chat';
      await request.save();
    
      await Notification.create({
        user: request.adopter._id,
        type: 'adoption_chat',
        message: `Your adoption request for "${request.pet.name}" is approved. Please join the chat to schedule a meeting.`,
        meta: { pet: request.pet._id, request: request._id }
      });
    
      return res.json({ msg: 'Chat started for this adoption', request });
    }
        // --- Meeting flow ---
if (status === 'meeting') {
  if (!meetingDate) return res.status(400).json({ msg: 'Meeting date is required' });

  request.status = 'meeting';
  request.meeting.date = new Date(meetingDate);
  request.meeting.confirmed = false; // not confirmed yet
  await request.save();

  await Notification.create({
    user: request.adopter._id,
    type: 'adoption_meeting',
    message: `A staff has requested a meeting for "${request.pet.name}" on ${new Date(meetingDate).toLocaleString()}. Please confirm the meeting.`,
    meta: { pet: request.pet._id, request: request._id }
  });

  return res.json({ msg: 'Meeting requested', request });
}
    // Finalize adoption
    // if (status === 'finalized') {
    //   request.status = 'finalized';
    //   await request.save();
    
    //   const updatedPet = await Pet.findByIdAndUpdate(
    //     request.pet._id,
    //     { $set: { status: 'Adopted', adopter: request.adopter._id } },
    //     { new: true }
    //   );
    
    //   await Notification.create({
    //     user: request.adopter._id,
    //     type: 'adoption_finalized',
    //     message: `Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
    //     meta: { pet: request.pet._id, request: request._id }
    //   });
    
    //   return res.json({ msg: 'Adoption finalized', request, pet: updatedPet });
    // }
    //testing start
    if (status === 'finalized') {
      request.status = 'finalized';
      await request.save();
    
      const updatedPet = await Pet.findByIdAndUpdate(
        request.pet._id,
        { $set: { status: 'Adopted', adopter: request.adopter._id } },
        { new: true }
      );
    
      // ✅ ENHANCED: Use notification service
      await createNotification(
        request.adopter._id,
        NOTIFICATION_TYPES.ADOPTION_FINALIZED,
        `🏠 Congratulations! Your adoption for "${request.pet.name}" has been finalized. Thank you for giving them a forever home!`,
        { 
          petId: request.pet._id, 
          petName: request.pet.name,
          requestId: request._id,
          action: 'view_pet_profile'
        }
      );
    
      return res.json({ msg: 'Adoption finalized', request, pet: updatedPet });
    }
// testing end
    res.status(400).json({ msg: 'Unhandled status action' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// GET /api/adoptions/my-requests
// Adopter can see all their adoption requests (pending, approved, etc.)
router.get('/my-requests', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const requests = await AdoptionRequest.find({ adopter: req.user.id })
      .populate('pet', 'name breed age gender status images')
      .populate('organization', 'name');

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



// testing meeting booking system
/**
 * @route   PATCH /api/adoptions/:id/confirm-meeting
 * @desc    Adopter confirms a meeting
 * @access  Private (Adopter only)
 */
router.patch('/:id/confirm-meeting', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const { notes } = req.body; // Optional notes from adopter
    
    const request = await AdoptionRequest.findById(req.params.id)
      .populate('pet')
      .populate('adopter')
      .populate('organization');

    if (!request) {
      return res.status(404).json({ msg: 'Adoption request not found' });
    }

    // Verify this adopter owns the request
    if (request.adopter._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to confirm this meeting' });
    }

    // Check if meeting is scheduled
    if (request.status !== 'meeting' || !request.meeting.date) {
      return res.status(400).json({ msg: 'No meeting scheduled to confirm' });
    }

    // Update meeting confirmation
    request.meeting.confirmed = true;
    request.meeting.confirmedAt = new Date();
    request.meeting.adopterNotes = notes;
    await request.save();

    // ✅ Send real-time notification to staff
    const { createNotification, NOTIFICATION_TYPES } = require('../utils/notificationService');
    const staffUsers = await getStaffUsers(request.organization._id);
    
    for (const staff of staffUsers) {
      await createNotification(
        staff._id,
        NOTIFICATION_TYPES.MEETING_CONFIRMED,
        `✅ ${request.adopter.name} confirmed the meeting for ${request.pet.name} on ${request.meeting.date.toLocaleString()}`,
        {
          adoptionRequestId: request._id,
          petId: request.pet._id,
          petName: request.pet.name,
          adopterName: request.adopter.name,
          meetingDate: request.meeting.date,
          action: 'view_meeting_details'
        }
      );

      // Real-time socket notification
      const { getIO } = require('../server/socket');
      const io = getIO();
      io.to(`user-${staff._id}`).emit('meeting-confirmed', {
        adoptionRequestId: request._id,
        petName: request.pet.name,
        adopterName: request.adopter.name,
        meetingDate: request.meeting.date,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      msg: 'Meeting confirmed successfully!',
      request: {
        _id: request._id,
        status: request.status,
        meeting: request.meeting,
        pet: request.pet
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/adoptions/:id/send-reminder
 * @desc    Send meeting reminder to adopter
 * @access  Private (Staff only)
 */
router.post('/:id/send-reminder', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const request = await AdoptionRequest.findById(req.params.id)
      .populate('pet')
      .populate('adopter');

    if (!request) {
      return res.status(404).json({ msg: 'Adoption request not found' });
    }

    if (request.status !== 'meeting' || !request.meeting.date) {
      return res.status(400).json({ msg: 'No meeting scheduled' });
    }

    const { createNotification, NOTIFICATION_TYPES } = require('../utils/notificationService');
    
    await createNotification(
      request.adopter._id,
      NOTIFICATION_TYPES.MEETING_REMINDER,
      `🔔 Reminder: Your meeting for ${request.pet.name} is scheduled for ${request.meeting.date.toLocaleString()}. Please confirm your attendance.`,
      {
        adoptionRequestId: request._id,
        petId: request.pet._id,
        petName: request.pet.name,
        meetingDate: request.meeting.date,
        action: 'confirm_meeting'
      }
    );

    res.json({
      msg: 'Meeting reminder sent successfully',
      adopter: request.adopter.email,
      meetingDate: request.meeting.date
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;

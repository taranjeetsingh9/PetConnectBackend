// routes/adoptions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Chat = require('../models/chat');
const Notifier = require('../utils/notifier');
const NOTIFICATION_TYPES = require('../constants/notificationTypes');

// Role Based Middleware
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
    const pet = await Pet.findById(req.params.petId).populate('organization');
    if (!pet) return res.status(404).json({ msg: 'Pet not found' });
    if (pet.status !== 'Available') return res.status(400).json({ msg: 'Pet is not available' });

    // Check duplicate
    const existingRequest = await AdoptionRequest.findOne({ 
      pet: pet._id, 
      adopter: req.user.id 
    });
    if (existingRequest) {
      return res.status(400).json({ msg: 'You have already requested this pet' });
    }

    const request = new AdoptionRequest({
      pet: pet._id,
      adopter: req.user.id,
      organization: pet.organization._id
    });

    await request.save();

    // Notify organization staff
    const staffUsers = await getStaffUsers(pet.organization._id);
    
    await Notifier.notifyUsers(staffUsers, {
      type: NOTIFICATION_TYPES.ADOPTION_REQUEST_NEW,
      message: `New adoption request for ${pet.name}`,
      meta: { 
        petId: pet._id, 
        adopterId: req.user.id, 
        requestId: request._id,
        action: 'review_request'
      }
    });

    res.json({ msg: 'Adoption request submitted', request });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/adoptions/requests
 * @desc    Get all adoption requests for staff's organization (EXCLUDE DELETED PETS)
 * @access  Private (Staff only)
 */
router.get('/requests', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const staff = await User.findById(req.user.id).select('organization');
    if (!staff || !staff.organization) {
      return res.status(403).json({ msg: 'Staff does not belong to an organization' });
    }

    // ✅ FIX: Only get requests where pet exists and belongs to organization
    const requests = await AdoptionRequest.find({ 
      organization: staff.organization 
    })
    .populate({
      path: 'pet',
      match: { 
        organization: staff.organization,
        _id: { $exists: true } // Ensure pet still exists
      },
      select: 'name breed status images'
    })
    .populate('adopter', 'name email location')
    .sort({ createdAt: -1 });

    // ✅ FIX: Filter out requests where pet is null (deleted)
    const validRequests = requests.filter(request => request.pet !== null);

    console.log(`✅ Loaded ${validRequests.length} valid adoption requests (filtered out ${requests.length - validRequests.length} with deleted pets)`);

    res.json(validRequests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PATCH /api/adoptions/:id/status
 * @desc    Staff update adoption request status
 * @access  Private (Staff/Admin only)
 */
router.patch('/:id/status', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const { status: rawStatus, meetingDate } = req.body;
    if (!rawStatus) return res.status(400).json({ msg: 'Status is required' });

    const status = String(rawStatus).toLowerCase();
    const ALLOWED = ['approved', 'ignored', 'rejected', 'on-hold', 'finalized', 'chat', 'meeting'];

    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ msg: 'Invalid status value' });
    }

    const request = await AdoptionRequest.findById(req.params.id)
      .populate('pet')
      .populate('adopter')
      .populate('organization');

    if (!request) return res.status(404).json({ msg: 'Adoption request not found' });

    const staff = await User.findById(req.user.id).select('organization');
    if (!staff || !staff.organization) {
      return res.status(403).json({ msg: 'Staff does not belong to any organization' });
    }

    if (String(request.organization._id) !== String(staff.organization)) {
      return res.status(403).json({ msg: 'Not authorized to manage this request' });
    }

    // Handle ignored/rejected status
    if (['ignored', 'rejected'].includes(status)) {
      request.status = status;
      await request.save();

      await Notifier.notifyUser({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_REJECTED,
        message: `Your adoption request for "${request.pet.name}" was ${status}.`,
        meta: { 
          petId: request.pet._id, 
          requestId: request._id,
          action: 'browse_other_pets'
        }
      });

      return res.json({ msg: `Request ${status}`, request });
    }

    // Handle approved status
    if (status === 'approved') {
      request.status = 'approved';
      await request.save();

      // Put other requests on hold
      await AdoptionRequest.updateMany(
        { 
          pet: request.pet._id, 
          _id: { $ne: request._id }, 
          status: { $in: ['pending', 'on-hold'] } 
        },
        { $set: { status: 'on-hold' } }
      );

      // Auto-create chat for approved adoption
      try {
        const participants = [
          { user: request.adopter._id, role: 'adopter' }
        ];

        const staffMembers = await getStaffUsers(request.organization._id);
        staffMembers.forEach(staff => {
          participants.push({ user: staff._id, role: 'staff' });
        });

        const chat = new Chat({
          participants,
          adoptionRequest: request._id,
          lastMessage: `Chat started for ${request.pet.name}'s adoption process`,
          lastMessageAt: new Date()
        });

        await chat.save();
        console.log('Chat created successfully:', chat._id);

        // Notify adopter
        await Notifier.notifyUser({
          user: request.adopter._id,
          type: NOTIFICATION_TYPES.ADOPTION_APPROVED,
          message: `🎉 Your adoption request for "${request.pet.name}" is approved! You can now chat with staff.`,
          meta: { 
            petId: request.pet._id, 
            requestId: request._id, 
            chatId: chat._id,
            action: 'open_chat' 
          }
        });

      } catch (chatError) {
        console.error('❌ Failed to create chat:', chatError);
      }

      return res.json({ msg: 'Request approved. Chat created.', request });
    }

    // Handle meeting scheduling
    if (status === 'meeting') {
      if (!meetingDate) {
        return res.status(400).json({ msg: 'Meeting date is required' });
      }

      request.status = 'meeting';
      request.meeting = {
        date: new Date(meetingDate),
        confirmed: false
      };
      await request.save();

      await Notifier.notifyUser({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.MEETING_SCHEDULED,
        message: ` A meeting for "${request.pet.name}" has been scheduled on ${new Date(meetingDate).toLocaleString()}.`,
        meta: { 
          meetingDate, 
          petId: request.pet._id, 
          requestId: request._id,
          action: 'confirm_meeting'
        }
      });

      return res.json({ msg: 'Meeting scheduled', request });
    }

    // Handle finalized status
    if (status === 'finalized') {
      request.status = 'finalized';
      await request.save();

      const updatedPet = await Pet.findByIdAndUpdate(
        request.pet._id,
        { $set: { status: 'Adopted', adopter: request.adopter._id } },
        { new: true }
      );

      // Reject all other pending requests for this pet
      await AdoptionRequest.updateMany(
        { 
          pet: request.pet._id, 
          _id: { $ne: request._id }, 
          status: { $nin: ['finalized', 'rejected'] } 
        },
        { $set: { status: 'rejected' } }
      );

      await Notifier.notifyUser({
        user: request.adopter._id,
        type: NOTIFICATION_TYPES.ADOPTION_FINALIZED,
        message: `🏠 Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
        meta: { 
          petId: request.pet._id, 
          requestId: request._id,
          action: 'view_pet_profile'
        }
      }, { sendEmail: true });

      return res.json({ msg: 'Adoption finalized', request, pet: updatedPet });
    }
    res.json({ msg: 'Status updated', request });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/adoptions/my-requests
 * @desc    Adopter can see all their adoption requests
 * @access  Private (Adopter only)
 */
router.get('/my-requests', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const requests = await AdoptionRequest.find({ adopter: req.user.id })
      .populate('pet', 'name breed age gender status images')
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PATCH /api/adoptions/:id/confirm-meeting
 * @desc    Adopter confirms a meeting
 * @access  Private (Adopter only)
 */
router.patch('/:id/confirm-meeting', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const { notes } = req.body;
    
    const request = await AdoptionRequest.findById(req.params.id)
      .populate('pet')
      .populate('adopter')
      .populate('organization');

    if (!request) {
      return res.status(404).json({ msg: 'Adoption request not found' });
    }

    if (request.adopter._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to confirm this meeting' });
    }

    if (request.status !== 'meeting' || !request.meeting?.date) {
      return res.status(400).json({ msg: 'No meeting scheduled to confirm' });
    }

    // Update meeting confirmation
    request.meeting.confirmed = true;
    request.meeting.confirmedAt = new Date();
    request.meeting.adopterNotes = notes;
    await request.save();

    // Notify all staff members
    const staffUsers = await getStaffUsers(request.organization._id);
    
    await Notifier.notifyUsers(staffUsers, {
      type: NOTIFICATION_TYPES.MEETING_CONFIRMED,
      message: ` ${request.adopter.name} confirmed the meeting for ${request.pet.name} on ${request.meeting.date.toLocaleString()}`,
      meta: { 
        meetingDate: request.meeting.date, 
        petId: request.pet._id, 
        requestId: request._id,
        action: 'view_meeting_details'
      }
    });

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

    if (request.status !== 'meeting' || !request.meeting?.date) {
      return res.status(400).json({ msg: 'No meeting scheduled' });
    }

    await Notifier.notifyUser({
      user: request.adopter._id,
      type: NOTIFICATION_TYPES.MEETING_REMINDER,
      message: `🔔 Reminder: Your meeting for ${request.pet.name} is scheduled for ${request.meeting.date.toLocaleString()}.`,
      meta: { 
        petId: request.pet._id, 
        requestId: request._id,
        meetingDate: request.meeting.date,
        action: 'confirm_meeting'
      }
    }, { sendEmail: true });

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

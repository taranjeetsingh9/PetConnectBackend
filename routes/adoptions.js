// const express = require('express');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const AdoptionRequest = require('../models/AdopterRequest');
// const Pet = require('../models/Pet');
// const User = require('../models/User');


// // --- RBAC Middleware ---
// // Checks if the authenticated user has one of the required roles.
// const roleAuth = (allowedRoles) => async (req, res, next) => {
//   // This middleware runs after 'auth', so req.user.id is always available.
//   try {
//       // Fetch only the role for efficiency
//       const user = await User.findById(req.user.id).select('role');

//       if (!user || !allowedRoles.includes(user.role)) {
//           console.log(`Access denied for user ${req.user.id} with role ${user ? user.role : 'none'}`);
//           return res.status(403).json({ msg: 'Access denied: Insufficient role permissions' });
//       }
      
//       req.userRole = user.role; 
//       next();
//   } catch (err) {
//       console.error(err.message);
//       res.status(500).send('Server Error during role check');
//   }
// };

// // @route   POST /api/adoptions/:petId/request
// // @desc    Adopter expresses interest in a pet
// // @access  Private (Adopter only)
// router.post('/:petId/request', auth, roleAuth(['adopter']), async (req, res) => {
//   try {
//     const pet = await Pet.findById(req.params.petId);
//     if(!pet) return res.status(404).json({ msg: 'Pet not found' });
//     if(pet.status !== 'Available') return res.status(400).json({ msg: 'Pet is not available' });

//     // Check if adopter already requested this pet
//     const existingRequest = await AdoptionRequest.findOne({ pet: pet._id, adopter: req.user.id });
//     if(existingRequest) return res.status(400).json({ msg: 'You have already requested this pet' });

//     const request = new AdoptionRequest({
//       pet: pet._id,
//       adopter: req.user.id,
//       organization: pet.organization
//     });

//     await request.save();
//     res.json({ msg: 'Adoption request submitted', request });

//   } catch(err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// });

// // @route   GET /api/adoptions/requests
// // @desc    Get all adoption requests for staff's organization
// // @access  Private (Staff only)
// // router.get('/requests', auth, roleAuth(['staff']), async (req, res) => {
// //   try {
// //     // Find pets that belong to staff's organization
// //     const staffOrgPets = await Pet.find({ organization: req.user.organization });

// //     const petIds = staffOrgPets.map(p => p._id);

// //     // Fetch requests for those pets
// //     const requests = await AdoptionRequest.find({ pet: { $in: petIds } })
// //       .populate('pet', 'name breed status images')
// //       .populate('adopter', 'name email location');

// //     res.json(requests);

// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send('Server Error');
// //   }
// // });
// router.get('/requests', auth, roleAuth(['staff']), async (req, res) => {
//   try {
//     // Fetch staff organization
//     const staff = await User.findById(req.user.id).select('organization');
//     if(!staff) return res.status(404).json({ msg: 'Staff not found' });

//     // Fetch requests where pet.organization matches staff.organization
//     const requests = await AdoptionRequest.find()
//       .populate({
//         path: 'pet',
//         match: { organization: staff.organization } // filter by org
//       })
//       .populate('adopter');

//     // Remove requests where pet is null (filtered out)
//     const filteredRequests = requests.filter(r => r.pet !== null);

//     res.json(filteredRequests);
//   } catch(err) {
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// });


// // @route   PATCH /api/adoptions/:requestId/status
// // @desc    Staff approve/ignore adoption request

// // Approve / Reject adoption request
// // router.patch('/:id/status', auth, roleAuth(['staff']), async (req, res) => {
// //   try {
// //     const { status } = req.body; // 'approved' or 'ignored'

// //     // Validate status
// //     if (!['approved', 'ignored'].includes(status)) {
// //       return res.status(400).json({ msg: 'Invalid status value' });
// //     }

// //     // Find adoption request + populate pet
// //     const request = await AdoptionRequest.findById(req.params.id).populate('pet');
// //     if (!request) {
// //       return res.status(404).json({ msg: 'Adoption request not found' });
// //     }

// //     // Get staff's organization
// //     const staff = await User.findById(req.user.id).select('organization');
// //     if (!staff || !staff.organization) {
// //       return res.status(403).json({ msg: 'Staff does not belong to any organization' });
// //     }

// //     // Check org match (staff org === pet org)
// //     if (String(request.pet.organization) !== String(staff.organization)) {
// //       return res.status(403).json({ msg: 'Not authorized to manage this request' });
// //     }

// //     // Update adoption request
// //     request.status = status;
// //     await request.save();

// //     res.json({ msg: `Adoption request ${status}`, request });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send('Server Error');
// //   }
// // });
// // PATCH /api/adoptions/:id/status
// // router.patch("/:id/status", auth, async (req, res) => {
// //   try {
// //     const { status } = req.body;

// //     // Find adoption request and populate pet + organization + adopter
// //     const request = await AdoptionRequest.findById(req.params.id)
// //       .populate({
// //         path: "pet",
// //         populate: { path: "organization", select: "_id name" }
// //       })
// //       .populate("adopter");

// //     if (!request) {
// //       return res.status(404).json({ msg: "Adoption request not found" });
// //     }

// //     // Get staff's organization
// //     const staff = await User.findById(req.user.id).select("organization");
// //     if (!staff || !staff.organization) {
// //       return res.status(403).json({ msg: "Staff does not belong to any organization" });
// //     }

// //     // ✅ Compare staff org vs pet org
// //     if (String(request.pet.organization?._id) !== String(staff.organization)) {
// //       return res.status(403).json({ msg: "Not authorized to manage this request" });
// //     }

// //     // Update adoption request
// //     request.status = status;
// //     await request.save();

// //     res.json({ msg: `Adoption request ${status}`, request });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send("Server Error");
// //   }
// // });

// // test approve and ignore
// router.patch('/:id/status', auth, roleAuth(['staff','admin']), async (req, res) => {
//   try {
//     let rawStatus = req.body.status;
//     if (!rawStatus) return res.status(400).json({ msg: 'Status is required' });

//     const status = String(rawStatus).toLowerCase(); // normalize

//     // allowed actions (extend later as needed)
//     const ALLOWED = ['approved','ignored','rejected','on-hold','finalized','chat'];
//     if (!ALLOWED.includes(status)) return res.status(400).json({ msg: 'Invalid status value' });

//     // Load request + nested pet.organization + adopter
//     const request = await AdoptionRequest.findById(req.params.id)
//       .populate({
//         path: 'pet',
//         populate: { path: 'organization', select: '_id name' }
//       })
//       .populate('adopter');

//     if (!request) return res.status(404).json({ msg: 'Adoption request not found' });

//     // Get staff org
//     const staff = await User.findById(req.user.id).select('organization');
//     if (!staff || !staff.organization) return res.status(403).json({ msg: 'Staff does not belong to any organization' });

//     // Ensure pet and organization are present
//     if (!request.pet || !request.pet.organization) {
//       return res.status(400).json({ msg: 'Pet or pet organization missing from request' });
//     }

//     // Org match check
//     if (String(request.pet.organization._id || request.pet.organization) !== String(staff.organization)) {
//       return res.status(403).json({ msg: 'Not authorized to manage this request' });
//     }

//     // --- Handle approve flow ---
//     if (status === 'approved') {
//       // 1) mark this request approved
//       request.status = 'approved';
//       await request.save();

//       // 2) update pet -> Adopted and set adopter
//       const petId = request.pet._id;
//       const updatedPet = await Pet.findByIdAndUpdate(
//         petId,
//         { $set: { status: 'Adopted', adopter: request.adopter._id } },
//         { new: true }
//       );

//       // 3) set other requests for the same pet to on-hold (except current)
//       await AdoptionRequest.updateMany(
//         { pet: petId, _id: { $ne: request._id }, status: { $in: ['pending','on-hold'] } },
//         { $set: { status: 'on-hold' } }
//       );

//       // 4) optionally, put other pending requests by the same adopter on-hold (if requested)
//       await AdoptionRequest.updateMany(
//         { adopter: request.adopter._id, _id: { $ne: request._id }, status: 'pending' },
//         { $set: { status: 'on-hold' } }
//       );

//       // 5) create notification for adopter
//       await Notification.create({
//         user: request.adopter._id,
//         type: 'adoption_approved',
//         message: `Congratulations — your adoption request for "${request.pet.name}" has been approved. Please chat with the staff to finalize pickup/meeting.`,
//         meta: { pet: petId, request: request._id }
//       });

//       return res.json({ msg: 'Adoption approved', request, pet: updatedPet });
//     }

//     // --- Handle ignored / rejected ---
//     if (status === 'ignored' || status === 'rejected') {
//       request.status = status;
//       await request.save();

//       await Notification.create({
//         user: request.adopter._id,
//         type: 'adoption_rejected',
//         message: `Your adoption request for "${request.pet.name}" was ${status}.`,
//         meta: { pet: request.pet._id, request: request._id }
//       });

//       return res.json({ msg: `Adoption ${status}`, request });
//     }

//     // You can add handlers for 'chat' or 'finalized' here later

//     res.status(400).json({ msg: 'Unhandled status action' });

//   } catch (err) {
//     console.error(err);
//     // return JSON error so frontend can parse properly
//     res.status(500).json({ msg: 'Server Error', error: err.message });
//   }
// });

// // test complete
// // routes/adoptions.js
// // GET /api/adoptions/requests   ← only for staff
// router.get('/requests', auth, roleAuth(['staff']), async (req, res) => {
//   try {
//     const requests = await AdoptionRequest.find({ status: 'Pending' })
//       .populate('pet', 'name breed')
//       .populate('adopter', 'name email location');

//     res.json(requests);
//   } catch(err){
//     console.error(err);
//     res.status(500).send('Server Error');
//   }
// });

// module.exports = router;

// routes/adoptions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');
const User = require('../models/User');
const Notification = require('../models/Notification'); // <-- make sure you created this model

// --- Role Based Middleware ---
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

    if (['ignored','rejected'].includes(status)) {
      request.status = status;
      await request.save();
      await Notification.create({
        user: request.adopter._id,
        type: `adoption_${status}`,
        message: `Your adoption request for "${request.pet.name}" was ${status}.`,
        meta: { pet: request.pet._id, request: request._id }
      });
      return res.json({ msg: `Adoption ${status}`, request });
    }

    
// adoption flow
    if (status === 'approved') {
      request.status = 'approved';
      await request.save();
    
      // Pet remains Available until finalized
      // Other requests for same pet → on-hold
      await AdoptionRequest.updateMany(
        { pet: request.pet._id, _id: { $ne: request._id }, status: { $in: ['pending', 'on-hold'] } },
        { $set: { status: 'on-hold' } }
      );
    
      await Notification.create({
        user: request.adopter._id,
        type: 'adoption_approved',
        message: `Your adoption request for "${request.pet.name}" is approved! Please chat with staff to schedule a meeting and finalize the adoption.`,
        meta: { pet: request.pet._id, request: request._id }
      });
    
      return res.json({ msg: 'Request approved. Awaiting chat/meeting.', request });
    }

  
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
    if (status === 'finalized') {
      request.status = 'finalized';
      await request.save();
    
      const updatedPet = await Pet.findByIdAndUpdate(
        request.pet._id,
        { $set: { status: 'Adopted', adopter: request.adopter._id } },
        { new: true }
      );
    
      await Notification.create({
        user: request.adopter._id,
        type: 'adoption_finalized',
        message: `Congratulations! Your adoption for "${request.pet.name}" has been finalized.`,
        meta: { pet: request.pet._id, request: request._id }
      });
    
      return res.json({ msg: 'Adoption finalized', request, pet: updatedPet });
    }
    

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

module.exports = router;

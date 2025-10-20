const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { petImagesUpload, documentsUpload } = require('../middleware/upload');
const Pet = require('../models/Pet');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');
const { cloudinary } = require('../config/cloudinary');
const Chat = require('../models/chat');

// ========================
// 👤 USER PET FILES (Personal Pet Listings - Kijiji Style)
// ========================

// ✅ User creates a personal pet listing with images
router.post('/user-pet/upload', auth, petImagesUpload.array('images', 8), async (req, res) => {
  try {
    const { 
      name, breed, age, gender, description, 
      careInstructions, duration, location, contactInfo 
    } = req.body;

    // Validation
    if (!name || !description || !location) {
      return res.status(400).json({ 
        success: false,
        msg: 'Name, description, and location are required' 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        msg: 'At least one image is required' 
      });
    }

    // Create personal pet listing
    const personalPet = new Pet({
      name,
      breed: breed || 'Mixed',
      age: age || 0,
      gender: gender || 'Unknown',
      description,
      careInstructions: careInstructions || 'Standard care required',
      location,
      contactInfo: contactInfo || `Contact ${req.user.name}`,
      // Personal listing specific fields
      listingType: 'personal',
      isPersonalListing: true,
      status: 'available_fostering',
      duration: duration || 'short_term',
      owner: req.user.id,
      // Images
      images: req.files.map((file, index) => ({
        url: file.path,
        public_id: file.filename,
        uploadedBy: req.user.id,
        caption: `Photo of ${name}`,
        isPrimary: index === 0
      }))
    });

    await personalPet.save();

    // Add to user's personal pets list (update User model if needed)
    await User.findByIdAndUpdate(req.user.id, {
      $push: { personalPets: personalPet._id }
    });

    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Created Personal Pet Listing',
      target: personalPet._id,
      targetModel: 'Pet',
      details: `Created personal listing for ${name} - seeking fostering`
    });

    res.status(201).json({
      success: true,
      message: 'Personal pet listing created successfully!',
      pet: personalPet,
      listingUrl: `/pets/${personalPet._id}`
    });

  } catch (error) {
    console.error('Create personal pet listing error:', error);
    
    // Clean up uploaded files if error occurs
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          await cloudinary.uploader.destroy(file.filename);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
    }
    
    res.status(500).json({ 
      success: false,
      msg: 'Server error creating pet listing: ' + error.message 
    });
  }
});

// ✅ User adds more images to their personal pet listing
router.post('/user-pet/:id/add-images', auth, petImagesUpload.array('images', 5), async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ 
        success: false,
        msg: 'Pet listing not found' 
      });
    }

    // Verify user owns this pet listing
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        msg: 'You can only add images to your own pet listings' 
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        msg: 'No images uploaded' 
      });
    }

    const newImages = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
      uploadedBy: req.user.id,
      caption: `Additional photo of ${pet.name}`
    }));

    pet.images.push(...newImages);
    await pet.save();

    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Added Pet Listing Images',
      target: pet._id,
      targetModel: 'Pet',
      details: `Added ${req.files.length} images to personal listing ${pet.name}`
    });

    res.json({
      success: true,
      message: `${req.files.length} images added successfully`,
      images: newImages,
      totalImages: pet.images.length
    });

  } catch (error) {
    console.error('Add personal pet images error:', error);
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          await cloudinary.uploader.destroy(file.filename);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
    }
    
    res.status(500).json({ 
      success: false,
      msg: 'Server error adding images' 
    });
  }
});

router.get('/my-listings', auth, async (req, res) => {
  try {
    const personalPets = await Pet.find({ 
      owner: req.user.id,
      listingType: 'personal'
    })
    .sort({ createdAt: -1 })
    .select('name breed age gender status duration location images createdAt description');

    res.json({
      success: true,
      listings: personalPets,
      totalListings: personalPets.length
    });

  } catch (error) {
    console.error('Get personal listings error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error fetching your listings' 
    });
  }
});

router.get('/listings', auth, async (req, res) => {
  try {
    const { location, duration, search } = req.query;
    
    let query = { 
      listingType: 'personal', 
      status: 'available_fostering' 
    };

    // Add filters if provided
    if (location) query.location = new RegExp(location, 'i');
    if (duration && duration !== 'all') query.duration = duration;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { breed: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const listings = await Pet.find(query)
      .populate('owner', 'name email avatar')
      .select('name breed age gender description duration location contactInfo images status createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      listings,
      totalListings: listings.length
    });

  } catch (error) {
    console.error('Get all listings error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error fetching listings' 
    });
  }
});

router.patch('/user-pet/:id', auth, async (req, res) => {
  try {
    const { name, description, careInstructions, duration, location, contactInfo, status } = req.body;
    
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ 
        success: false,
        msg: 'Pet listing not found' 
      });
    }

    // Verify ownership
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        msg: 'You can only update your own pet listings' 
      });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (careInstructions) updateFields.careInstructions = careInstructions;
    if (duration) updateFields.duration = duration;
    if (location) updateFields.location = location;
    if (contactInfo) updateFields.contactInfo = contactInfo;
    if (status) updateFields.status = status;

    const updatedPet = await Pet.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Updated Pet Listing',
      target: pet._id,
      targetModel: 'Pet',
      details: `Updated personal listing for ${pet.name}`
    });

    res.json({
      success: true,
      message: 'Pet listing updated successfully',
      pet: updatedPet
    });

  } catch (error) {
    console.error('Update personal pet error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error updating pet listing' 
    });
  }
});

router.delete('/user-pet/:id', auth, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ 
        success: false,
        msg: 'Pet listing not found' 
      });
    }

    // Verify ownership
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        msg: 'You can only delete your own pet listings' 
      });
    }

    // Delete all images from Cloudinary
    if (pet.images && pet.images.length > 0) {
      for (const image of pet.images) {
        try {
          await cloudinary.uploader.destroy(image.public_id);
        } catch (cloudinaryError) {
          console.error('Cloudinary delete error:', cloudinaryError);
        }
      }
    }

    // Delete the pet document
    await Pet.findByIdAndDelete(req.params.id);

    // Remove from user's personal pets (if User model has this field)
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { personalPets: pet._id }
    });

    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Deleted Pet Listing',
      target: pet._id,
      targetModel: 'Pet',
      details: `Deleted personal listing for ${pet.name}`
    });

    res.json({
      success: true,
      message: 'Pet listing deleted successfully'
    });

  } catch (error) {
    console.error('Delete personal pet error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error deleting pet listing' 
    });
  }
});


// ✅ ENTERPRISE SOLUTION: Get user's personal pet listings WITH foster requests and detailed analytics
router.get('/my-listings/detailed', auth, async (req, res) => {
  try {
    const personalPets = await Pet.find({ 
      owner: req.user.id,
      listingType: 'personal'
    })
    .populate('fosterRequests.user', 'name email avatar location')
    .populate('currentFoster', 'name email avatar')
    .sort({ createdAt: -1 })
    .select('name breed age gender status duration location images createdAt description fosterRequests currentFoster');

    // Calculate comprehensive analytics
    const analytics = {
      total: personalPets.length,
      available: personalPets.filter(pet => pet.status === 'available_fostering').length,
      pendingRequests: personalPets.reduce((count, pet) => 
        count + (pet.fosterRequests ? pet.fosterRequests.filter(req => req.status === 'pending').length : 0), 0),
      approvedRequests: personalPets.reduce((count, pet) => 
        count + (pet.fosterRequests ? pet.fosterRequests.filter(req => req.status === 'approved').length : 0), 0),
      currentlyFostered: personalPets.filter(pet => pet.status === 'fostered').length,
      totalRequests: personalPets.reduce((count, pet) => 
        count + (pet.fosterRequests ? pet.fosterRequests.length : 0), 0)
    };

    res.json({
      success: true,
      listings: personalPets,
      analytics: analytics,
      totalListings: personalPets.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get detailed listings error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error fetching your listings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ PROFESSIONAL: Start chat for foster request
// router.post('/:id/foster-requests/:requestId/start-chat', auth, async (req, res) => {
//   try {
//     const pet = await Pet.findById(req.params.id);
//     if (!pet) return res.status(404).json({ msg: "Pet not found" });

//     // Check if user owns the pet
//     const isOwner = pet.owner && pet.owner.toString() === req.user.id;
//     if (!isOwner) return res.status(403).json({ msg: "Access denied" });

//     const fosterRequest = pet.fosterRequests.id(req.params.requestId);
//     if (!fosterRequest) return res.status(404).json({ msg: "Foster request not found" });

//     // Create chat thread (you'll need to integrate with your chat system)
//     // This is a placeholder - integrate with your actual chat API
//     const chatData = {
//       participants: [req.user.id, fosterRequest.user],
//       context: {
//         type: 'foster_discussion',
//         petId: pet._id,
//         petName: pet.name,
//         fosterRequestId: fosterRequest._id
//       },
//       initialMessage: `Discussion started for fostering ${pet.name}. ${fosterRequest.message ? `Initial message: "${fosterRequest.message}"` : ''}`
//     };

//     // TODO: Integrate with your chat API to create thread
//     // const chatThread = await createChatThread(chatData);
    
//     // For now, simulate chat creation
//     const chatThread = { _id: new mongoose.Types.ObjectId() };

//     // Update foster request
//     fosterRequest.status = 'in_discussion';
//     fosterRequest.chatThread = chatThread._id;
//     await pet.save();

//     res.json({
//       success: true,
//       msg: "Chat started successfully",
//       chatThreadId: chatThread._id,
//       fosterRequest: fosterRequest
//     });

//   } catch (err) {
//     console.error('Start chat error:', err);
//     res.status(500).send("Server Error");
//   }
// });

// ✅ PROFESSIONAL: Start chat for foster request (INTEGRATED WITH YOUR CHAT SYSTEM)
// router.post('/:id/foster-requests/:requestId/start-chat', auth, async (req, res) => {
//   try {
//     const pet = await Pet.findById(req.params.id)
//       .populate('owner', 'name email')
//       .populate('fosterRequests.user', 'name email');
    
//     if (!pet) return res.status(404).json({ msg: "Pet not found" });

//     // Check if user owns the pet
//     const isOwner = pet.owner && pet.owner.toString() === req.user.id;
//     if (!isOwner) return res.status(403).json({ msg: "Access denied" });

//     const fosterRequest = pet.fosterRequests.id(req.params.requestId);
//     if (!fosterRequest) return res.status(404).json({ msg: "Foster request not found" });

//     // Check if chat already exists
//     if (fosterRequest.chatThread) {
//       const existingChat = await Chat.findById(fosterRequest.chatThread)
//         .populate('participants.user', 'name email role');
      
//       if (existingChat) {
//         return res.json({
//           success: true,
//           msg: "Chat already exists",
//           chatThreadId: fosterRequest.chatThread,
//           existing: true,
//           chat: existingChat
//         });
//       }
//     }

//     // Create chat using your existing Chat model structure
//     const chat = new Chat({
//       participants: [
//         { 
//           user: req.user.id, // Pet owner
//           role: 'owner',
//           lastReadAt: new Date(),
//           joinedAt: new Date()
//         },
//         { 
//           user: fosterRequest.user._id || fosterRequest.user, // Foster requester
//           role: 'foster_seeker', 
//           lastReadAt: new Date(),
//           joinedAt: new Date()
//         }
//       ],
//       // Since we don't have adoptionRequest for foster, we'll use metadata
//       adoptionRequest: null, // Keep this field but set to null
//       lastMessage: `Chat started for fostering ${pet.name}. ${fosterRequest.message ? `Initial interest: "${fosterRequest.message}"` : ''}`,
//       lastMessageAt: new Date(),
//       isActive: true
//     });

//     // Initialize unread counts
//     chat.unreadCounts.set(req.user.id.toString(), 0);
//     chat.unreadCounts.set((fosterRequest.user._id || fosterRequest.user).toString(), 0);

//     await chat.save();

//     // Update foster request with chat thread
//     fosterRequest.status = 'in_discussion';
//     fosterRequest.chatThread = chat._id;
//     await pet.save();

//     // Populate the chat for response
//     const populatedChat = await Chat.findById(chat._id)
//       .populate('participants.user', 'name email role');

//     res.json({
//       success: true,
//       msg: "Chat started successfully",
//       chatThreadId: chat._id,
//       chat: populatedChat,
//       fosterRequest: {
//         _id: fosterRequest._id,
//         status: fosterRequest.status,
//         user: fosterRequest.user
//       }
//     });

//   } catch (err) {
//     console.error('Start chat error:', err);
//     res.status(500).json({ 
//       success: false,
//       msg: "Server Error",
//       error: err.message 
//     });
//   }
// });

// ✅ DEBUG: Start chat for foster request (WITH LOGGING)
router.post('/:id/foster-requests/:requestId/start-chat', auth, async (req, res) => {
  try {
    console.log('🔍 CHAT DEBUG - User ID:', req.user.id);
    console.log('🔍 CHAT DEBUG - Pet ID:', req.params.id);
    console.log('🔍 CHAT DEBUG - Request ID:', req.params.requestId);

    const pet = await Pet.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('fosterRequests.user', 'name email');
    
    if (!pet) {
      console.log('❌ CHAT DEBUG - Pet not found');
      return res.status(404).json({ msg: "Pet not found" });
    }

    console.log('🔍 CHAT DEBUG - Pet owner:', pet.owner);
    console.log('🔍 CHAT DEBUG - Pet owner ID:', pet.owner?._id?.toString());
    console.log('🔍 CHAT DEBUG - Pet owner type:', typeof pet.owner);
    console.log('🔍 CHAT DEBUG - Request user ID:', req.user.id);
    console.log('🔍 CHAT DEBUG - Owner equals user?', pet.owner?._id?.toString() === req.user.id);

    // Check if user owns the pet - FIXED VERSION
    const isOwner = pet.owner && pet.owner._id.toString() === req.user.id;
    console.log('🔍 CHAT DEBUG - Is owner?', isOwner);
    
    if (!isOwner) {
      console.log('❌ CHAT DEBUG - Access denied: User is not owner');
      console.log('🔍 CHAT DEBUG - Pet owner ID:', pet.owner?._id?.toString());
      console.log('🔍 CHAT DEBUG - Current user ID:', req.user.id);
      return res.status(403).json({ 
        success: false,
        msg: "Access denied - You are not the owner of this pet" 
      });
    }

    const fosterRequest = pet.fosterRequests.id(req.params.requestId);
    if (!fosterRequest) {
      console.log('❌ CHAT DEBUG - Foster request not found');
      return res.status(404).json({ msg: "Foster request not found" });
    }

    console.log('🔍 CHAT DEBUG - Foster request found:', fosterRequest._id);
    console.log('🔍 CHAT DEBUG - Foster request user:', fosterRequest.user);

    // Continue with chat creation...
    // [Rest of your existing chat creation code]

    // Check if chat already exists
    if (fosterRequest.chatThread) {
      const existingChat = await Chat.findById(fosterRequest.chatThread)
        .populate('participants.user', 'name email role');
      
      if (existingChat) {
        console.log('✅ CHAT DEBUG - Existing chat found');
        return res.json({
          success: true,
          msg: "Chat already exists",
          chatThreadId: fosterRequest.chatThread,
          existing: true,
          chat: existingChat
        });
      }
    }

    console.log('🔍 CHAT DEBUG - Creating new chat...');

    // Create chat using your existing Chat model structure
    const chat = new Chat({
      participants: [
        { 
          user: req.user.id, // Pet owner
          role: 'owner',
          lastReadAt: new Date(),
          joinedAt: new Date()
        },
        { 
          user: fosterRequest.user._id || fosterRequest.user, // Foster requester
          role: 'foster_seeker', 
          lastReadAt: new Date(),
          joinedAt: new Date()
        }
      ],
      adoptionRequest: null,
      lastMessage: `Chat started for fostering ${pet.name}. ${fosterRequest.message ? `Initial interest: "${fosterRequest.message}"` : ''}`,
      lastMessageAt: new Date(),
      isActive: true
    });

    // Initialize unread counts
    chat.unreadCounts.set(req.user.id.toString(), 0);
    chat.unreadCounts.set((fosterRequest.user._id || fosterRequest.user).toString(), 0);

    await chat.save();
    console.log('✅ CHAT DEBUG - New chat created:', chat._id);

    // Update foster request with chat thread
    fosterRequest.status = 'in_discussion';
    fosterRequest.chatThread = chat._id;
    await pet.save();
    console.log('✅ CHAT DEBUG - Foster request updated');

    // Populate the chat for response
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants.user', 'name email role');

    console.log('✅ CHAT DEBUG - Chat creation successful');
    
    res.json({
      success: true,
      msg: "Chat started successfully",
      chatThreadId: chat._id,
      chat: populatedChat,
      fosterRequest: {
        _id: fosterRequest._id,
        status: fosterRequest.status,
        user: fosterRequest.user
      }
    });

  } catch (err) {
    console.error('❌ CHAT DEBUG - Start chat error:', err);
    res.status(500).json({ 
      success: false,
      msg: "Server Error",
      error: err.message 
    });
  }
});

// ✅ PROFESSIONAL: Schedule meeting for foster request
router.patch('/:id/foster-requests/:requestId/schedule-meeting', auth, async (req, res) => {
  try {
    const { meetingDate, meetingLocation, notes } = req.body;
    const pet = await Pet.findById(req.params.id);
    
    if (!pet) return res.status(404).json({ msg: "Pet not found" });
    if (!meetingDate || !meetingLocation) {
      return res.status(400).json({ msg: "Meeting date and location are required" });
    }

    const fosterRequest = pet.fosterRequests.id(req.params.requestId);
    if (!fosterRequest) return res.status(404).json({ msg: "Foster request not found" });

    // Check if user is involved in this request
    const isOwner = pet.owner && pet.owner.toString() === req.user.id;
    const isRequester = fosterRequest.user.toString() === req.user.id;
    
    if (!isOwner && !isRequester) {
      return res.status(403).json({ msg: "Access denied" });
    }

    fosterRequest.status = 'meeting_scheduled';
    fosterRequest.meetingDate = meetingDate;
    fosterRequest.meetingLocation = meetingLocation;
    fosterRequest.notes = notes;

    await pet.save();

    res.json({
      success: true,
      msg: "Meeting scheduled successfully",
      fosterRequest: fosterRequest
    });

  } catch (err) {
    console.error('Schedule meeting error:', err);
    res.status(500).send("Server Error");
  }
});



module.exports = router;
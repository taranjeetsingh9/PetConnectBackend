// controllers/petFilesController.js
const Pet = require('../models/Pet');
const User = require('../models/User');
const FosterChat = require('../models/FosterChat');
const logActivity = require('../utils/logActivity');
const { cloudinary } = require('../config/cloudinary');

// Helper for creating errors
const createError = (msg, status = 400) => { 
  const err = new Error(msg); 
  err.status = status; 
  return err; 
};

// Create personal pet listing
exports.createPersonalPet = async (req, res) => {
  try {
    const { name, breed, age, gender, description, careInstructions, duration, location, contactInfo } = req.body;

    if (!name || !description || !location) {
      return res.status(400).json({ success: false, msg: 'Name, description, and location are required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, msg: 'At least one image is required' });
    }

    const personalPet = new Pet({
      name,
      breed: breed || 'Mixed',
      age: age || 0,
      gender: gender || 'Unknown',
      description,
      careInstructions: careInstructions || 'Standard care required',
      location,
      contactInfo: contactInfo || `Contact ${req.user.name}`,
      listingType: 'personal',
      isPersonalListing: true,
      status: 'available_fostering',
      duration: duration || 'short_term',
      owner: req.user.id,
      images: req.files.map((file, index) => ({
        url: file.path,
        public_id: file.filename,
        uploadedBy: req.user.id,
        caption: `Photo of ${name}`,
        isPrimary: index === 0
      }))
    });

    await personalPet.save();

    await User.findByIdAndUpdate(req.user.id, { $push: { personalPets: personalPet._id } });

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

    // Cleanup uploaded files if error
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { await cloudinary.uploader.destroy(file.filename); } 
        catch (cleanupError) { console.error('Cleanup error:', cleanupError); }
      }
    }

    res.status(500).json({ success: false, msg: 'Server error creating pet listing: ' + error.message });
  }
};

// Add images to personal listing
exports.addPetImages = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ success: false, msg: 'Pet listing not found' });
    if (pet.owner.toString() !== req.user.id) return res.status(403).json({ success: false, msg: 'You can only add images to your own pet listings' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, msg: 'No images uploaded' });

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

    res.json({ success: true, message: `${req.files.length} images added successfully`, images: newImages, totalImages: pet.images.length });

  } catch (error) {
    console.error('Add personal pet images error:', error);

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { await cloudinary.uploader.destroy(file.filename); } 
        catch (cleanupError) { console.error('Cleanup error:', cleanupError); }
      }
    }

    res.status(500).json({ success: false, msg: 'Server error adding images' });
  }
};

// Get user's personal listings
exports.getMyListings = async (req, res) => {
  try {
    const personalPets = await Pet.find({ owner: req.user.id, listingType: 'personal' })
      .sort({ createdAt: -1 })
      .select('name breed age gender status duration location images createdAt description');

    res.json({ success: true, listings: personalPets, totalListings: personalPets.length });
  } catch (error) {
    console.error('Get personal listings error:', error);
    res.status(500).json({ success: false, msg: 'Server error fetching your listings' });
  }
};

//  Get all personal listings (filtered)
exports.getAllListings = async (req, res) => {
  try {
    const { location, duration, search } = req.query;

    let query = { listingType: 'personal', status: 'available_fostering' };

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

    res.json({ success: true, listings, totalListings: listings.length });
  } catch (error) {
    console.error('Get all listings error:', error);
    res.status(500).json({ success: false, msg: 'Server error fetching listings' });
  }
};

//  Update personal pet listing
exports.updatePersonalListing = async (req, res) => {
    try {
      const { name, description, careInstructions, duration, location, contactInfo, status } = req.body;
  
      const pet = await Pet.findById(req.params.id);
      if (!pet) return res.status(404).json({ success: false, msg: 'Pet listing not found' });
      if (pet.owner.toString() !== req.user.id) return res.status(403).json({ success: false, msg: 'You can only update your own pet listings' });
  
      const updateFields = {};
      if (name) updateFields.name = name;
      if (description) updateFields.description = description;
      if (careInstructions) updateFields.careInstructions = careInstructions;
      if (duration) updateFields.duration = duration;
      if (location) updateFields.location = location;
      if (contactInfo) updateFields.contactInfo = contactInfo;
      if (status) updateFields.status = status;
  
      const updatedPet = await Pet.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });
  
      await logActivity({
        userId: req.user.id,
        role: req.user.role,
        action: 'Updated Pet Listing',
        target: pet._id,
        targetModel: 'Pet',
        details: `Updated personal listing for ${pet.name}`
      });
  
      res.json({ success: true, message: 'Pet listing updated successfully', pet: updatedPet });
  
    } catch (error) {
      console.error('Update personal pet error:', error);
      res.status(500).json({ success: false, msg: 'Server error updating pet listing' });
    }
  };
  
  // Delete personal pet listing
  exports.deletePersonalListing = async (req, res) => {
    try {
      const pet = await Pet.findById(req.params.id);
      if (!pet) return res.status(404).json({ success: false, msg: 'Pet listing not found' });
      if (pet.owner.toString() !== req.user.id) return res.status(403).json({ success: false, msg: 'You can only delete your own pet listings' });
  
      // Delete images from Cloudinary
      if (pet.images && pet.images.length > 0) {
        for (const image of pet.images) {
          try { await cloudinary.uploader.destroy(image.public_id); } 
          catch (cloudinaryError) { console.error('Cloudinary delete error:', cloudinaryError); }
        }
      }
  
      await Pet.findByIdAndDelete(req.params.id);
      await User.findByIdAndUpdate(req.user.id, { $pull: { personalPets: pet._id } });
  
      await logActivity({
        userId: req.user.id,
        role: req.user.role,
        action: 'Deleted Pet Listing',
        target: pet._id,
        targetModel: 'Pet',
        details: `Deleted personal listing for ${pet.name}`
      });
  
      res.json({ success: true, message: 'Pet listing deleted successfully' });
  
    } catch (error) {
      console.error('Delete personal pet error:', error);
      res.status(500).json({ success: false, msg: 'Server error deleting pet listing' });
    }
  };
  
  //  Get detailed listings with foster requests & analytics
  exports.getDetailedListings = async (req, res) => {
    try {
      const personalPets = await Pet.find({ owner: req.user.id, listingType: 'personal' })
        .populate('fosterRequests.user', 'name email avatar location')
        .populate('currentFoster', 'name email avatar')
        .sort({ createdAt: -1 })
        .select('name breed age gender status duration location images createdAt description fosterRequests currentFoster');
  
      const analytics = {
        total: personalPets.length,
        available: personalPets.filter(p => p.status === 'available_fostering').length,
        pendingRequests: personalPets.reduce((count, p) => count + (p.fosterRequests?.filter(r => r.status === 'pending').length || 0), 0),
        approvedRequests: personalPets.reduce((count, p) => count + (p.fosterRequests?.filter(r => r.status === 'approved').length || 0), 0),
        currentlyFostered: personalPets.filter(p => p.status === 'fostered').length,
        totalRequests: personalPets.reduce((count, p) => count + (p.fosterRequests?.length || 0), 0)
      };
  
      res.json({ success: true, listings: personalPets, analytics, totalListings: personalPets.length, timestamp: new Date().toISOString() });
  
    } catch (error) {
      console.error('Get detailed listings error:', error);
      res.status(500).json({ success: false, msg: 'Server error fetching your listings', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
  };
  
  // Start foster chat for a request
  exports.startFosterChat = async (req, res) => {
    try {
      const pet = await Pet.findById(req.params.id).populate('owner', 'name email').populate('fosterRequests.user', 'name email');
      if (!pet) return res.status(404).json({ success: false, msg: "Pet not found" });
  
      const isOwner = pet.owner._id.toString() === req.user.id;
      if (!isOwner) return res.status(403).json({ success: false, msg: "Access denied - You are not the owner of this pet" });
  
      const fosterRequest = pet.fosterRequests.id(req.params.requestId);
      if (!fosterRequest) return res.status(404).json({ msg: "Foster request not found" });
  
      if (fosterRequest.chatThread) {
        const existingChat = await FosterChat.findById(fosterRequest.chatThread).populate('participants.user', 'name email role');
        if (existingChat) return res.json({ success: true, msg: "Foster chat already exists", chatThreadId: fosterRequest.chatThread, existing: true, chat: existingChat });
      }
  
      const fosterChat = new FosterChat({
        participants: [
          { user: req.user.id, role: 'owner', lastReadAt: new Date(), joinedAt: new Date() },
          { user: fosterRequest.user._id || fosterRequest.user, role: 'foster_seeker', lastReadAt: new Date(), joinedAt: new Date() }
        ],
        fosterRequest: fosterRequest._id,
        pet: pet._id,
        lastMessage: `Foster chat started for ${pet.name}. ${fosterRequest.message ? `Initial interest: "${fosterRequest.message}"` : ''}`,
        lastMessageAt: new Date(),
        isActive: true
      });
  
      fosterChat.unreadCounts.set(req.user.id.toString(), 0);
      fosterChat.unreadCounts.set((fosterRequest.user._id || fosterRequest.user).toString(), 0);
  
      await fosterChat.save();
  
      fosterRequest.status = 'in_discussion';
      fosterRequest.chatThread = fosterChat._id;
      await pet.save();
  
      const populatedChat = await FosterChat.findById(fosterChat._id).populate('participants.user', 'name email role').populate('pet', 'name images');
  
      res.json({ success: true, msg: "Foster chat started successfully", chatThreadId: fosterChat._id, chat: populatedChat, fosterRequest });
  
    } catch (error) {
      console.error('Start foster chat error:', error);
      res.status(500).json({ success: false, msg: "Server Error", error: error.message });
    }
  };
  
  // Schedule meeting for a foster request
exports.scheduleFosterMeeting = async (req, res) => {
    try {
      const { meetingDate, meetingLocation, notes } = req.body;
  
      const pet = await Pet.findById(req.params.id);
      if (!pet) return res.status(404).json({ msg: "Pet not found" });
  
      if (!meetingDate || !meetingLocation) {
        return res.status(400).json({ msg: "Meeting date and location are required" });
      }
  
      const fosterRequest = pet.fosterRequests.id(req.params.requestId);
      if (!fosterRequest) return res.status(404).json({ msg: "Foster request not found" });
  
      const isOwner = pet.owner && pet.owner.toString() === req.user.id;
      const isRequester = fosterRequest.user.toString() === req.user.id;
  
      if (!isOwner && !isRequester) return res.status(403).json({ msg: "Access denied" });
  
      fosterRequest.status = 'meeting_scheduled';
      fosterRequest.meetingDate = meetingDate;
      fosterRequest.meetingLocation = meetingLocation;
      fosterRequest.notes = notes;
  
      await pet.save();
  
      res.json({ success: true, msg: "Meeting scheduled successfully", fosterRequest });
  
    } catch (error) {
      console.error('Schedule meeting error:', error);
      res.status(500).json({ success: false, msg: "Server Error", error: error.message });
    }
  };
  
  //  Get current user's foster requests
  exports.getMyFosterRequests = async (req, res) => {
    try {
      const petsWithUserRequests = await Pet.find({ 'fosterRequests.user': req.user.id })
        .populate('owner', 'name email avatar')
        .populate('fosterRequests.user', 'name email avatar')
        .select('name breed age gender description location images status fosterRequests listingType owner');
  
      const userFosterRequests = petsWithUserRequests.map(pet => {
        const userRequest = pet.fosterRequests.find(reqItem =>
          reqItem.user && reqItem.user._id.toString() === req.user.id
        );
        return userRequest ? { pet: {
          _id: pet._id,
          name: pet.name,
          breed: pet.breed,
          age: pet.age,
          gender: pet.gender,
          description: pet.description,
          location: pet.location,
          images: pet.images,
          status: pet.status,
          listingType: pet.listingType,
          owner: pet.owner
        }, fosterRequest: userRequest } : null;
      }).filter(item => item); // Remove nulls
  
      res.json({ success: true, requests: userFosterRequests, total: userFosterRequests.length });
  
    } catch (error) {
      console.error('Get foster requests error:', error);
      res.status(500).json({ success: false, msg: 'Server error fetching foster requests', error: error.message });
    }
  };

  
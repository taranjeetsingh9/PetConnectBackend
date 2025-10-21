const petFilesService = require('../services/petFilesService');
const { cloudinary } = require('../config/cloudinary');

// =======================
// CONTROLLER
// =======================

// Create personal pet listing
exports.createPersonalPet = async (req, res) => {
  try {
    const pet = await petFilesService.createPersonalPet(req.user, req.body, req.files);
    res.status(201).json({
      success: true,
      message: 'Personal pet listing created successfully!',
      pet,
      listingUrl: `/pets/${pet._id}`
    });
  } catch (error) {
    console.error('Create personal pet error:', error);

    // Cleanup uploaded files if error
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { await cloudinary.uploader.destroy(file.filename); } 
        catch (cleanupError) { console.error('Cleanup error:', cleanupError); }
      }
    }

    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Add images to personal pet listing
exports.addPetImages = async (req, res) => {
  try {
    const result = await petFilesService.addPetImages(req.user, req.params.id, req.files);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Add pet images error:', error);

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try { await cloudinary.uploader.destroy(file.filename); } 
        catch (cleanupError) { console.error('Cleanup error:', cleanupError); }
      }
    }

    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Get current user's listings
exports.getMyListings = async (req, res) => {
  try {
    const listings = await petFilesService.getMyListings(req.user);
    res.json({ success: true, listings, totalListings: listings.length });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Get all listings with filters
exports.getAllListings = async (req, res) => {
  try {
    const listings = await petFilesService.getAllListings(req.query);
    res.json({ success: true, listings, totalListings: listings.length });
  } catch (error) {
    console.error('Get all listings error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Update personal pet listing
exports.updatePersonalListing = async (req, res) => {
  try {
    const updatedPet = await petFilesService.updatePersonalListing(req.user, req.params.id, req.body);
    res.json({ success: true, message: 'Pet listing updated successfully', pet: updatedPet });
  } catch (error) {
    console.error('Update pet listing error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Delete personal pet listing
exports.deletePersonalListing = async (req, res) => {
  try {
    await petFilesService.deletePersonalListing(req.user, req.params.id);
    res.json({ success: true, message: 'Pet listing deleted successfully' });
  } catch (error) {
    console.error('Delete pet listing error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Get detailed listings & analytics
exports.getDetailedListings = async (req, res) => {
  try {
    const { listings, analytics, totalListings } = await petFilesService.getDetailedListings(req.user);
    res.json({ success: true, listings, analytics, totalListings, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Get detailed listings error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Start foster chat for a request
exports.startFosterChat = async (req, res) => {
  try {
    const result = await petFilesService.startFosterChat(req.user, req.params.id, req.params.requestId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Start foster chat error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Schedule meeting for foster request
exports.scheduleFosterMeeting = async (req, res) => {
  try {
    const fosterRequest = await petFilesService.scheduleFosterMeeting(req.user, req.params.id, req.params.requestId, req.body);
    res.json({ success: true, msg: "Meeting scheduled successfully", fosterRequest });
  } catch (error) {
    console.error('Schedule foster meeting error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

// Get current user's foster requests
exports.getMyFosterRequests = async (req, res) => {
  try {
    const requests = await petFilesService.getMyFosterRequests(req.user);
    res.json({ success: true, requests, total: requests.length });
  } catch (error) {
    console.error('Get my foster requests error:', error);
    res.status(error.status || 500).json({ success: false, msg: error.message });
  }
};

const Pet = require('../models/Pet');
const User = require('../models/User');
const FosterChat = require('../models/FosterChat');
const logActivity = require('../utils/logActivity');
const { cloudinary } = require('../config/cloudinary');

// Helper for errors
const createError = (msg, status = 400) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

// =======================
// PET LISTINGS SERVICE
// =======================

// Create personal pet listing
exports.createPersonalPet = async (user, data, files) => {
  const { name, breed, age, gender, description, careInstructions, duration, location, contactInfo } = data;

  if (!name || !description || !location) throw createError('Name, description, and location are required');
  if (!files || files.length === 0) throw createError('At least one image is required');

  const images = files.map((file, index) => ({
    url: file.path,
    public_id: file.filename,
    uploadedBy: user.id,
    caption: `Photo of ${name}`,
    isPrimary: index === 0
  }));

  const personalPet = new Pet({
    name,
    breed: breed || 'Mixed',
    age: age || 0,
    gender: gender || 'Unknown',
    description,
    careInstructions: careInstructions || 'Standard care required',
    location,
    contactInfo: contactInfo || `Contact ${user.name}`,
    listingType: 'personal',
    isPersonalListing: true,
    status: 'available_fostering',
    duration: duration || 'short_term',
    owner: user.id,
    images
  });

  await personalPet.save();

  await User.findByIdAndUpdate(user.id, { $push: { personalPets: personalPet._id } });

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Created Personal Pet Listing',
    target: personalPet._id,
    targetModel: 'Pet',
    details: `Created personal listing for ${name} - seeking fostering`
  });

  return personalPet;
};

// Add images to personal listing
exports.addPetImages = async (user, petId, files) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet listing not found', 404);
  if (pet.owner.toString() !== user.id) throw createError('You can only add images to your own pet listings', 403);
  if (!files || files.length === 0) throw createError('No images uploaded', 400);

  const newImages = files.map(file => ({
    url: file.path,
    public_id: file.filename,
    uploadedBy: user.id,
    caption: `Additional photo of ${pet.name}`
  }));

  pet.images.push(...newImages);
  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Added Pet Listing Images',
    target: pet._id,
    targetModel: 'Pet',
    details: `Added ${files.length} images to personal listing ${pet.name}`
  });

  return { newImages, totalImages: pet.images.length };
};

// Get user's personal listings
exports.getMyListings = async (user) => {
  const personalPets = await Pet.find({ owner: user.id, listingType: 'personal' })
    .sort({ createdAt: -1 })
    .select('name breed age gender status duration location images createdAt description');
  return personalPets;
};

// Get all personal listings (with filters)
exports.getAllListings = async (queryParams) => {
  const { location, duration, search } = queryParams;
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

  return listings;
};

// Update personal pet listing
exports.updatePersonalListing = async (user, petId, data) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet listing not found', 404);
  if (pet.owner.toString() !== user.id) throw createError('You can only update your own pet listings', 403);

  const updateFields = {};
  ['name', 'description', 'careInstructions', 'duration', 'location', 'contactInfo', 'status'].forEach(field => {
    if (data[field]) updateFields[field] = data[field];
  });

  const updatedPet = await Pet.findByIdAndUpdate(petId, { $set: updateFields }, { new: true });

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Updated Pet Listing',
    target: pet._id,
    targetModel: 'Pet',
    details: `Updated personal listing for ${pet.name}`
  });

  return updatedPet;
};

// Delete personal pet listing
exports.deletePersonalListing = async (user, petId) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet listing not found', 404);
  if (pet.owner.toString() !== user.id) throw createError('You can only delete your own pet listings', 403);

  // Delete images from Cloudinary
  if (pet.images && pet.images.length > 0) {
    for (const image of pet.images) {
      try { await cloudinary.uploader.destroy(image.public_id); }
      catch (err) { console.error('Cloudinary delete error:', err); }
    }
  }

  await Pet.findByIdAndDelete(petId);
  await User.findByIdAndUpdate(user.id, { $pull: { personalPets: pet._id } });

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Deleted Pet Listing',
    target: pet._id,
    targetModel: 'Pet',
    details: `Deleted personal listing for ${pet.name}`
  });

  return true;
};

// Get detailed listings with foster requests & analytics
exports.getDetailedListings = async (user) => {
  const personalPets = await Pet.find({ owner: user.id, listingType: 'personal' })
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

  return { listings: personalPets, analytics, totalListings: personalPets.length };
};

// Start foster chat for a request
exports.startFosterChat = async (user, petId, requestId) => {
  const pet = await Pet.findById(petId).populate('owner', 'name email').populate('fosterRequests.user', 'name email');
  if (!pet) throw createError("Pet not found", 404);

  const isOwner = pet.owner._id.toString() === user.id;
  if (!isOwner) throw createError("Access denied - You are not the owner of this pet", 403);

  const fosterRequest = pet.fosterRequests.id(requestId);
  if (!fosterRequest) throw createError("Foster request not found", 404);

  if (fosterRequest.chatThread) {
    const existingChat = await FosterChat.findById(fosterRequest.chatThread).populate('participants.user', 'name email role');
    if (existingChat) return { existing: true, chat: existingChat, chatThreadId: fosterRequest.chatThread, fosterRequest };
  }

  const fosterChat = new FosterChat({
    participants: [
      { user: user.id, role: 'owner', lastReadAt: new Date(), joinedAt: new Date() },
      { user: fosterRequest.user._id || fosterRequest.user, role: 'foster_seeker', lastReadAt: new Date(), joinedAt: new Date() }
    ],
    fosterRequest: fosterRequest._id,
    pet: pet._id,
    lastMessage: `Foster chat started for ${pet.name}. ${fosterRequest.message ? `Initial interest: "${fosterRequest.message}"` : ''}`,
    lastMessageAt: new Date(),
    isActive: true
  });

  fosterChat.unreadCounts.set(user.id.toString(), 0);
  fosterChat.unreadCounts.set((fosterRequest.user._id || fosterRequest.user).toString(), 0);

  await fosterChat.save();

  fosterRequest.status = 'in_discussion';
  fosterRequest.chatThread = fosterChat._id;
  await pet.save();

  const populatedChat = await FosterChat.findById(fosterChat._id).populate('participants.user', 'name email role').populate('pet', 'name images');

  return { success: true, chatThreadId: fosterChat._id, chat: populatedChat, fosterRequest };
};

// Schedule meeting for a foster request
exports.scheduleFosterMeeting = async (user, petId, requestId, meetingData) => {
  const { meetingDate, meetingLocation, notes } = meetingData;

  const pet = await Pet.findById(petId);
  if (!pet) throw createError("Pet not found", 404);

  if (!meetingDate || !meetingLocation) throw createError("Meeting date and location are required");

  const fosterRequest = pet.fosterRequests.id(requestId);
  if (!fosterRequest) throw createError("Foster request not found", 404);

  const isOwner = pet.owner.toString() === user.id;
  const isRequester = fosterRequest.user.toString() === user.id;

  if (!isOwner && !isRequester) throw createError("Access denied", 403);

  fosterRequest.status = 'meeting_scheduled';
  fosterRequest.meetingDate = meetingDate;
  fosterRequest.meetingLocation = meetingLocation;
  fosterRequest.notes = notes;

  await pet.save();
  return fosterRequest;
};

// Get current user's foster requests
exports.getMyFosterRequests = async (user) => {
  const petsWithUserRequests = await Pet.find({ 'fosterRequests.user': user.id })
    .populate('owner', 'name email avatar')
    .populate('fosterRequests.user', 'name email avatar')
    .select('name breed age gender description location images status fosterRequests listingType owner');

  const userFosterRequests = petsWithUserRequests.map(pet => {
    const userRequest = pet.fosterRequests.find(reqItem =>
      reqItem.user && reqItem.user._id.toString() === user.id
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

  return userFosterRequests;
};

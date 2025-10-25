const Pet = require('../models/Pet');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');
const cloudinary = require('../config/cloudinary'); // optional if using cloudinary for images
const softDeletePetRelations = require('../utils/cleanupRelations');
const createError = (msg, status = 400) => { const err = new Error(msg); err.status = status; return err; };

// Get pets (with adopter matching logic)
exports.getPets = async (user) => {
  let query = {};

  if (user.role === 'adopter') {
    query = { status: 'Available' };
    const matchingCriteria = [];

    if (user.lifestyle?.activityLevel) {
      const activity = user.lifestyle.activityLevel.toLowerCase();
      if (activity === 'high') matchingCriteria.push({ energyLevel: { $in: ['high', 'medium'] } });
      if (activity === 'medium') matchingCriteria.push({ energyLevel: { $in: ['medium', 'low'] } });
      if (activity === 'low') matchingCriteria.push({ energyLevel: 'low' });
    }

    if (matchingCriteria.length) query = { $and: [query, ...matchingCriteria] };
  }

  const pets = await Pet.find(query)
    .populate('vet', 'name email role')
    .limit(50);

  return pets;
};

// Get single pet by ID
exports.getPetById = async (petId) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);
  return pet;
};

// Create a new pet
exports.createPet = async (data, files, user) => {
  const images = files?.map((file, index) => ({
    url: file.path,
    public_id: file.filename,
    caption: `Photo of ${data.name}`,
    isPrimary: index === 0,
    uploadedBy: user.id
  })) || [];

  const newPet = new Pet({
    ...data,
    owner: user.id,
    status: 'Available',
    images
  });

  const pet = await newPet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Added Pet',
    target: pet._id,
    targetModel: 'Pet',
    details: `Pet "${pet.name}" added with ${images.length} images`
  });

  return pet;
};

// Update general pet info
exports.updatePet = async (petId, data) => {
  const pet = await Pet.findByIdAndUpdate(petId, { $set: data }, { new: true });
  if (!pet) throw createError('Pet not found', 404);
  return pet;
};

//--------------------------------------------------------
// Note: If in future team agrees to apply hard delete
//--------------------------------------------------------
// exports.deletePet = async (petId, user) => {
//   const pet = await Pet.findById(petId);
//   if (!pet) throw createError('Pet not found', 404);

//   await pet.deleteOne();

//   await logActivity({
//     userId: user.id,  
//     role: user.role,
//     action: 'Deleted Pet',
//     target: pet._id,
//     targetModel: 'Pet',
//     details: `Pet "${pet.name}" deleted`
//   });

//   return true;
// };

// Soft delete a pet
exports.deletePet = async (petId, user) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);

  //  Soft delete instead of hard delete
  pet.isDeleted = true;
  pet.deletedAt = new Date();
  pet.deletedBy = user.id;

  await pet.save();

  // Optional: remove vet association
  pet.vet = null;
  await pet.save();

  await softDeletePetRelations(pet._id);

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Soft Deleted Pet',
    target: pet._id,
    targetModel: 'Pet',
    details: `Pet "${pet.name}" marked as deleted by ${user.role}`
  });

  return { success: true, message: `Pet "${pet.name}" soft deleted successfully` };
};

// Update pet status
exports.updatePetStatus = async (petId, status, user) => {
  const allowedStatuses = [
    'Available','Fostered','Adopted','Ready for Treatment','In Treatment',
    'Ready for Adoption','Unavailable','In Training','Training Complete' // ADD THESE
  ];

  if (!status || !allowedStatuses.includes(status)) throw createError('Invalid status');

  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);

  // Only staff/admin can update status
  if (!['staff', 'admin'].includes(user.role)) throw createError('Access denied', 403);

  pet.status = status;
  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Updated Pet Status',
    target: pet._id,
    targetModel: 'Pet',
    details: `Pet "${pet.name}" status changed to "${status}"`
  });

  return pet;
};

// Update pet health notes
exports.updatePetHealth = async (petId, healthNotes, user) => {
  if (!healthNotes) throw createError('Health notes required');

  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);

  pet.healthHistory.push({ notes: healthNotes, updatedBy: user.id });
  pet.healthNotes = healthNotes;
  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Added Health Note',
    target: pet._id,
    targetModel: 'Pet',
    details: `Health note added: "${healthNotes}"`
  });

  return pet;
};

// Update pet health status (Good/Fair/Critical)
exports.updatePetHealthStatus = async (petId, status) => {
  if (!status) throw createError('Health status required');

  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);

  pet.healthNotes = status;
  await pet.save();

  return pet;
};

// Update training notes
exports.updateTrainingNotes = async (petId, trainingNotes, user) => {
  if (!trainingNotes) throw createError('Training notes required');

  const pet = await Pet.findByIdAndUpdate(petId, { $set: { trainingNotes } }, { new: true });
  if (!pet) throw createError('Pet not found', 404);

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Updated Training Note',
    target: pet._id,
    targetModel: 'Pet',
    details: `Training note updated: "${trainingNotes}"`
  });

  return pet;
};

// Assign vet to pet
exports.assignVet = async (petId, vetId, user) => {
  const vetUser = await User.findById(vetId);
  if (!vetUser || vetUser.role !== 'vet') throw createError('Provided user is not a vet');

  const pet = await Pet.findByIdAndUpdate(petId, { vet: vetId }, { new: true });
  if (!pet) throw createError('Pet not found', 404);

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Assigned Vet',
    target: pet._id,
    targetModel: 'Pet',
    details: `Vet "${vetUser.name}" assigned to pet "${pet.name}"`
  });

  return pet;
};

// Request adoption
exports.requestAdoption = async (petId, user) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);
  if (pet.status !== 'Available') throw createError('Pet is not available for adoption');

  pet.status = 'Pending Adoption';
  pet.adopter = user.id;
  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Requested Adoption',
    target: pet._id,
    targetModel: 'Pet',
    details: `Adoption requested for pet "${pet.name}"`
  });

  return pet;
};

// Request foster
exports.requestFoster = async (petId, user, message = '') => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);

  if (pet.owner?.toString() === user.id) throw createError('Cannot foster your own pet');

  // Check availability
  const isAvailable = pet.listingType === 'shelter' ? pet.status === 'Available'
                     : pet.listingType === 'personal' ? pet.status === 'available_fostering'
                     : false;

  if (!isAvailable) throw createError('Pet is not available for fostering');

  // Check pending requests
  const existing = pet.fosterRequests.find(r => r.user.toString() === user.id && r.status === 'pending');
  if (existing) throw createError('You already have a pending foster request');

  pet.fosterRequests.push({ user: user.id, message: message || `I would like to foster ${pet.name}` });
  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Submitted Foster Request',
    target: pet._id,
    targetModel: 'Pet',
    details: `Foster request submitted for ${pet.name}`
  });

  return { success: true, msg: 'Foster request submitted', requestId: pet.fosterRequests.slice(-1)[0]._id };
};

// Get foster requests
exports.getFosterRequests = async (petId, user) => {
  const pet = await Pet.findById(petId).populate('fosterRequests.user', 'name email avatar location');
  if (!pet) throw createError('Pet not found', 404);

  const isOwner = pet.owner?.toString() === user.id;
  const isStaff = ['staff', 'admin'].includes(user.role);
  if (!isOwner && !isStaff) throw createError('Access denied', 403);

  return { success: true, fosterRequests: pet.fosterRequests, petName: pet.name };
};

// Approve / Reject foster request
exports.handleFosterRequest = async (petId, requestId, action, user) => {
  const pet = await Pet.findById(petId);
  if (!pet) throw createError('Pet not found', 404);

  const isOwner = pet.owner?.toString() === user.id;
  const isStaff = ['staff', 'admin'].includes(user.role);
  if (!isOwner && !isStaff) throw createError('Access denied', 403);

  const fosterRequest = pet.fosterRequests.id(requestId);
  if (!fosterRequest) throw createError('Foster request not found', 404);

  if (action === 'approve') {
    pet.fosterRequests.forEach(r => r._id.toString() === requestId ? r.status = 'approved' : r.status === 'pending' ? r.status = 'rejected' : r.status);
    pet.status = pet.listingType === 'shelter' ? 'Fostered' : 'fostered';
    pet.currentFoster = fosterRequest.user;
  } else if (action === 'reject') {
    fosterRequest.status = 'rejected';
  } else throw createError('Invalid action');

  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: action === 'approve' ? 'Approved Foster Request' : 'Rejected Foster Request',
    target: pet._id,
    targetModel: 'Pet',
    details: `${action === 'approve' ? 'Approved' : 'Rejected'} foster request for ${pet.name}`
  });

  return pet;
};

// Browse pets with filters
exports.browsePets = async (queryParams) => {
  let query = {};
  const { type, location, search } = queryParams;

  if (type === 'adoption') query = { listingType: 'shelter', status: 'Available' };
  else if (type === 'fostering') query = { $or: [ { listingType: 'shelter', status: 'Available' }, { listingType: 'personal', status: 'available_fostering' } ] };
  else query = { $or: [ { listingType: 'shelter', status: 'Available' }, { listingType: 'personal', status: 'available_fostering' } ] };

  if (location) query.location = new RegExp(location, 'i');
  if (search) query.$or = [ { name: new RegExp(search, 'i') }, { breed: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') } ];

  const pets = await Pet.find(query)
    .populate('owner', 'name email avatar location')
    .populate('organization', 'name type')
    .select('name breed age gender description location images status listingType owner createdAt')
    .sort({ createdAt: -1 })
    .limit(50);

  return { success: true, pets, total: pets.length, filters: queryParams };
};

// Get current user info
exports.getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw createError('User not found', 404);
  return user;
};

// test trainer
// Get pets available for trainer assignment
exports.getPetsAvailableForTraining = async () => {
  try {
    // Just get ALL pets - staff can assign trainers to any pet
    const pets = await Pet.find({})
      .populate('organization', 'name')
      .populate('trainer', 'name email')
      .select('name breed age gender status images')
      .sort({ name: 1 });

    console.log(`📊 Showing ALL ${pets.length} pets for trainer assignment`);
    return pets;
  } catch (error) {
    console.error('Error getting pets:', error);
    throw error;
  }
};


// Assign trainer to pet
exports.assignTrainerToPet = async (petId, trainerId, trainingData, user) => {
  const { trainingNotes, estimatedDuration } = trainingData;

  if (!trainerId) {
    throw createError('Trainer ID is required');
  }

  // Verify pet exists
  const pet = await Pet.findById(petId);
  if (!pet) {
    throw createError('Pet not found', 404);
  }

  // Verify trainer exists and is actually a trainer
  const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
  if (!trainer) {
    throw createError('Trainer not found', 404);
  }

  // Assign trainer to pet
  pet.trainer = trainerId;
  pet.status = 'In Training';
  if (trainingNotes) pet.trainingNotes = trainingNotes;
  if (estimatedDuration) pet.trainingDuration = estimatedDuration;

  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Assigned Trainer to Pet',
    target: petId,
    targetModel: 'Pet',
    details: `Assigned ${pet.name} to trainer ${trainer.name}`
  });

  return pet;
};

// Get pets currently assigned to trainers
exports.getPetsWithTrainers = async () => {
  const pets = await Pet.find({ 
    trainer: { $exists: true, $ne: null }
  })
  .populate('trainer', 'name email')
  .populate('organization', 'name')
  .select('name breed age gender status trainer trainingNotes trainingDuration')
  .sort({ name: 1 });

  return pets;
};

// Remove trainer assignment
exports.removeTrainerFromPet = async (petId, user) => {
  const pet = await Pet.findById(petId);
  if (!pet) {
    throw createError('Pet not found', 404);
  }

  // Remove trainer assignment
  pet.trainer = undefined;
  pet.status = 'Available';
  await pet.save();

  await logActivity({
    userId: user.id,
    role: user.role,
    action: 'Removed Trainer Assignment',
    target: petId,
    targetModel: 'Pet',
    details: `Removed trainer assignment for ${pet.name}`
  });

  return pet;
};

// Get all trainers (for dropdown selection)
exports.getAllTrainers = async () => {
  const trainers = await User.find({ role: 'trainer' })
    .select('name email specialization experience yearsExperience')
    .sort({ name: 1 });

  return trainers;
};

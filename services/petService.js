const Pet = require('../models/Pet');
const User = require('../models/User');
const logActivity = require('../utils/logActivity');
const softDeletePetRelations = require('../utils/cleanupRelations');
const cloudinary = require('../config/cloudinary'); // optional if used
const createError = (msg, status = 400) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

class PetService {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  // --------------------------- GET PETS --------------------------- //
  async getPets(user) {
    let query = {};

    if (user.role === 'adopter') {
      query = { status: 'Available' };
      const matchingCriteria = [];

      if (user.lifestyle?.activityLevel) {
        const activity = user.lifestyle.activityLevel.toLowerCase();
        if (activity === 'high')
          matchingCriteria.push({ energyLevel: { $in: ['high', 'medium'] } });
        if (activity === 'medium')
          matchingCriteria.push({ energyLevel: { $in: ['medium', 'low'] } });
        if (activity === 'low') matchingCriteria.push({ energyLevel: 'low' });
      }

      if (matchingCriteria.length)
        query = { $and: [query, ...matchingCriteria] };
    }

    const pets = await Pet.find(query)
      .populate('vet', 'name email role')
      .limit(50);

    return pets;
  }

  // --------------------------- GET SINGLE PET --------------------------- //
  async getPetById(petId) {
    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);
    return pet;
  }

  // --------------------------- CREATE PET --------------------------- //
  async createPet(data, files, user) {
    const images =
      files?.map((file, index) => ({
        url: file.path,
        public_id: file.filename,
        caption: `Photo of ${data.name}`,
        isPrimary: index === 0,
        uploadedBy: user.id,
      })) || [];

    const newPet = new Pet({
      ...data,
      owner: user.id,
      status: 'Available',
      images,
    });

    const pet = await newPet.save();

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Added Pet',
      target: pet._id,
      targetModel: 'Pet',
      details: `Pet "${pet.name}" added with ${images.length} images`,
    });

    return pet;
  }

  // --------------------------- UPDATE PET INFO --------------------------- //
  async updatePet(petId, data) {
    const pet = await Pet.findByIdAndUpdate(petId, { $set: data }, { new: true });
    if (!pet) throw createError('Pet not found', 404);
    return pet;
  }

  // --------------------------- SOFT DELETE --------------------------- //
  async deletePet(petId, user) {
    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);

    pet.isDeleted = true;
    pet.deletedAt = new Date();
    pet.deletedBy = user.id;
    pet.vet = null;
    await pet.save();

    await softDeletePetRelations(pet._id);

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Soft Deleted Pet',
      target: pet._id,
      targetModel: 'Pet',
      details: `Pet "${pet.name}" marked as deleted by ${user.role}`,
    });

    return { success: true, message: `Pet "${pet.name}" soft deleted successfully` };
  }

  // --------------------------- UPDATE STATUS --------------------------- //
  async updatePetStatus(petId, status, user) {
    const allowedStatuses = [
      'Available','Fostered','Adopted','Ready for Treatment','In Treatment',
      'Ready for Adoption','Unavailable','In Training','Training Complete'
    ];

    if (!status || !allowedStatuses.includes(status))
      throw createError('Invalid status');

    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);

    if (!['staff', 'admin'].includes(user.role))
      throw createError('Access denied', 403);

    pet.status = status;
    await pet.save();

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Updated Pet Status',
      target: pet._id,
      targetModel: 'Pet',
      details: `Pet "${pet.name}" status changed to "${status}"`,
    });

    return pet;
  }

  // --------------------------- HEALTH NOTES --------------------------- //
  async updatePetHealth(petId, healthNotes, user) {
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
      details: `Health note added: "${healthNotes}"`,
    });

    return pet;
  }

  async updatePetHealthStatus(petId, status) {
    if (!status) throw createError('Health status required');

    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);

    pet.healthNotes = status;
    await pet.save();
    return pet;
  }

  // --------------------------- TRAINING --------------------------- //
  async updateTrainingNotes(petId, trainingNotes, user) {
    if (!trainingNotes) throw createError('Training notes required');

    const pet = await Pet.findByIdAndUpdate(
      petId,
      { $set: { trainingNotes } },
      { new: true }
    );
    if (!pet) throw createError('Pet not found', 404);

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Updated Training Note',
      target: pet._id,
      targetModel: 'Pet',
      details: `Training note updated: "${trainingNotes}"`,
    });

    return pet;
  }

  // --------------------------- VET ASSIGNMENT --------------------------- //
  async assignVet(petId, vetId, user) {
    const vetUser = await User.findById(vetId);
    if (!vetUser || vetUser.role !== 'vet')
      throw createError('Provided user is not a vet');

    const pet = await Pet.findByIdAndUpdate(petId, { vet: vetId }, { new: true });
    if (!pet) throw createError('Pet not found', 404);

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Assigned Vet',
      target: pet._id,
      targetModel: 'Pet',
      details: `Vet "${vetUser.name}" assigned to pet "${pet.name}"`,
    });

    return pet;
  }

  // --------------------------- ADOPTION --------------------------- //
  async requestAdoption(petId, user) {
    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);
    if (pet.status !== 'Available')
      throw createError('Pet is not available for adoption');

    pet.status = 'Pending Adoption';
    pet.adopter = user.id;
    await pet.save();

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Requested Adoption',
      target: pet._id,
      targetModel: 'Pet',
      details: `Adoption requested for pet "${pet.name}"`,
    });

    return pet;
  }

  // --------------------------- FOSTER --------------------------- //
  async requestFoster(petId, user, message = '') {
    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);
    if (pet.owner?.toString() === user.id)
      throw createError('Cannot foster your own pet');

    const isAvailable =
      pet.listingType === 'shelter'
        ? pet.status === 'Available'
        : pet.listingType === 'personal'
        ? pet.status === 'available_fostering'
        : false;

    if (!isAvailable) throw createError('Pet is not available for fostering');

    const existing = pet.fosterRequests.find(
      (r) => r.user.toString() === user.id && r.status === 'pending'
    );
    if (existing) throw createError('You already have a pending foster request');

    pet.fosterRequests.push({
      user: user.id,
      message: message || `I would like to foster ${pet.name}`,
    });
    await pet.save();

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Submitted Foster Request',
      target: pet._id,
      targetModel: 'Pet',
      details: `Foster request submitted for ${pet.name}`,
    });

    return { success: true, msg: 'Foster request submitted', requestId: pet.fosterRequests.slice(-1)[0]._id };
  }

  async getFosterRequests(petId, user) {
    const pet = await Pet.findById(petId).populate('fosterRequests.user', 'name email avatar location');
    if (!pet) throw createError('Pet not found', 404);

    const isOwner = pet.owner?.toString() === user.id;
    const isStaff = ['staff', 'admin'].includes(user.role);
    if (!isOwner && !isStaff) throw createError('Access denied', 403);

    return { success: true, fosterRequests: pet.fosterRequests, petName: pet.name };
  }

  async handleFosterRequest(petId, requestId, action, user) {
    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);

    const isOwner = pet.owner?.toString() === user.id;
    const isStaff = ['staff', 'admin'].includes(user.role);
    if (!isOwner && !isStaff) throw createError('Access denied', 403);

    const fosterRequest = pet.fosterRequests.id(requestId);
    if (!fosterRequest) throw createError('Foster request not found', 404);

    if (action === 'approve') {
      pet.fosterRequests.forEach((r) =>
        r._id.toString() === requestId
          ? (r.status = 'approved')
          : r.status === 'pending'
          ? (r.status = 'rejected')
          : r.status
      );
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
      details: `${action === 'approve' ? 'Approved' : 'Rejected'} foster request for ${pet.name}`,
    });

    return pet;
  }

  // --------------------------- BROWSE PETS --------------------------- //
  async browsePets(queryParams) {
    let query = {};
    const { type, location, search } = queryParams;

    if (type === 'adoption') query = { listingType: 'shelter', status: 'Available' };
    else if (type === 'fostering')
      query = {
        $or: [
          { listingType: 'shelter', status: 'Available' },
          { listingType: 'personal', status: 'available_fostering' },
        ],
      };
    else
      query = {
        $or: [
          { listingType: 'shelter', status: 'Available' },
          { listingType: 'personal', status: 'available_fostering' },
        ],
      };

    if (location) query.location = new RegExp(location, 'i');
    if (search)
      query.$or = [
        { name: new RegExp(search, 'i') },
        { breed: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];

    const pets = await Pet.find(query)
      .populate('owner', 'name email avatar location')
      .populate('organization', 'name type')
      .select('name breed age gender description location images status listingType owner createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    return { success: true, pets, total: pets.length, filters: queryParams };
  }

  // --------------------------- TRAINER MANAGEMENT --------------------------- //
  async getPetsAvailableForTraining() {
    const pets = await Pet.find({})
      .populate('organization', 'name')
      .populate('trainer', 'name email')
      .select('name breed age gender status images')
      .sort({ name: 1 });

    this.logger.log(`📊 Showing ALL ${pets.length} pets for trainer assignment`);
    return pets;
  }

  async assignTrainerToPet(petId, trainerId, trainingData, user) {
    const { trainingNotes, estimatedDuration } = trainingData;
    if (!trainerId) throw createError('Trainer ID is required');

    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);

    const trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
    if (!trainer) throw createError('Trainer not found', 404);

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
      details: `Assigned ${pet.name} to trainer ${trainer.name}`,
    });

    return pet;
  }

  async getPetsWithTrainers() {
    const pets = await Pet.find({
      trainer: { $exists: true, $ne: null },
    })
      .populate('trainer', 'name email')
      .populate('organization', 'name')
      .select('name breed age gender status trainer trainingNotes trainingDuration')
      .sort({ name: 1 });

    return pets;
  }

  async removeTrainerFromPet(petId, user) {
    const pet = await Pet.findById(petId);
    if (!pet) throw createError('Pet not found', 404);

    pet.trainer = undefined;
    pet.status = 'Available';
    await pet.save();

    await logActivity({
      userId: user.id,
      role: user.role,
      action: 'Removed Trainer Assignment',
      target: petId,
      targetModel: 'Pet',
      details: `Removed trainer assignment for ${pet.name}`,
    });

    return pet;
  }

  async getAllTrainers() {
    return User.find({ role: 'trainer' })
      .select('name email specialization experience yearsExperience')
      .sort({ name: 1 });
  }

  // --------------------------- CURRENT USER --------------------------- //
  async getCurrentUser(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw createError('User not found', 404);
    return user;
  }
}

// --------------------------- EXPORTS --------------------------- //
const petService = new PetService();

//  Backward compatible exports
module.exports = {
  PetService,
  petService,

  // legacy function bindings for current controllers
  getPets: petService.getPets.bind(petService),
  getPetById: petService.getPetById.bind(petService),
  createPet: petService.createPet.bind(petService),
  updatePet: petService.updatePet.bind(petService),
  deletePet: petService.deletePet.bind(petService),
  updatePetStatus: petService.updatePetStatus.bind(petService),
  updatePetHealth: petService.updatePetHealth.bind(petService),
  updatePetHealthStatus: petService.updatePetHealthStatus.bind(petService),
  updateTrainingNotes: petService.updateTrainingNotes.bind(petService),
  assignVet: petService.assignVet.bind(petService),
  requestAdoption: petService.requestAdoption.bind(petService),
  requestFoster: petService.requestFoster.bind(petService),
  getFosterRequests: petService.getFosterRequests.bind(petService),
  handleFosterRequest: petService.handleFosterRequest.bind(petService),
  browsePets: petService.browsePets.bind(petService),
  getPetsAvailableForTraining: petService.getPetsAvailableForTraining.bind(petService),
  assignTrainerToPet: petService.assignTrainerToPet.bind(petService),
  getPetsWithTrainers: petService.getPetsWithTrainers.bind(petService),
  removeTrainerFromPet: petService.removeTrainerFromPet.bind(petService),
  getAllTrainers: petService.getAllTrainers.bind(petService),
  getCurrentUser: petService.getCurrentUser.bind(petService),
};

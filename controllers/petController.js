const petService = require('../services/petService');

// GET /api/pets
exports.getPets = async (req, res) => {
  try {
    const pets = await petService.getPets(req.user);
    res.json(pets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET /api/pets/:id
exports.getPetById = async (req, res) => {
  try {
    const pet = await petService.getPetById(req.params.id);
    res.json(pet);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// POST /api/pets
exports.createPet = async (req, res) => {
  try {
    const pet = await petService.createPet(req.body, req.files, req.user);
    res.json(pet);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id
exports.updatePet = async (req, res) => {
  try {
    const pet = await petService.updatePet(req.params.id, req.body);
    res.json({ msg: 'Pet updated successfully', pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// DELETE /api/pets/:id
exports.deletePet = async (req, res) => {
  try {
    await petService.deletePet(req.params.id, req.user);
    res.json({ msg: 'Pet removed successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/status
exports.updatePetStatus = async (req, res) => {
  try {
    const pet = await petService.updatePetStatus(req.params.id, req.body.status, req.user);
    res.json({ msg: `Pet status updated to ${pet.status}`, pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/details
exports.updatePetDetails = async (req, res) => {
  try {
    const pet = await petService.updatePetDetails(req.params.id, req.body, req.user);
    res.json(pet);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/health
exports.updatePetHealth = async (req, res) => {
  try {
    const pet = await petService.updatePetHealth(req.params.id, req.body.healthNotes, req.user);
    res.json({ msg: 'Health note added', pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/health-status
exports.updatePetHealthStatus = async (req, res) => {
  try {
    const pet = await petService.updatePetHealthStatus(req.params.id, req.body.status);
    res.json({ msg: `Health status updated to ${pet.healthNotes}`, pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/training
exports.updateTrainingNotes = async (req, res) => {
  try {
    const pet = await petService.updateTrainingNotes(req.params.id, req.body.trainingNotes, req.user);
    res.json({ msg: 'Training notes updated', pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/assign-vet
exports.assignVet = async (req, res) => {
  try {
    const pet = await petService.assignVet(req.params.id, req.body.vetId, req.user);
    res.json({ msg: `Vet assigned`, pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// POST /api/pets/:id/adopt
exports.requestAdoption = async (req, res) => {
  try {
    const pet = await petService.requestAdoption(req.params.id, req.user);
    res.json({ msg: 'Adoption request submitted', pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// POST /api/pets/:id/foster
exports.requestFoster = async (req, res) => {
  try {
    const request = await petService.requestFoster(req.params.id, req.user, req.body.message);
    res.json(request);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// GET /api/pets/:id/foster-requests
exports.getFosterRequests = async (req, res) => {
  try {
    const fosterRequests = await petService.getFosterRequests(req.params.id, req.user);
    res.json(fosterRequests);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// PATCH /api/pets/:id/foster-requests/:requestId
exports.handleFosterRequest = async (req, res) => {
  try {
    const pet = await petService.handleFosterRequest(req.params.id, req.params.requestId, req.body.action, req.user);
    res.json({ success: true, msg: `Foster request ${req.body.action}d`, pet });
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// GET /api/pets/browse/all
exports.browsePets = async (req, res) => {
  try {
    const result = await petService.browsePets(req.query);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

// GET /api/pets/me
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await petService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};



// test
// Get pets available for trainer assignment
exports.getPetsAvailableForTraining = async (req, res) => {
  try {
    const pets = await petService.getPetsAvailableForTraining();
    
    res.json({
      success: true,
      pets
    });
  } catch (error) {
    console.error('Get available pets error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching available pets'
    });
  }
};

// Assign trainer to pet
exports.assignTrainerToPet = async (req, res) => {
  try {
    const { id } = req.params;
    const { trainerId, trainingNotes, estimatedDuration } = req.body;

    const pet = await petService.assignTrainerToPet(
      id, 
      trainerId, 
      { trainingNotes, estimatedDuration }, 
      req.user
    );

    res.json({
      success: true,
      message: `Pet ${pet.name} assigned to trainer successfully`,
      pet
    });

  } catch (error) {
    console.error('Assign trainer error:', error);
    
    if (error.message === 'Pet not found' || error.message === 'Trainer not found') {
      return res.status(404).json({
        success: false,
        msg: error.message
      });
    }
    
    if (error.message === 'Trainer ID is required') {
      return res.status(400).json({
        success: false,
        msg: error.message
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Server error while assigning trainer'
    });
  }
};

// Get pets currently assigned to trainers
exports.getPetsWithTrainers = async (req, res) => {
  try {
    const pets = await petService.getPetsWithTrainers();

    res.json({
      success: true,
      pets
    });
  } catch (error) {
    console.error('Get assigned pets error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching assigned pets'
    });
  }
};

// Remove trainer assignment
exports.removeTrainerFromPet = async (req, res) => {
  try {
    const { id } = req.params;

    const pet = await petService.removeTrainerFromPet(id, req.user);

    res.json({
      success: true,
      message: 'Trainer assignment removed successfully',
      pet
    });

  } catch (error) {
    console.error('Remove trainer error:', error);
    
    if (error.message === 'Pet not found') {
      return res.status(404).json({
        success: false,
        msg: error.message
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Server error while removing trainer assignment'
    });
  }
};

// Get all trainers
exports.getAllTrainers = async (req, res) => {
  try {
    const trainers = await petService.getAllTrainers();

    res.json({
      success: true,
      trainers
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching trainers'
    });
  }
};

// Get trainer for specific pet test
// GET /api/pets/:id/trainer
exports.getPetWithTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await petService.getPetWithTrainer(id);

    if (!result.success) {
      return res.status(result.status || 404).json({
        success: false,
        msg: result.msg
      });
    }

    res.json({
      success: true,
      pet: result.pet
    });

  } catch (error) {
    console.error('Get pet with trainer error:', error);
    res.status(500).json({
      success: false,
      msg: 'Server error while fetching pet trainer information'
    });
  }
};
// test end

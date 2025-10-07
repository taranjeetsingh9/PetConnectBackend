const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const User = require('../models/User'); // Required to check user role
const auth = require('../middleware/auth'); // Existing JWT verification middleware
const isVet = require('../middleware/isVet'); // custom middleware to allow only vets
const logActivity = require('../utils/logActivity');

// --- RBAC Middleware --- implemented for security and flow of the application
// Checks if the authenticated user has one of the required roles. -- don't forget to move to separate middleware will do before final check.
const roleAuth = (allowedRoles) => async (req, res, next) => {
    // This middleware runs after 'auth', so req.user.id is always available.
    try {
        // Fetch only the role for efficiency
        const user = await User.findById(req.user.id).select('role');

        if (!user || !allowedRoles.includes(user.role)) {
            console.log(`Access denied for user ${req.user.id} with role ${user ? user.role : 'none'}`);
            return res.status(403).json({ msg: 'Access denied: Insufficient role permissions' });
        }
        
        req.userRole = user.role; 
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during role check');
    }
};



// GET /api/pets
router.get("/", auth, async (req, res) => {
  try {
    // Get current user role + lifestyle (if any)
    const user = await User.findById(req.user.id).select("role lifestyle");

    // Default query: ALL pets (staff/admin/vet/trainer should see everything)
    let query = {};

    // If logged-in user is an adopter, show only Available pets and apply matching
    if (user && user.role === "adopter") {
      query = { status: "Available" };
      const lifestyle = user.lifestyle || {};
      const matchingCriteria = [];

      if (lifestyle.activityLevel) {
        const userActivity = lifestyle.activityLevel.toLowerCase();
        if (userActivity === "high") {
          matchingCriteria.push({ energyLevel: { $in: ["high", "medium"] } });
        } else if (userActivity === "medium") {
          matchingCriteria.push({ energyLevel: { $in: ["medium", "low"] } });
        } else if (userActivity === "low") {
          matchingCriteria.push({ energyLevel: "low" });
        }
      }

      if (matchingCriteria.length > 0) {
        query = { $and: [query, ...matchingCriteria] };
        console.log(`Adopter matching applied: ${lifestyle.activityLevel}`);
      }
    }

    // Query and return pets
    const pets = await Pet.find(query).
    populate("vet", "name email role").
    limit(50);
    return res.json(pets);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server Error");
  }
});

// @route   POST /api/pets
// @desc    Create a new pet record. Restricted to Staff/Admin.
// @access  Private (Requires 'staff' or 'admin' role)
router.post('/', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  const { name, breed, age, gender, energyLevel, temperament, organization } = req.body;
  
  try {
    const newPet = new Pet({
      name,
      breed,
      age,
      gender,
      energyLevel,
      temperament,
      organization: organization, 
      owner: req.user.id,
      status: 'Available'
    });


    const pet = await newPet.save();

    // Log the activity BEFORE sending response
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Added Pet',
      target: pet._id,
      targetModel: 'Pet',
      details: `Pet "${pet.name}" added by ${req.user.name}`
    });

    res.json(pet);

   

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// PATCH /api/pets/:id/status — update pet status by staff/admin
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    // allowed status list
    const allowedStatuses = [
      'Available',
      'Fostered',
      'Adopted',
      'Ready for Treatment',
      'In Treatment',
      'Ready for Adoption',
      'Unavailable'
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ msg: 'Invalid or missing status value.' });
    }

    // find pet
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ msg: 'Pet not found.' });
    }

    // optional: verify user is staff/admin before allowing update
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ msg: 'Unauthorized user.' });
    }
    if (!['staff', 'admin'].includes(user.role)) {
      return res.status(403).json({ msg: 'Access denied. Only staff or admin can update status.' });
    }

    // update status
    pet.status = status;
    await pet.save();

    await logActivity({
      userId: req.user.id,
      role: user.role,
      action: 'Updated Pet Status',
      target: pet._id,
      targetModel: 'Pet',
      details: `Pet "${pet.name}" status changed to "${status}" by ${user.name}`
    });

    res.json({
      msg: `Pet status updated successfully to "${status}"`,
      pet
    });
  } catch (err) {
    console.error('Error updating pet status:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});


// @route   PATCH /api/pets/:id/details
// @desc    Update a pet's health/behavior details. Restricted to Vet/Trainer/Admin.
// @access  Private (Requires 'vet', 'trainer', or 'admin' role)
router.patch('/:id/details', auth, roleAuth(['vet', 'trainer', 'admin']), async (req, res) => {
    const { medicalHistory, vaccinations, temperament, specialNeeds } = req.body;
    
    // Build update object based on allowed fields (Vet/Trainer focus)
    const updateFields = {};
    if (medicalHistory) updateFields.medicalHistory = medicalHistory;
    if (vaccinations) updateFields.vaccinations = vaccinations;
    if (temperament) updateFields.temperament = temperament;
    if (specialNeeds) updateFields.specialNeeds = specialNeeds;

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ msg: 'No valid update fields provided.' });
    }

    try {
        const pet = await Pet.findByIdAndUpdate(
            req.params.id, 
            { $set: updateFields },
            { new: true }
        );

        if (!pet) return res.status(404).json({ msg: 'Pet not found' });
        await logActivity({
          userId: req.user.id,
          role: req.userRole,
          action: 'Updated Pet Details',
          target: pet._id,
          targetModel: 'Pet',
          details: `Updated fields: ${Object.keys(updateFields).join(', ')}`
        });
        res.json(pet);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET /api/pets/me
// @desc    Get the current user's full details for Dashboard setup
// @access  Private (Requires authentication)
router.get('/me', auth, async (req, res) => {
    try {
        // Fetch the entire user object (minus password)
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/pets/:id
// @desc    Delete a pet. Restricted to Staff/Admin.
// @access  Private (Requires 'staff' or 'admin' role)
router.delete('/:id', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
      const pet = await Pet.findById(req.params.id);

      if (!pet) {
          return res.status(404).json({ msg: 'Pet not found' });
      }

      await pet.deleteOne(); // removes from DB
      await logActivity({
        userId: req.user.id,
        role: req.user.role,
        action: 'Deleted Pet',
        target: pet._id,
        targetModel: 'Pet',
        details: `Pet "${pet.name}" deleted by ${req.user.name}`
      });
      
      res.json({ msg: 'Pet removed successfully' });

  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
});

// @route   GET /api/pets/:id
// @desc    Get a single pet by ID
// @access  Private (Requires authentication)
router.get("/:id", auth, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ msg: "Pet not found" });
    res.json(pet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/pets/:id/adopt
// @desc    Request adoption for a pet
// @access  Private (Adopter role only)
router.post('/:id/adopt', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ msg: "Pet not found" });

    if (pet.status !== "Available") {
      return res.status(400).json({ msg: "Pet is not available for adoption" });
    }

    pet.status = "Pending Adoption";
    pet.adopter = req.user.id; // store adopter reference
    await pet.save();
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Requested Adoption',
      target: pet._id,
      targetModel: 'Pet',
      details: `User requested adoption for pet "${pet.name}"`
    });
    res.json({ msg: "Adoption request submitted", pet });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/pets/:id/foster
// @desc    Request foster for a pet
// @access  Private (Adopter role only)
router.post('/:id/foster', auth, roleAuth(['adopter']), async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ msg: "Pet not found" });

    if (pet.status !== "Available") {
      return res.status(400).json({ msg: "Pet is not available for foster" });
    }

    pet.status = "Pending Foster";
    pet.fosterer = req.user.id; // store fosterer reference
    await pet.save();
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Requested Foster',
      target: pet._id,
      targetModel: 'Pet',
      details: `User requested foster for pet "${pet.name}"`
    });
    
    res.json({ msg: "Foster request submitted", pet });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// update health and training 
router.patch("/:id/health", auth, async (req, res) => {
  try {
    const { healthNotes } = req.body;

    if (!healthNotes) {
      return res.status(400).json({ msg: "Health notes are required" });
    }

    const pet = await Pet.findByIdAndUpdate(
      req.params.id,
      { $set: { healthNotes } },
      { new: true }
    );

    if (!pet) {
      return res.status(404).json({ msg: "Pet not found" });
    }

    res.json({ msg: "Health notes updated", pet });
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Added Health Note',
      target: pet._id,
      targetModel: 'Pet',
      details: `Health note added: "${healthNotes}"`
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// =============================
// Update Training Notes (Trainer)
// =============================
router.patch("/:id/training", auth, async (req, res) => {
  try {
    const { trainingNotes } = req.body;

    if (!trainingNotes) {
      return res.status(400).json({ msg: "Training notes are required" });
    }

    const pet = await Pet.findByIdAndUpdate(
      req.params.id,
      { $set: { trainingNotes } },
      { new: true }
    );

    if (!pet) {
      return res.status(404).json({ msg: "Pet not found" });
    }

    res.json({ msg: "Training notes updated", pet });
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Updated Training Note',
      target: pet._id,
      targetModel: 'Pet',
      details: `Training note updated: "${trainingNotes}"`
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// pet health patch 
// PATCH /api/pets/:id/health
router.patch('/:id/health', auth, isVet, async (req, res) => {
  try {
    const petId = req.params.id;
    const { healthNotes } = req.body;
    if (!healthNotes) return res.status(400).json({ msg: "Health notes required" });

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ msg: "Pet not found" });

    // Add to health history
    pet.healthHistory.push({
      notes: healthNotes,
      updatedBy: req.user.id // from auth middleware
    });

    // Update latest note
    pet.healthNotes = healthNotes;

    await pet.save();
    res.json({ msg: "Health note added successfully", pet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.patch('/:id/health-status', auth, isVet, async (req, res) => {
  try {
    const { status } = req.body; // e.g., "Good", "Fair", "Critical"
    if (!status) return res.status(400).json({ msg: 'Health status required' });

    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ msg: 'Pet not found' });

    pet.healthNotes = status;
    await pet.save();
    res.json({ msg: `Health status updated to ${status}`, pet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// @route   PATCH /api/pets/:id/assign-vet
// @desc    Assign a vet to a pet
// @access  Private (Staff/Admin only)
router.patch('/:id/assign-vet', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  const { vetId } = req.body; // ID of the vet to assign

  if (!vetId) return res.status(400).json({ msg: 'Vet ID is required' });

  try {
    // Ensure the user exists and is a vet
    const vetUser = await User.findById(vetId);
    if (!vetUser || vetUser.role !== 'vet') {
      return res.status(400).json({ msg: 'Provided user is not a vet' });
    }

    const pet = await Pet.findByIdAndUpdate(
      req.params.id,
      { $set: { vet: vetId } },
      { new: true }
    );

    if (!pet) return res.status(404).json({ msg: 'Pet not found' });

    res.json({ msg: `Vet ${vetUser.name} assigned to pet`, pet }); // vet assigned
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Assigned Vet',
      target: pet._id,
      targetModel: 'Pet',
      details: `Vet "${vetUser.name}" assigned to pet "${pet.name}"`
    });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PATCH /api/pets/:id
// @desc    Update general pet info (Staff/Admin only)
// @access  Private (Requires 'staff' or 'admin' role)
router.patch('/:id', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const { name, breed, age, gender, energyLevel, temperament, organization } = req.body;

    // Build update object dynamically
    const updateFields = {};
    if (name) updateFields.name = name;
    if (breed) updateFields.breed = breed;
    if (age !== undefined) updateFields.age = age;
    if (gender) updateFields.gender = gender;
    if (energyLevel) updateFields.energyLevel = energyLevel;
    if (temperament) updateFields.temperament = temperament;
    if (organization) updateFields.organization = organization;

    const pet = await Pet.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });
    if (!pet) return res.status(404).json({ msg: 'Pet not found' });

    res.json({ msg: 'Pet updated successfully', pet });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});



module.exports = router;
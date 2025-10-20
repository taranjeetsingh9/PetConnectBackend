const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logActivity');
// const upload = require('../middleware/upload');
const { cloudinary } = require('../config/cloudinary');
const {avatarUpload} = require('../middleware/upload');

// don't forget to move role auth to middleware in future.
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

// ✅ ENHANCED: PATCH /api/users/profile
router.patch("/profile", auth, async (req, res) => {
  try {
    const { name, location, role, lifestyle } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name, 
        location, 
        role, 
        lifestyle,
        lastLogin: new Date() // Add last login update
      },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ msg: "User not found" });

    // Log the activity
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Updated Profile',
      target: req.user.id,
      targetModel: 'User',
      details: `Updated profile information`
    });

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ✅ ENHANCED: Get logged-in user's profile with populated data
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate('favoritedPets', 'name breed images status')
      .populate('adoptedPets', 'name breed status')
      .populate('fosteredPets', 'name breed status')
      .populate('organization', 'name type');
      
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// ✅ NEW: GET user's activity logs
router.get('/activity-logs/:userId', auth, async (req, res) => {
  try {
    // Users can only see their own activity logs
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        msg: 'Access denied' 
      });
    }

    const logs = await ActivityLog.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(logs); // Return array directly for frontend compatibility
  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while fetching activity logs' 
    });
  }
});

// ✅ NEW: GET user statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('favoritedPets adoptedPets fosteredPets createdAt')
      .populate('favoritedPets', 'name status')
      .populate('adoptedPets', 'name status')
      .populate('fosteredPets', 'name status');

    const stats = {
      favoriteCount: user.favoritedPets ? user.favoritedPets.length : 0,
      adoptedCount: user.adoptedPets ? user.adoptedPets.length : 0,
      fosteredCount: user.fosteredPets ? user.fosteredPets.length : 0,
      memberSince: user.createdAt
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while fetching user stats' 
    });
  }
});

// ✅ NEW: ADD pet to favorites
router.post('/favorites/:petId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.favoritedPets.includes(req.params.petId)) {
      user.favoritedPets.push(req.params.petId);
      await user.save();
    }

    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Added Favorite',
      target: req.params.petId,
      targetModel: 'Pet',
      details: 'Added pet to favorites'
    });

    res.json({
      success: true,
      message: 'Pet added to favorites',
      favoriteCount: user.favoritedPets.length
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while adding favorite' 
    });
  }
});

// ✅ NEW: REMOVE pet from favorites
router.delete('/favorites/:petId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.favoritedPets = user.favoritedPets.filter(
      petId => petId.toString() !== req.params.petId
    );
    
    await user.save();

    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Removed Favorite',
      target: req.params.petId,
      targetModel: 'Pet',
      details: 'Removed pet from favorites'
    });

    res.json({
      success: true,
      message: 'Pet removed from favorites',
      favoriteCount: user.favoritedPets.length
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while removing favorite' 
    });
  }
});

// // ✅ NEW: Avatar upload endpoint (placeholder for Cloudinary)
// router.post('/upload-avatar', auth, async (req, res) => {
//   try {
//     // Placeholder - Cloudinary integration coming next
//     await logActivity({
//       userId: req.user.id,
//       role: req.user.role,
//       action: 'Uploaded Avatar',
//       target: req.user.id,
//       targetModel: 'User',
//       details: 'Uploaded profile picture'
//     });

//     res.json({
//       success: true,
//       message: 'Avatar upload endpoint ready - Cloudinary integration coming next!',
//       avatarUrl: null
//     });
//   } catch (error) {
//     console.error('Avatar upload error:', error);
//     res.status(500).json({ 
//       success: false,
//       msg: 'Server error during avatar upload' 
//     });
//   }
// });



// ✅ REAL: Avatar upload endpoint with Cloudinary
router.post('/upload-avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: 'No file uploaded'
      });
    }

    // Update user with avatar information
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        avatar: {
          url: req.file.path,
          public_id: req.file.filename
        }
      },
      { new: true }
    ).select('-password');

    // Log the activity
    await logActivity({
      userId: req.user.id,
      role: req.user.role,
      action: 'Uploaded Avatar',
      target: req.user.id,
      targetModel: 'User',
      details: 'Uploaded profile picture'
    });

    res.json({
      success: true,
      message: 'Avatar uploaded successfully!',
      avatarUrl: req.file.path,
      user: updatedUser
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    
    // Clean up uploaded file if user update fails
    if (req.file) {
      await cloudinary.uploader.destroy(req.file.filename);
    }
    
    res.status(500).json({ 
      success: false,
      msg: 'Server error during avatar upload' 
    });
  }
});

// GET /api/users/vets
// Only staff/admin can fetch all vets
router.get('/vets', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const vets = await User.find({ role: 'vet' }).select('_id name email');
    res.json(vets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ✅ NEW: GET all trainers (for staff/admin)
router.get('/trainers', auth, roleAuth(['staff', 'admin']), async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer' }).select('_id name email');
    res.json(trainers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
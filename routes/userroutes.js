const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");



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
// PATCH /api/users/profile
router.patch("/profile", auth, async (req, res) => {
  try {
    const { name, location, role, lifestyle } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, location, role, lifestyle },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
// Get logged-in user's profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// GET /api/users/vets
// Only staff/admin can fetch all vets
router.get('/vets', auth, roleAuth(['staff']), async (req, res) => {
  try {
    const vets = await User.find({ role: 'vet' }).select('_id name email');
    res.json(vets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

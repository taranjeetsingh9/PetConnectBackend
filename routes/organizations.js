const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logActivity');



// will convert it into middleware later
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

// ------------------------
// GET all organizations
// ------------------------
router.get('/', auth, async (req, res) => {
  try {
    const orgs = await Organization.find().select('name type'); // Only fetch name and type for dropdown
    res.json(orgs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ------------------------
// GET organization by ID
// ------------------------
router.get('/:id', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).populate('staff', 'name email');
    if (!org) return res.status(404).json({ msg: 'Organization not found' });
    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ------------------------
// POST new organization (Admin only)
// ------------------------
router.post('/', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { name, type, contact } = req.body;
    if (!name || !type) return res.status(400).json({ msg: 'Name and type are required' });

    const newOrg = new Organization({ name, type, contact });
    const org = await newOrg.save();
    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ------------------------
// PATCH organization (Admin only)
// ------------------------
router.patch('/:id', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.type) updateFields.type = req.body.type;
    if (req.body.contact) updateFields.contact = req.body.contact;

    const org = await Organization.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });
    if (!org) return res.status(404).json({ msg: 'Organization not found' });
    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// ------------------------
// DELETE organization (Admin only)
// ------------------------
router.delete('/:id', auth, roleAuth(['staff']), async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found' });

    await org.deleteOne();
    res.json({ msg: 'Organization deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// activity loggin version
// ------------------------
// POST new organization (Admin only)
// ------------------------
router.post('/', auth, roleAuth(['admin']), async (req, res) => {
  try {
    const { name, type, contact } = req.body;
    if (!name || !type) return res.status(400).json({ msg: 'Name and type are required' });

    const newOrg = new Organization({ name, type, contact });
    const org = await newOrg.save();

    // ✅ Log activity
    await logActivity({
      userId: req.user.id,
      role: 'admin',
      action: 'Created Organization',
      target: org._id,
      targetModel: 'Organization',
      details: { name, type, contact },
      ipAddress: req.ip
    });

    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;

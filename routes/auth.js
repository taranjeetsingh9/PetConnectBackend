const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// sign up
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(15);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({ email, password: hashedPassword });
    
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, firstTime: true });
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      const firstTime = !user.name || !user.location; // check if profile setup needed
      res.json({ token, firstTime });
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }


});

// edit profile 
router.patch('/users/profile', auth, async (req, res) => {
  try {
    const { name, location, role, lifestyle } = req.body;
    const user = await User.findById(req.user.id);

    user.name = name || user.name;
    user.location = location || user.location;
    user.role = role || user.role;
    user.lifestyle = lifestyle || user.lifestyle;
    user.lastLogin = Date.now();

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;

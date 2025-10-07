// crrently not in use in future implement it when requeired 

// middleware/roleAuth.js
const User = require('../models/User');

module.exports = (allowedRoles = []) => async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
    const user = await User.findById(req.user.id).select('role');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (!allowedRoles.includes(user.role)) return res.status(403).json({ msg: 'Access denied' });
    req.userRole = user.role;
    next();
  } catch (err) {
    console.error('roleAuth error:', err);
    res.status(500).send('Server error');
  }
};

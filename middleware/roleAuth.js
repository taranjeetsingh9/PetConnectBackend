// middleware/roleAuth.js
const User = require('../models/User');

/**
 * Role-based access middleware
 * @param {Array<String>} allowedRoles - Roles that can access the route
 * @returns {Function} Express middleware
 *
 * Usage:
 * router.get('/admin-only', auth, roleAuth(['admin']), controllerFunc);
 */
const roleAuth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // user.id is set from auth middleware (JWT verified)
      const user = await User.findById(req.user.id).select('role organization');

      if (!user) {
        return res.status(401).json({ msg: 'User not found' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ msg: 'Access denied: insufficient role permissions' });
      }

      // attach role & org info to request for later use
      req.userRole = user.role;
      req.userOrganization = user.organization;

      next();
    } catch (err) {
      console.error(' Error in roleAuth middleware:', err.message);
      res.status(500).json({ msg: 'Server error during role check' });
    }
  };
};

module.exports = roleAuth;


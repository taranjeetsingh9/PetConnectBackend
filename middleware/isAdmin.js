const isAdmin = (req, res, next) => {
    // Check if user role is admin
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ 
        success: false,
        msg: 'Access denied. Admin role required.' 
      });
    }
  };
  
  module.exports = isAdmin;
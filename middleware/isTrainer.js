const isTrainer = (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' });
  
    if (req.user.role !== 'trainer') {
      return res.status(403).json({ msg: 'Access denied: trainer only' });
    }
  
    next();
  };
  
  module.exports = isTrainer;
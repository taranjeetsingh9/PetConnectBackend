const isVet = (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Not authenticated' });
  
    if (req.user.role !== 'vet') {
      return res.status(403).json({ msg: 'Access denied: vet only' });
    }
  
    next();
  };
  
  module.exports = isVet;
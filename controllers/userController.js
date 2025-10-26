const userService = require('../services/userService');

exports.updateProfile = async (req, res) => {
  try {
    const { name, location, role, lifestyle } = req.body;
    const user = await userService.updateProfile(req.user.id, {
      name, location, role, lifestyle
    });
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.getUserActivityLogs = async (req, res) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        msg: 'Access denied' 
      });
    }
    const logs = await userService.getUserActivityLogs(req.user.id);
    res.json(logs);
  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while fetching activity logs' 
    });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const stats = await userService.getUserStats(req.user.id);
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
};

exports.addFavorite = async (req, res) => {
  try {
    const result = await userService.addFavorite(req.user.id, req.params.petId);
    res.json(result);
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while adding favorite' 
    });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const result = await userService.removeFavorite(req.user.id, req.params.petId);
    res.json(result);
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ 
      success: false,
      msg: 'Server error while removing favorite' 
    });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: 'No file uploaded'
      });
    }

    const result = await userService.uploadAvatar(
      req.user.id,
      {
        url: req.file.path,
        public_id: req.file.filename
      },
      req.file
    );

    res.json(result);
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(error.status || 500).json({ 
      success: false,
      msg: error.message 
    });
  }
};

exports.getVets = async (req, res) => {
  try {
    const vets = await userService.getUsersByRole('vet');
    res.json(vets);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};

exports.getTrainers = async (req, res) => {
  try {
    const trainers = await userService.getUsersByRole('trainer');
    res.json(trainers);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
};
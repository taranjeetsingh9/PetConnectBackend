const availabilityService = require('../services/availabilityService');

exports.setAvailability = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { role, slots } = req.body;

    const result = await availabilityService.setWeeklyAvailability(userId, role, slots);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { day } = req.query;

    const slots = await availabilityService.getAvailability(userId, day);
    res.json({ slots });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.deleteAvailability = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { day } = req.query;

    const result = await availabilityService.deleteAvailability(userId, day);
    res.json({ msg: 'Availability deleted', result });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

exports.getAvailableStaff = async (req, res) => {
  try {
    const availableStaff = await availabilityService.getAvailableStaff();
    res.json({
      success: true,
      staff: availableStaff
    });
  } catch (err) {
    console.error('Error in getAvailableStaff controller:', err);
    res.status(err.status || 500).json({ 
      success: false,
      message: err.message || 'Failed to fetch available staff' 
    });
  }
};

// controllers/activityLogController.js
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// Admin view all logs (staff, users, etc.)
exports.getAllLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate('user', 'name email role') // include minimal user info
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    res.status(500).json({ message: 'Server error fetching activity logs' });
  }
};

// View logs by a specific user (for future user dashboard)
exports.getUserLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ user: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error('Failed to fetch user logs:', err);
    res.status(500).json({ message: 'Server error fetching user logs' });
  }
};

// controllers/activityLogController.js
const activityLogService = require('../services/activityLogService');

// Admin view all logs (staff, users, etc.)
exports.getAllLogs = async (req, res) => {
  try {
    const logs = await activityLogService.fetchAllLogs();
    res.json(logs);
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    res.status(500).json({ message: 'Server error fetching activity logs' });
  }
};

// View logs by a specific user (for future user dashboard)
exports.getUserLogs = async (req, res) => {
  try {
    const logs = await activityLogService.fetchUserLogs(req.params.userId);
    res.json(logs);
  } catch (err) {
    console.error('Failed to fetch user logs:', err);
    res.status(500).json({ message: 'Server error fetching user logs' });
  }
};


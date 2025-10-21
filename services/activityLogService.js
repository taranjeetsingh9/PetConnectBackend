// services/activityLogService.js
const ActivityLog = require('../models/ActivityLog');

 // get all logs irrespective of nature user
exports.fetchAllLogs = async () => {
  return ActivityLog.find()
    .populate('user', 'name email role')
    .sort({ createdAt: -1 });
};

/**
 * Fetch activity logs for a specific user
 * @param {String} userId
 */
exports.fetchUserLogs = async (userId) => {
  return ActivityLog.find({ user: userId })
    .sort({ createdAt: -1 });
};

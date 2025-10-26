// services/activityLogService.js
const ActivityLog = require('../models/ActivityLog');
const createError = (msg, status = 400) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

class ActivityLogService {
  /**
   * Fetch all activity logs (irrespective of user)
   */
  async fetchAllLogs() {
    return ActivityLog.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
  }

  /**
   * Fetch activity logs for a specific user
   * @param {String} userId
   */
  async fetchUserLogs(userId) {
    if (!userId) throw createError('User ID is required');
    return ActivityLog.find({ user: userId })
      .sort({ createdAt: -1 });
  }
}

// Singleton instance for backward compatibility
const activityLogService = new ActivityLogService();

module.exports = {
  ActivityLogService,
  activityLogService,

  // Legacy bindings for production
  fetchAllLogs: activityLogService.fetchAllLogs.bind(activityLogService),
  fetchUserLogs: activityLogService.fetchUserLogs.bind(activityLogService)
};

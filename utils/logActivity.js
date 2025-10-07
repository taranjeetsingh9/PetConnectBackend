// utils/logActivity.js
const ActivityLog = require('../models/ActivityLog');

async function logActivity({ userId, role, action, target = null, targetModel = null, details = null, ipAddress = null, blockchainId = null }) {
  try {
    const log = new ActivityLog({
      user: userId,
      role,
      action,
      target,
      targetModel,
      details,
      ipAddress,
      blockchainId
    });
    await log.save();
    // Non-blocking: do not throw to caller. We console.log for debug.
    console.log(`Activity logged: ${action} by ${userId}`);
  } catch (err) {
    // Logging must not break the main flow
    console.error(' Failed to log activity:', err.message || err);
  }
}

module.exports = logActivity;



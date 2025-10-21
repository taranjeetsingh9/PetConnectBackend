// controllers/notificationController.js

const { getIO } = require('../server/socket');
const Notification = require('../models/Notification');

const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = require('../services/notificationService');
  
  exports.getAll = async (req, res) => {
    try {
      const notifications = await getUserNotifications(req.user.id);
      res.json({ success: true, count: notifications.length, notifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  };
  
  exports.markOneAsRead = async (req, res) => {
    try {
      const notification = await markAsRead(req.params.id, req.user.id);
      if (!notification) return res.status(404).json({ success: false, msg: 'Not found' });
      res.json({ success: true, notification });
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  };
  
  exports.markAllAsRead = async (req, res) => {
    try {
      const result = await markAllAsRead(req.user.id);
      res.json({ success: true, msg: `Marked ${result.modifiedCount} as read` });
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  };
  
  exports.deleteOne = async (req, res) => {
    try {
      const deleted = await deleteNotification(req.params.id, req.user.id);
      if (!deleted) return res.status(404).json({ success: false, msg: 'Not found' });
      res.json({ success: true, msg: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  };
  
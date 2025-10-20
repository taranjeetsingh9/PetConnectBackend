// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  NOTIFICATION_TYPES
} = require('../utils/notificationService');

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    
    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while fetching notifications' 
    });
  }
});

/**
 * @route   GET /api/notifications/unread
 * @desc    Get unread notifications count
 * @access  Private
 */
router.get('/unread', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });
    
    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while fetching unread count' 
    });
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a single notification as read
 * @access  Private
 */
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        msg: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while marking notification as read' 
    });
  }
});

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read for current user
 * @access  Private
 */
router.patch('/read-all', auth, async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.id);
    
    res.json({
      success: true,
      msg: `Marked ${result.modifiedCount} notifications as read`
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while marking all notifications as read' 
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id // Users can only delete their own notifications
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        msg: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      msg: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error while deleting notification' 
    });
  }
});

module.exports = router;
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * GET /api/notifications
 * Fetches notifications for the authenticated user, sorted by newest first.
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('screeningId', 'patient');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a specific notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied.',
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for the authenticated user as read.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

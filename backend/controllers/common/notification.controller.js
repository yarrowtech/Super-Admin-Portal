const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const Notification = require('../../models/common/Notification');

const buildUserNotificationFilter = (user) => {
  const userId = user?.id || user?._id;
  const userEmail = user?.email;
  return {
    $or: [
      { manager: userId },
      { 'target.managerIds': userId?.toString?.() || userId },
      ...(userEmail ? [{ 'target.managerEmails': userEmail }] : []),
    ],
  };
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 25, read } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const query = buildUserNotificationFilter(req.user);

    if (read !== undefined) {
      query.read = read === 'true';
    }

    const [items, total, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      meta: {
        total,
        unread,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch notifications');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message,
    });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification id',
      });
    }

    const query = {
      _id: id,
      ...buildUserNotificationFilter(req.user),
    };

    const notification = await Notification.findOneAndUpdate(
      query,
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark notification as read');
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      details: error.message,
    });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const query = {
      ...buildUserNotificationFilter(req.user),
      read: false,
    };

    const result = await Notification.updateMany(query, {
      read: true,
      readAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark all notifications as read');
    return res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      details: error.message,
    });
  }
};

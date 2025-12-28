import Notification from '../models/notification.model.js';

// Get notifications for current user
export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    // Build query
    let query = {
      'recipients.userId': userId,
      status: 'active'
    };

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (unreadOnly === 'true') {
      query['recipients.readAt'] = { $exists: false };
    }

    const notifications = await Notification.find(query)
      .populate('createdBy', 'userName email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      'recipients.userId': userId,
      'recipients.readAt': { $exists: false },
      status: 'active'
    });

    res.json({
      notifications,
      unreadCount,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { 
        _id: id, 
        'recipients.userId': userId 
      },
      { 
        $set: { 'recipients.$.readAt': new Date() } 
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { 
        'recipients.userId': userId,
        'recipients.readAt': { $exists: false }
      },
      { 
        $set: { 'recipients.$.readAt': new Date() } 
      }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create notification (admin only)
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, priority, category, recipients, data, actionUrl, expiresAt } = req.body;

    const notification = new Notification({
      title,
      message,
      type,
      priority,
      category,
      recipients: recipients.map(userId => ({ userId })),
      data,
      actionUrl,
      expiresAt,
      createdBy: req.user.id
    });

    await notification.save();
    await notification.populate('createdBy', 'userName email');

    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Create broadcast notification (admin only)
export const createBroadcast = async (req, res) => {
  try {
    const { title, message, type, priority, category, userRoles, data, actionUrl, expiresAt } = req.body;

    // Get users based on roles
    const User = require('../models/user.model.js').default;
    let targetUsers;
    
    if (userRoles && userRoles.length > 0) {
      targetUsers = await User.find({ role: { $in: userRoles } }).select('_id');
    } else {
      targetUsers = await User.find({ status: 'active' }).select('_id');
    }

    const recipients = targetUsers.map(user => ({ userId: user._id }));

    const notification = new Notification({
      title,
      message,
      type,
      priority,
      category,
      recipients,
      data,
      actionUrl,
      expiresAt,
      createdBy: req.user.id
    });

    await notification.save();
    await notification.populate('createdBy', 'userName email');

    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notification statistics (admin only)
export const getNotificationStats = async (req, res) => {
  try {
    const total = await Notification.countDocuments({ status: 'active' });
    
    const typeStats = await Notification.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Notification.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentNotifications = await Notification.countDocuments({
      status: 'active',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      total,
      recentNotifications,
      typeStats,
      priorityStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
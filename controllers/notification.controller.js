import { db } from "../config/db.js";

// ======================
// CREATE notification (single or broadcast)
// ======================
// export const createNotification = async (req, res) => {
//   const { title, message, type, priority, category, recipients = [], data, actionUrl, expiresAt } = req.body;
//   const createdBy = req.user.id;

//   try {
//     // Insert notification
//     const [result] = await db.query(
//       `INSERT INTO notifications (title, message, type, priority, category, data, action_url, expires_at, created_by)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [title, message, type || 'info', priority || 'medium', category || 'general', data || null, actionUrl || null, expiresAt || null, createdBy]
//     );

//     const notificationId = result.insertId;

//     // Insert recipients
//     if (recipients.length) {
//       const values = recipients.map(() => '(?, ?)').join(', ');
//       const params = [];
//       recipients.forEach(userId => params.push(notificationId, userId));
//       await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ${values}`, params);
//     }

//     // Fetch created notification
//     const [notifRows] = await db.query("SELECT * FROM notifications WHERE id = ?", [notificationId]);

//     res.status(201).json({ success: true, notification: notifRows[0] });
//   } catch (err) {
//     console.error("Error creating notification:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const createNotification = async (req, res) => {
  const { title, message, type = 'info', priority = 'medium', category = 'general', recipients = [], data, actionUrl, expiresAt } = req.body;
  const createdBy = req.user.id;

  try {
    const [notif] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, action_url, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, message, type, priority, category, data || null, actionUrl || null, expiresAt || null, createdBy]
    );

    const notificationId = notif.insertId;

    if (recipients.length) {
      const values = recipients.map(userId => [notificationId, userId]);
      await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ?`, [values]);
    }

    const [createdNotif] = await db.query(`SELECT * FROM notifications WHERE id = ?`, [notificationId]);
    res.status(201).json({ success: true, notification: createdNotif[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET notifications for user (pagination & unread filter)
// ======================
export const getUserNotifications = async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const userId = req.user.id;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT n.*, nr.read_at
      FROM notifications n
      JOIN notification_recipients nr ON n.id = nr.notification_id
      WHERE nr.user_id = ? AND n.status = 'active'
    `;
    const params = [userId];

    if (unreadOnly === 'true') query += ' AND nr.read_at IS NULL';

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND n.status = 'active'`,
      [userId]
    );

    const [[{ unread }]] = await db.query(
      `SELECT COUNT(*) AS unread FROM notification_recipients nr
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.user_id = ? AND nr.read_at IS NULL AND n.status = 'active'`,
      [userId]
    );

    res.json({
      notifications: rows,
      unreadCount: parseInt(unread),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: parseInt(total)
      }
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// MARK notification as read
// ======================
export const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      `UPDATE notification_recipients SET read_at = NOW() WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Notification not found" });

    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    console.error("Error marking as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// MARK all as read
// ======================
export const markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(
      `UPDATE notification_recipients SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL`,
      [userId]
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// DELETE notification (admin or sender)
// ======================
export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [result] = await db.query(
      `DELETE FROM notifications WHERE id = ? AND created_by = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Notification not found or unauthorized" });

    res.json({ success: true, message: "Notification deleted successfully" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// BROADCAST notification
// ======================
export const createBroadcast = async (req, res) => {
  const { title, message, type, priority, category, userRoles = [], data, actionUrl, expiresAt } = req.body;
  const createdBy = req.user.id;

  try {
    // Fetch target users
    let query = 'SELECT id FROM users WHERE status = ?';
    let params = ['active'];

    if (userRoles.length > 0) {
      const placeholders = userRoles.map(() => '?').join(',');
      query = `SELECT id FROM users WHERE role IN (${placeholders}) AND status = ?`;
      params = [...userRoles, 'active'];
    }

    const [users] = await db.query(query, params);
    const recipients = users.map(u => u.id);

    if (!recipients.length) return res.status(400).json({ message: "No recipients found for broadcast" });

    // Insert notification
    const [notifRes] = await db.query(
      `INSERT INTO notifications (title, message, type, priority, category, data, action_url, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, message, type || 'info', priority || 'medium', category || 'general', data || null, actionUrl || null, expiresAt || null, createdBy]
    );

    const notificationId = notifRes.insertId;

    // Insert recipients
    const values = recipients.map(() => '(?, ?)').join(', ');
    const paramsRecipients = [];
    recipients.forEach(userId => paramsRecipients.push(notificationId, userId));
    await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ${values}`, paramsRecipients);

    // Fetch created notification
    const [notifRows] = await db.query("SELECT * FROM notifications WHERE id = ?", [notificationId]);

    res.status(201).json({ success: true, notification: notifRows[0] });
  } catch (err) {
    console.error("Error creating broadcast:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Notification stats (admin only)
// ======================
export const getNotificationStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM notifications WHERE status='active'`);
    const [typeStats] = await db.query(`SELECT type, COUNT(*) AS count FROM notifications WHERE status='active' GROUP BY type`);
    const [priorityStats] = await db.query(`SELECT priority, COUNT(*) AS count FROM notifications WHERE status='active' GROUP BY priority`);
    const [[{ recentNotifications }]] = await db.query(
      `SELECT COUNT(*) AS recentNotifications FROM notifications WHERE status='active' AND created_at >= NOW() - INTERVAL 7 DAY`
    );

    res.json({ total, recentNotifications, typeStats, priorityStats });
  } catch (err) {
    console.error("Error fetching notification stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};
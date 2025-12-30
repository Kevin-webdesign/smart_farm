import { db } from "../config/db.js";

// ======================
// CREATE notification (admin/staff)
// ======================
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
  const { page = 1, limit = 20, unreadOnly, category } = req.query;
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
    if (category) {
      query += ' AND n.category = ?';
      params.push(category);
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);

    // Total count query
    let countQuery = `
      SELECT COUNT(*) AS total FROM notification_recipients nr
      JOIN notifications n ON n.id = nr.notification_id
      WHERE nr.user_id = ? AND n.status = 'active'
    `;
    let countParams = [userId];

    if (category) {
      countQuery += ' AND n.category = ?';
      countParams.push(category);
    }

    const [[{ total }]] = await db.query(countQuery, countParams);

    // Unread count
    let unreadQuery = `
      SELECT COUNT(*) AS unread FROM notification_recipients nr
      JOIN notifications n ON n.id = nr.notification_id
      WHERE nr.user_id = ? AND nr.read_at IS NULL AND n.status = 'active'
    `;
    let unreadParams = [userId];

    if (category) {
      unreadQuery += ' AND n.category = ?';
      unreadParams.push(category);
    }

    const [[{ unread }]] = await db.query(unreadQuery, unreadParams);

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
  

  try {
    const [result] = await db.query(
      `DELETE FROM notifications WHERE id = ?`,
      [id]
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
  const { 
    title, 
    message, 
    type = 'info', 
    priority = 'medium', 
    category = 'broadcast', 
    userRoles = [], 
    data, 
    actionUrl, 
    expiresAt 
  } = req.body;
  const createdBy = req.user.id;

  try {
    // Validate and sanitize inputs
    const validatedData = {
      title: title?.trim() || '',
      message: message?.trim() || '',
      type: ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info',
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      category: (category?.trim() || 'broadcast').substring(0, 50), // Ensure max 50 chars
      userRoles: Array.isArray(userRoles) ? userRoles : [],
      data: data || null,
      actionUrl: actionUrl?.trim() || null,
      expiresAt: expiresAt || null,
      createdBy
    };

    // Basic validation
    if (!validatedData.title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!validatedData.message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Fetch target users
    let query = 'SELECT id FROM users WHERE status = ?';
    let params = ['active'];

    if (validatedData.userRoles.length > 0) {
      const placeholders = validatedData.userRoles.map(() => '?').join(',');
      query = `SELECT id FROM users WHERE role IN (${placeholders}) AND status = ?`;
      params = [...validatedData.userRoles, 'active'];
    }

    console.log('Query:', query, 'Params:', params);

    const [users] = await db.query(query, params);
    const recipients = users.map(u => u.id);

    if (!recipients.length) {
      return res.status(400).json({ message: "No recipients found for broadcast" });
    }

    console.log('Creating broadcast for recipients:', recipients.length);

    // Validate and format expiresAt
    let expiresAtValue = null;
    if (validatedData.expiresAt) {
      const expiresDate = new Date(validatedData.expiresAt);
      if (isNaN(expiresDate.getTime())) {
        return res.status(400).json({ message: "Invalid expiresAt date format" });
      }
      expiresAtValue = expiresDate;
    }

    // Insert notification with explicit column list
    const sql = `
      INSERT INTO notifications (
        title, 
        message, 
        type, 
        priority, 
        category, 
        data, 
        action_url, 
        expires_at, 
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      validatedData.title.substring(0, 255), // Ensure title fits
      validatedData.message,
      validatedData.type,
      validatedData.priority,
      validatedData.category, // Already trimmed to 50 chars
      validatedData.data ? JSON.stringify(validatedData.data) : null,
      validatedData.actionUrl,
      expiresAtValue,
      validatedData.createdBy
    ];

    console.log('SQL values:', values);

    const [notifRes] = await db.query(sql, values);
    const notificationId = notifRes.insertId;

    console.log('Notification created with ID:', notificationId);

    // Insert recipients in batches to avoid issues
    if (recipients.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const placeholders = batch.map(() => '(?, ?)').join(', ');
        const batchValues = [];
        
        batch.forEach(userId => {
          batchValues.push(notificationId, userId);
        });
        
        await db.query(
          `INSERT INTO notification_recipients (notification_id, user_id) VALUES ${placeholders}`,
          batchValues
        );
        
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recipients.length/batchSize)}`);
      }
    }

    // Fetch created notification
    const [notifRows] = await db.query(`
      SELECT 
        n.*,
        u.username as creator_name,
        u.email as creator_email
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = ?
    `, [notificationId]);

    // Emit real-time notifications
    if (global.io) {
      const notificationData = {
        ...notifRows[0],
        read_at: null,
        is_new: true
      };
      
      recipients.forEach(userId => {
        global.io.to(`user:${userId}`).emit('new-notification', notificationData);
      });
    }

    res.status(201).json({ 
      success: true, 
      notification: notifRows[0],
      recipients: {
        count: recipients.length,
        sample: recipients.slice(0, 5) // Return first 5 as sample
      }
    });

  } catch (err) {
    console.error("❌ Error creating broadcast:", err);
    console.error("Full error details:", {
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      sql: err.sql
    });

    let errorMessage = "Server error creating broadcast";
    let statusCode = 500;
    
    if (err.code === 'WARN_DATA_TRUNCATED' || err.code === 'ER_DATA_TOO_LONG') {
      errorMessage = "Data too long for one or more fields. Please shorten your input.";
      statusCode = 400;
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = "Invalid user reference";
      statusCode = 400;
    } else if (err.code === 'ER_DUP_ENTRY') {
      errorMessage = "Duplicate entry detected";
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        error: err.message,
        details: {
          code: err.code,
          sqlState: err.sqlState
        }
      })
    });
  }
};

// ======================
// CREATE transaction notification for staff/admin
// ======================
export const createTransactionNotification = async (req, res) => {
  const { transactionId, transactionType, amount, createdBy, cropActivity } = req.body;
  const staffUserId = req.user.id; // The staff/admin creating the notification

  try {
    // Get all staff and admin users
    const [staffAdmins] = await db.query(
      `SELECT id FROM users WHERE role IN ('staff', 'admin') AND status = 'active' AND id != ?`,
      [staffUserId]
    );

    if (staffAdmins.length === 0) {
      return res.status(200).json({ success: true, message: "No staff/admin users to notify" });
    }

    const title = `New ${transactionType} Transaction`;
    const message = `A new ${transactionType.toLowerCase()} of $${amount} has been recorded for ${cropActivity || 'farm activity'}`;
    
    // Create notification
    const [notif] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        message,
        transactionType === 'Income' ? 'success' : 'warning',
        'medium',
        'transaction',
        JSON.stringify({ transactionId, transactionType, amount, createdBy, cropActivity }),
        staffUserId
      ]
    );

    const notificationId = notif.insertId;

    // Send to all staff/admins
    const recipients = staffAdmins.map(u => u.id);
    const values = recipients.map(() => '(?, ?)').join(', ');
    const paramsRecipients = [];
    recipients.forEach(userId => paramsRecipients.push(notificationId, userId));
    
    await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ${values}`, paramsRecipients);

    // Create trigger for transaction follow-up (e.g., review after 24 hours)
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours later
    await db.query(`
      INSERT INTO notification_triggers (type, user_id, reference_id, reference_type, scheduled_at, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, ['transaction_review', staffUserId, transactionId, 'transaction', scheduledAt]);

    res.status(201).json({ 
      success: true, 
      message: "Transaction notification sent to staff/admin",
      recipients: recipients.length
    });
  } catch (err) {
    console.error("Error creating transaction notification:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// CREATE calendar activity notification
// ======================
export const createCalendarNotification = async (req, res) => {
  const { userId, activityType, activityTitle, activityDate, cropName, daysUntil } = req.body;

  try {
    // Get user details
    const [users] = await db.query(`SELECT id, username, email FROM users WHERE id = ?`, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    
    let title, message, priority, type;
    
    if (daysUntil === 0) {
      title = `Today: ${activityTitle}`;
      message = `Your ${activityType} activity "${cropName}" is scheduled for today`;
      priority = 'high';
      type = 'info';
    } else if (daysUntil === 1) {
      title = `Tomorrow: ${activityTitle}`;
      message = `Your ${activityType} activity "${cropName}" is scheduled for tomorrow`;
      priority = 'medium';
      type = 'info';
    } else if (daysUntil < 0) {
      title = `Overdue: ${activityTitle}`;
      message = `Your ${activityType} activity "${cropName}" is ${Math.abs(daysUntil)} days overdue`;
      priority = 'high';
      type = 'warning';
    }

    // Create notification
    const [notif] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        message,
        type,
        priority,
        'calendar',
        JSON.stringify({ 
          userId, 
          activityType, 
          activityTitle, 
          activityDate: new Date(activityDate).toISOString(),
          cropName,
          daysUntil 
        }),
        'system' // System-generated
      ]
    );

    const notificationId = notif.insertId;

    // Send to user
    await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`, [notificationId, userId]);

    // Create trigger for next reminder if needed
    if (daysUntil > 1) {
      const reminderDays = [1, 0]; // Remind 1 day before and on the day
      for (const days of reminderDays) {
        if (daysUntil > days) {
          const scheduledAt = new Date(new Date(activityDate).getTime() - days * 24 * 60 * 60 * 1000);
          await db.query(`
            INSERT INTO notification_triggers (type, user_id, reference_id, reference_type, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
          `, ['calendar_reminder', userId, `activity_${activityType}_${cropName}`, 'calendar', scheduledAt]);
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      message: "Calendar notification created",
      notification: { title, message, type, priority }
    });
  } catch (err) {
    console.error("Error creating calendar notification:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// GET notification triggers (admin)
// ======================
export const getNotificationTriggers = async (req, res) => {
  try {
    const [triggers] = await db.query(`
      SELECT nt.*, u.username, u.email
      FROM notification_triggers nt
      LEFT JOIN users u ON nt.user_id = u.id
      ORDER BY nt.scheduled_at ASC
      LIMIT 100
    `);

    res.json({ success: true, triggers });
  } catch (err) {
    console.error("Error fetching triggers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// PROCESS pending triggers (cron job)
// ======================
export const processNotificationTriggers = async (req, res) => {
  try {
    const now = new Date();
    
    // Get pending triggers that are due
    const [pendingTriggers] = await db.query(`
      SELECT nt.*, u.username, u.email
      FROM notification_triggers nt
      JOIN users u ON nt.user_id = u.id
      WHERE nt.status = 'pending' 
        AND nt.scheduled_at <= ?
        AND u.status = 'active'
    `, [now]);

    let processed = 0;
    let errors = [];

    for (const trigger of pendingTriggers) {
      try {
        // Process based on trigger type
        switch (trigger.type) {
          case 'calendar_reminder':
            await processCalendarReminder(trigger);
            break;
          case 'transaction_review':
            await processTransactionReview(trigger);
            break;
          default:
            console.log(`Unknown trigger type: ${trigger.type}`);
        }

        // Mark as sent
        await db.query(
          `UPDATE notification_triggers SET status = 'sent', scheduled_at = NOW() WHERE id = ?`,
          [trigger.id]
        );
        
        processed++;
      } catch (err) {
        console.error(`Error processing trigger ${trigger.id}:`, err);
        errors.push({ triggerId: trigger.id, error: err.message });
        
        // Mark as failed after 3 attempts
        await db.query(
          `UPDATE notification_triggers SET status = 'failed' WHERE id = ? AND status = 'pending'`,
          [trigger.id]
        );
      }
    }

    res.json({
      success: true,
      message: `Processed ${processed} triggers`,
      processed,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("Error processing triggers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function for calendar reminders
async function processCalendarReminder(trigger) {
  // Extract information from reference
  const referenceParts = trigger.reference_id.split('_');
  const activityType = referenceParts[1];
  const cropName = referenceParts.slice(2).join('_');

  // Calculate days until activity
  const scheduledDate = new Date(trigger.scheduled_at);
  const today = new Date();
  const daysUntil = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));

  let title, message, priority;
  
  if (daysUntil === 0) {
    title = `Today: ${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Reminder`;
    message = `Don't forget your ${activityType} activity for ${cropName} is today!`;
    priority = 'high';
  } else if (daysUntil === 1) {
    title = `Tomorrow: ${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Reminder`;
    message = `Your ${activityType} activity for ${cropName} is scheduled for tomorrow`;
    priority = 'medium';
  }

  if (title && message) {
    // Create notification
    const [notif] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        message,
        'info',
        priority,
        'calendar',
        JSON.stringify({ 
          userId: trigger.user_id,
          activityType,
          cropName,
          daysUntil,
          scheduledDate: scheduledDate.toISOString()
        }),
        'system'
      ]
    );

    const notificationId = notif.insertId;

    // Send to user
    await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`, [notificationId, trigger.user_id]);
  }
}

// Helper function for transaction reviews
async function processTransactionReview(trigger) {
  // Get transaction details
  const [transactions] = await db.query(`
    SELECT ft.*, u.username, u.email 
    FROM farm_transactions ft
    JOIN users u ON ft.created_by = u.id
    WHERE ft.id = ?
  `, [trigger.reference_id]);

  if (transactions.length > 0) {
    const transaction = transactions[0];
    
    // Create review notification for staff/admin
    const [staffAdmins] = await db.query(
      `SELECT id FROM users WHERE role IN ('staff', 'admin') AND status = 'active'`
    );

    if (staffAdmins.length > 0) {
      const title = `Transaction Review Needed`;
      const message = `Transaction "${transaction.crop_activity}" from ${transaction.username} needs review`;
      
      // Create notification
      const [notif] = await db.query(`
        INSERT INTO notifications (title, message, type, priority, category, data, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          message,
          'warning',
          'medium',
          'transaction_review',
          JSON.stringify({ 
            transactionId: transaction.id,
            transactionType: transaction.type,
            amount: transaction.amount,
            createdBy: transaction.created_by,
            cropActivity: transaction.crop_activity,
            daysSince: 1
          }),
          'system'
        ]
      );

      const notificationId = notif.insertId;

      // Send to all staff/admins
      const recipients = staffAdmins.map(u => u.id);
      const values = recipients.map(() => '(?, ?)').join(', ');
      const paramsRecipients = [];
      recipients.forEach(userId => paramsRecipients.push(notificationId, userId));
      
      await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ${values}`, paramsRecipients);
    }
  }
}

// ======================
// GET user notification stats
// ======================
export const getUserNotificationStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get counts by category
    const [categoryStats] = await db.query(`
      SELECT 
        n.category,
        COUNT(*) as total,
        SUM(CASE WHEN nr.read_at IS NULL THEN 1 ELSE 0 END) as unread
      FROM notifications n
      JOIN notification_recipients nr ON n.id = nr.notification_id
      WHERE nr.user_id = ? AND n.status = 'active'
      GROUP BY n.category
      ORDER BY n.category
    `, [userId]);

    // Get today's notifications
    const [[{ todayCount }]] = await db.query(`
      SELECT COUNT(*) as todayCount
      FROM notifications n
      JOIN notification_recipients nr ON n.id = nr.notification_id
      WHERE nr.user_id = ? 
        AND DATE(n.created_at) = CURDATE()
        AND n.status = 'active'
    `, [userId]);

    // Get overdue activity notifications
    const [[{ overdueCount }]] = await db.query(`
      SELECT COUNT(*) as overdueCount
      FROM notifications n
      JOIN notification_recipients nr ON n.id = nr.notification_id
      WHERE nr.user_id = ? 
        AND n.category = 'calendar'
        AND n.type = 'warning'
        AND nr.read_at IS NULL
        AND n.status = 'active'
    `, [userId]);

    res.json({
      success: true,
      stats: {
        byCategory: categoryStats,
        today: parseInt(todayCount || 0),
        overdue: parseInt(overdueCount || 0),
        total: categoryStats.reduce((sum, cat) => sum + parseInt(cat.total), 0),
        unread: categoryStats.reduce((sum, cat) => sum + parseInt(cat.unread), 0)
      }
    });
  } catch (err) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// Notification stats (admin only)
// ======================
export const getNotificationStats = async (req, res) => {
  try {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM notifications WHERE status='active'`);
    const [[{ today }]] = await db.query(`SELECT COUNT(*) AS today FROM notifications WHERE status='active' AND DATE(created_at) = CURDATE()`);
    const [typeStats] = await db.query(`SELECT type, COUNT(*) AS count FROM notifications WHERE status='active' GROUP BY type`);
    const [priorityStats] = await db.query(`SELECT priority, COUNT(*) AS count FROM notifications WHERE status='active' GROUP BY priority`);
    const [categoryStats] = await db.query(`SELECT category, COUNT(*) AS count FROM notifications WHERE status='active' GROUP BY category ORDER BY count DESC`);
    
    const [[{ recentNotifications }]] = await db.query(
      `SELECT COUNT(*) AS recentNotifications FROM notifications WHERE status='active' AND created_at >= NOW() - INTERVAL 7 DAY`
    );

    // Trigger stats
    const [[{ pendingTriggers }]] = await db.query(`SELECT COUNT(*) AS pendingTriggers FROM notification_triggers WHERE status='pending'`);
    const [[{ sentTriggers }]] = await db.query(`SELECT COUNT(*) AS sentTriggers FROM notification_triggers WHERE status='sent'`);

    res.json({ 
      total, 
      today,
      recentNotifications, 
      typeStats, 
      priorityStats,
      categoryStats,
      triggers: {
        pending: pendingTriggers,
        sent: sentTriggers
      }
    });
  } catch (err) {
    console.error("Error fetching notification stats:", err);
    res.status(500).json({ message: "Server error" });
  }
};

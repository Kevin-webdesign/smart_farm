import cron from 'node-cron';
import { db } from "../config/db.js";

// ======================
// Check and create calendar notifications
// ======================
export const checkCalendarNotifications = async () => {
  try {
    console.log('🔔 Checking calendar notifications...');
     
    // Get all active users
    const [users] = await db.query(`SELECT id FROM users WHERE status = 'active'`);
    
    for (const user of users) {
      // Get user's upcoming activities (crops and harvests)
      const [activities] = await db.query(`
        SELECT 
          id,
          crop_name,
          planting_date as activity_date,
          'planting' as activity_type,
          CONCAT('Plant ', crop_name) as activity_title
        FROM crops 
        WHERE created_by = ? AND status IN ('active', 'planned')
        
        UNION ALL
        
        SELECT 
          id,
          crop_name,
          harvest_date as activity_date,
          'harvest' as activity_type,
          CONCAT('Harvest ', crop_name) as activity_title
        FROM harvest_records 
        WHERE created_by = ?
        
        UNION ALL
        
        SELECT 
          id,
          crop_name,
          expected_harvest_date as activity_date,
          'expected_harvest' as activity_type,
          CONCAT('Expected harvest ', crop_name) as activity_title
        FROM crops 
        WHERE created_by = ? AND expected_harvest_date IS NOT NULL
      `, [user.id, user.id, user.id]);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const activity of activities) {
        const activityDate = new Date(activity.activity_date);
        activityDate.setHours(0, 0, 0, 0);
        
        const timeDiff = activityDate.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Create notifications for today, tomorrow, and overdue
        if (daysUntil === 0 || daysUntil === 1 || daysUntil < 0) {
          // Check if notification already exists for this activity today
          const [existing] = await db.query(`
            SELECT COUNT(*) as count
            FROM notifications n
            JOIN notification_recipients nr ON n.id = nr.notification_id
            WHERE nr.user_id = ?
              AND n.category = 'calendar'
              AND JSON_EXTRACT(n.data, '$.cropName') = ?
              AND JSON_EXTRACT(n.data, '$.activityType') = ?
              AND DATE(n.created_at) = CURDATE()
          `, [user.id, activity.crop_name, activity.activity_type]);
          
          if (existing[0].count === 0) {
            let title, message, type, priority;
            
            if (daysUntil === 0) {
              title = `Today: ${activity.activity_title}`;
              message = `Your ${activity.activity_type} activity "${activity.crop_name}" is scheduled for today`;
              type = 'info';
              priority = 'high';
            } else if (daysUntil === 1) {
              title = `Tomorrow: ${activity.activity_title}`;
              message = `Your ${activity.activity_type} activity "${activity.crop_name}" is scheduled for tomorrow`;
              type = 'info';
              priority = 'medium';
            } else {
              title = `Overdue: ${activity.activity_title}`;
              message = `Your ${activity.activity_type} activity "${activity.crop_name}" is ${Math.abs(daysUntil)} days overdue`;
              type = 'warning';
              priority = 'high';
            }
            
            // Create notification
            const [notifResult] = await db.query(`
              INSERT INTO notifications (title, message, type, priority, category, data, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              title,
              message,
              type,
              priority,
              'calendar',
              JSON.stringify({
                userId: user.id,
                activityType: activity.activity_type,
                activityTitle: activity.activity_title,
                activityDate: activityDate.toISOString(),
                cropName: activity.crop_name,
                daysUntil
              }),
              'system'
            ]);
            
            const notificationId = notifResult.insertId;
            
            // Add recipient
            await db.query(
              `INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`,
              [notificationId, user.id]
            );
            
            console.log(`Created ${daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : 'overdue'} notification for user ${user.id}`);
            
            // Create trigger for follow-up if activity is today but not completed
            if (daysUntil === 0) {
              const scheduledAt = new Date();
              scheduledAt.setHours(18, 0, 0, 0); // 6 PM today
              
              await db.query(`
                INSERT INTO notification_triggers (type, user_id, reference_id, reference_type, scheduled_at, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
              `, ['activity_followup', user.id, `activity_${activity.id}`, 'calendar', scheduledAt]);
            }
          }
        }
      }
    }
    
    console.log('✅ Calendar notifications check completed');
  } catch (err) {
    console.error('Error checking calendar notifications:', err);
  }
};

// ======================
// Process pending triggers
// ======================
export const processPendingTriggers = async () => {
  try {
    console.log('⏰ Processing pending triggers...');
    
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
    
    for (const trigger of pendingTriggers) {
      try {
        // Process based on trigger type
        switch (trigger.type) {
          case 'activity_followup':
            await processActivityFollowup(trigger);
            break;
          case 'transaction_review':
            await processTransactionReview(trigger);
            break;
          default:
            console.log(`Unknown trigger type: ${trigger.type}`);
        }
        
        // Mark as sent
        await db.query(
          `UPDATE notification_triggers SET status = 'sent' WHERE id = ?`,
          [trigger.id]
        );
        
        processed++;
      } catch (err) {
        console.error(`Error processing trigger ${trigger.id}:`, err);
        
        // Mark as failed
        await db.query(
          `UPDATE notification_triggers SET status = 'failed' WHERE id = ?`,
          [trigger.id]
        );
      }
    }
    
    console.log(`✅ Processed ${processed} triggers`);
  } catch (err) {
    console.error('Error processing triggers:', err);
  }
};

// Helper: Process activity follow-up
async function processActivityFollowup(trigger) {
  const referenceParts = trigger.reference_id.split('_');
  const activityId = referenceParts[1];
  
  // Check if activity was completed today
  const [activityCheck] = await db.query(`
    SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM harvest_records WHERE id = ? AND DATE(created_at) = CURDATE()) THEN 'completed'
        WHEN EXISTS (SELECT 1 FROM crops WHERE id = ? AND status = 'harvested' AND DATE(updated_at) = CURDATE()) THEN 'completed'
        ELSE 'pending'
      END as status
  `, [activityId, activityId]);
  
  if (activityCheck[0].status === 'pending') {
    // Create follow-up notification
    const [notifResult] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'Activity Follow-up',
      'Did you complete your scheduled farm activity today? Please update your records.',
      'warning',
      'medium',
      'calendar',
      JSON.stringify({
        userId: trigger.user_id,
        triggerId: trigger.id,
        referenceId: trigger.reference_id,
        followupTime: new Date().toISOString()
      }),
      'system'
    ]);
    
    const notificationId = notifResult.insertId;
    
    await db.query(
      `INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`,
      [notificationId, trigger.user_id]
    );
  }
}

// Helper: Process transaction review
async function processTransactionReview(trigger) {
  const [transactions] = await db.query(`
    SELECT ft.*, u.username 
    FROM farm_transactions ft
    JOIN users u ON ft.created_by = u.id
    WHERE ft.id = ?
  `, [trigger.reference_id]);
  
  if (transactions.length > 0) {
    const transaction = transactions[0];
    
    // Get staff/admin users
    const [staffAdmins] = await db.query(
      `SELECT id FROM users WHERE role IN ('staff', 'admin') AND status = 'active'`
    );
    
    if (staffAdmins.length > 0) {
      const [notifResult] = await db.query(`
        INSERT INTO notifications (title, message, type, priority, category, data, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'Transaction Review Needed',
        `Transaction "${transaction.crop_activity}" from ${transaction.username} needs review`,
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
      ]);
      
      const notificationId = notifResult.insertId;
      
      // Add all staff/admins as recipients
      const values = staffAdmins.map(user => [notificationId, user.id]);
      await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ?`, [values]);
    }
  }
}

// ======================
// Process transaction notifications
// ======================
export const processTransactionNotifications = async () => {
  try {
    console.log('💰 Processing transaction notifications...');
    
    // Get recent transactions (last 2 hours)
    const [recentTransactions] = await db.query(`
      SELECT 
        ft.*,
        u.username,
        u.email as creator_email
      FROM farm_transactions ft
      JOIN users u ON ft.created_by = u.id
      WHERE ft.created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n 
          WHERE n.category = 'transaction' 
          AND JSON_EXTRACT(n.data, '$.transactionId') = ft.id
          AND n.created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        )
      ORDER BY ft.created_at DESC
    `);
    
    for (const transaction of recentTransactions) {
      // Get all staff and admin users
      const [staffAdmins] = await db.query(
        `SELECT id FROM users WHERE role IN ('staff', 'admin') AND status = 'active'`
      );
      
      if (staffAdmins.length > 0) {
        // Create notification
        const [notifResult] = await db.query(`
          INSERT INTO notifications (title, message, type, priority, category, data, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          `New ${transaction.type} Transaction`,
          `${transaction.username} recorded a ${transaction.type.toLowerCase()} of $${transaction.amount} for "${transaction.crop_activity}"`,
          transaction.type === 'Income' ? 'success' : 'warning',
          'medium',
          'transaction',
          JSON.stringify({
            transactionId: transaction.id,
            transactionType: transaction.type,
            amount: transaction.amount,
            createdBy: transaction.created_by,
            cropActivity: transaction.crop_activity,
            creator: transaction.username,
            creatorEmail: transaction.creator_email,
            timestamp: new Date().toISOString()
          }),
          'system'
        ]);
        
        const notificationId = notifResult.insertId;
        
        // Add recipients (all staff/admins)
        const values = staffAdmins.map(u => [notificationId, u.id]);
        if (values.length > 0) {
          await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ?`, [values]);
        }
        
        console.log(`Created transaction notification for ${staffAdmins.length} staff/admins`);
        
        // Create trigger for 24-hour review
        const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.query(`
          INSERT INTO notification_triggers (type, user_id, reference_id, reference_type, scheduled_at, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `, ['transaction_review', transaction.created_by, transaction.id, 'transaction', scheduledAt]);
      }
    }
    
    console.log('✅ Transaction notifications processed');
  } catch (err) {
    console.error('Error processing transaction notifications:', err);
  }
};

// ======================
// Clean up old data
// ======================
export const cleanupOldData = async () => {
  try {
    console.log('🧹 Cleaning up old data...');
    
    // Archive read notifications older than 90 days
    const [deleteResult] = await db.query(`
      DELETE n FROM notifications n
      JOIN notification_recipients nr ON n.id = nr.notification_id
      WHERE n.created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        AND nr.read_at IS NOT NULL
    `);
    
    // Delete old triggers
    const [triggerResult] = await db.query(`
      DELETE FROM notification_triggers 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status IN ('sent', 'failed', 'cancelled')
    `);
    
    console.log(`✅ Cleaned up ${deleteResult.affectedRows} notifications and ${triggerResult.affectedRows} triggers`);
  } catch (err) {
    console.error('Error cleaning up data:', err);
  }
};

// ======================
// Initialize cron jobs
// ======================
export const initNotificationCronJobs = () => {
  // Check calendar notifications every 4 hours
  cron.schedule('0 */4 * * *', checkCalendarNotifications);
  
  // Process transaction notifications every 15 minutes
  cron.schedule('*/15 * * * *', processTransactionNotifications);
  
  // Process pending triggers every 30 minutes
  cron.schedule('*/30 * * * *', processPendingTriggers);
  
  // Clean up old data daily at 3 AM
  cron.schedule('0 3 * * *', cleanupOldData);
  
  console.log('⏰ Notification cron jobs initialized');
};

// ======================
// Manual trigger functions (for API calls)
// ======================
export const createTransactionNotificationManual = async (transactionData) => {
  try {
    const { transactionId, transactionType, amount, createdBy, cropActivity, username } = transactionData;
    
    const [staffAdmins] = await db.query(
      `SELECT id FROM users WHERE role IN ('staff', 'admin') AND status = 'active'`
    );
    
    if (staffAdmins.length === 0) {
      return { success: false, message: "No staff/admin users found" };
    }
    
    const [notifResult] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      `New ${transactionType} Transaction`,
      `${username || 'A user'} recorded a ${transactionType.toLowerCase()} of $${amount} for "${cropActivity}"`,
      transactionType === 'Income' ? 'success' : 'warning',
      'high',
      'transaction',
      JSON.stringify({
        transactionId,
        transactionType,
        amount,
        createdBy,
        cropActivity,
        creator: username,
        timestamp: new Date().toISOString()
      }),
      'system'
    ]);
    
    const notificationId = notifResult.insertId;
    
    const values = staffAdmins.map(u => [notificationId, u.id]);
    await db.query(`INSERT INTO notification_recipients (notification_id, user_id) VALUES ?`, [values]);
    
    return { 
      success: true, 
      message: "Notification sent to staff/admin",
      recipients: staffAdmins.length 
    };
  } catch (err) {
    console.error('Error creating manual transaction notification:', err);
    return { success: false, message: err.message };
  }
};

export const createCalendarNotificationManual = async (userId, activityData) => {
  try {
    const { activityType, activityTitle, activityDate, cropName, daysUntil } = activityData;
    
    let title, message, type, priority;
    
    if (daysUntil === 0) {
      title = `Today: ${activityTitle}`;
      message = `Your ${activityType} activity "${cropName}" is scheduled for today`;
      type = 'info';
      priority = 'high';
    } else if (daysUntil === 1) {
      title = `Tomorrow: ${activityTitle}`;
      message = `Your ${activityType} activity "${cropName}" is scheduled for tomorrow`;
      type = 'info';
      priority = 'medium';
    } else if (daysUntil < 0) {
      title = `Overdue: ${activityTitle}`;
      message = `Your ${activityType} activity "${cropName}" is ${Math.abs(daysUntil)} days overdue`;
      type = 'warning';
      priority = 'high';
    } else {
      return { success: false, message: "Invalid daysUntil value" };
    }
    
    const [notifResult] = await db.query(`
      INSERT INTO notifications (title, message, type, priority, category, data, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
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
        daysUntil,
        timestamp: new Date().toISOString()
      }),
      'system'
    ]);
    
    const notificationId = notifResult.insertId;
    
    await db.query(
      `INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`,
      [notificationId, userId]
    );
    
    return { 
      success: true, 
      message: "Calendar notification created",
      notification: { title, message, type, priority }
    };
  } catch (err) {
    console.error('Error creating manual calendar notification:', err);
    return { success: false, message: err.message };
  }
};

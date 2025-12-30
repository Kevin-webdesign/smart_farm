import express from 'express';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  createBroadcast,
  deleteNotification,
  getNotificationStats,
  createTransactionNotification,
  createCalendarNotification,
  getNotificationTriggers,
  processNotificationTriggers,
  getUserNotificationStats
} from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.midleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User notification routes
router.get('/', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.get('/stats/user', getUserNotificationStats);

// Admin notification routes
router.post('/', authorize(['admin', 'staff']), createNotification);
router.post('/broadcast', authorize(['admin', 'staff']), createBroadcast);
router.delete('/:id', authorize(['admin','staff']), deleteNotification);
router.get('/stats', authorize(['admin', 'staff']), getNotificationStats);

// Transaction notifications (for staff/admin)
router.post('/transaction', authorize(['admin', 'staff']), createTransactionNotification);

// Calendar activity notifications
router.post('/calendar', createCalendarNotification);

// Trigger management (admin only)
router.get('/triggers', authorize(['admin']), getNotificationTriggers);
router.post('/triggers/process', authorize(['admin']), processNotificationTriggers);

export default router;

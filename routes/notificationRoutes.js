import express from 'express';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  createBroadcast,
  deleteNotification,
  getNotificationStats
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

// Admin notification routes
router.post('/', authorize(['admin', 'manager']), createNotification);
router.post('/broadcast', authorize(['admin', 'manager']), createBroadcast);
router.delete('/:id', authorize(['admin']), deleteNotification);
router.get('/stats', authorize(['admin', 'manager']), getNotificationStats);

export default router;
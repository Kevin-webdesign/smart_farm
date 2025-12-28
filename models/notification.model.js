import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success', 'reminder'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['system', 'crop', 'harvest', 'inventory', 'financial', 'delivery', 'general'],
    default: 'general'
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date
    },
    actionTaken: {
      type: Boolean,
      default: false
    }
  }],
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  actionUrl: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
notificationSchema.index({ 'recipients.userId': 1, createdAt: -1 });
notificationSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.model('Notification', notificationSchema);
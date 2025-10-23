import mongoose from 'mongoose';

const userNotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  notificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true,
    index: true 
  },
  
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date
  },
  
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});


// for ensuring a user gets a notification only once
userNotificationSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

// for fetching unread notifications quickly
userNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('UserNotification', userNotificationSchema);
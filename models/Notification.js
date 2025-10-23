import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'PUBLISH_PRODUCT',
      'ORDER_CREATED',
      'ORDER_UPDATED',
      'ORDER_CANCELLED'
    ],
    required: true,
    index: true
  },
  
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Additional data related to the notification (e.g., product ID, order ID)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Expéditeur de la notification
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // for whom the notification is intended
  targetAudience: {
    type: String,
    enum: ['all', 'buyers', 'sellers', 'admins'],
    default: 'all'
  },
  
  // Notification priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
}, {
  timestamps: true
});

export default mongoose.model('Notification', notificationSchema);
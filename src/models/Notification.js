const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['SCREENING_PROCESSED', 'REVIEW_REQUIRED', 'SYSTEM_ALERT'],
      required: true
    },
    screeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Screening'
    },
    isRead: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);

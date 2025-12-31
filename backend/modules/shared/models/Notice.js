// backend/models/Notice.js
const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['general', 'urgent', 'event', 'policy', 'holiday', 'meeting'],
      default: 'general'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    targetAudience: {
      type: String,
      enum: ['all', 'department', 'specific'],
      default: 'all'
    },
    departments: [{
      type: String,
      trim: true
    }],
    specificEmployees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    publishDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    readBy: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
noticeSchema.index({ publishDate: -1 });
noticeSchema.index({ type: 1 });
noticeSchema.index({ priority: 1 });
noticeSchema.index({ isActive: 1 });
noticeSchema.index({ expiryDate: 1 });

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;

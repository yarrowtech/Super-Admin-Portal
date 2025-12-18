// backend/models/Complaint.js
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complainant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Complainant is required']
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['workplace', 'harassment', 'discrimination', 'safety', 'equipment', 'management', 'other'],
      required: [true, 'Category is required']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'closed', 'escalated'],
      default: 'pending'
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    againstPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    solution: {
      type: String,
      trim: true
    },
    actionTaken: {
      type: String,
      trim: true
    },
    resolvedDate: {
      type: Date
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    comments: [{
      commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comment: String,
      commentedAt: {
        type: Date,
        default: Date.now
      }
    }],
    confidential: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
complaintSchema.index({ complainant: 1, createdAt: -1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ assignedTo: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;

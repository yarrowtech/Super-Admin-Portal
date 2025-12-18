// backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
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
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned employee is required']
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigner is required']
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'review', 'completed', 'cancelled'],
      default: 'pending'
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    completedDate: {
      type: Date
    },
    estimatedHours: {
      type: Number,
      min: 0
    },
    actualHours: {
      type: Number,
      min: 0
    },
    tags: [{
      type: String,
      trim: true
    }],
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
    dependencies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    isOverdue: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Check if task is overdue
taskSchema.pre('save', function (next) {
  if (this.dueDate && this.status !== 'completed' && this.status !== 'cancelled') {
    this.isOverdue = new Date() > this.dueDate;
  } else {
    this.isOverdue = false;
  }
  next();
});

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;

const mongoose = require('mongoose');

const staffWorkReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    reportDate: {
      type: Date,
      required: [true, 'Report date is required'],
      default: Date.now
    },
    reportType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'project'],
      default: 'daily'
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
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
    tasksCompleted: [{
      task: String,
      hoursSpent: Number,
      status: {
        type: String,
        enum: ['completed', 'in-progress', 'pending'],
        default: 'completed'
      }
    }],
    challenges: {
      type: String,
      trim: true
    },
    nextDayPlan: {
      type: String,
      trim: true
    },
    totalHours: {
      type: Number,
      default: 0,
      min: 0
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    status: {
      type: String,
      enum: ['submitted', 'reviewed', 'approved', 'rejected'],
      default: 'submitted'
    },
    taskStatus: {
      type: String,
      enum: ['pending', 'in-progress', 'review', 'completed', 'cancelled']
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedDate: {
      type: Date
    },
    feedback: {
      type: String,
      trim: true
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

staffWorkReportSchema.pre('save', function (next) {
  if (this.tasksCompleted && this.tasksCompleted.length > 0) {
    this.totalHours = this.tasksCompleted.reduce((total, task) => total + (task.hoursSpent || 0), 0);
  }
  next();
});

staffWorkReportSchema.index({ employee: 1, reportDate: -1 });
staffWorkReportSchema.index({ reportType: 1 });
staffWorkReportSchema.index({ status: 1 });
staffWorkReportSchema.index({ project: 1 });

module.exports = mongoose.models.WorkReport || mongoose.model('WorkReport', staffWorkReportSchema);

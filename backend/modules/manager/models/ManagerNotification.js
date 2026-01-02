const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema(
  {
    departments: [{ type: String, trim: true }],
    managerNames: [{ type: String, trim: true }],
    managerEmails: [{ type: String, trim: true }],
    managerIds: [{ type: String, trim: true }],
  },
  { _id: false }
);

const defaultTarget = () => ({
  departments: [],
  managerNames: [],
  managerEmails: [],
  managerIds: [],
});

const managerNotificationSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    managerDepartment: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      default: 'task_completed',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    target: {
      type: targetSchema,
      default: defaultTarget,
    },
    sourceTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    sourceEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

managerNotificationSchema.index({ manager: 1, read: 1, createdAt: -1 });
managerNotificationSchema.index({ sourceTask: 1 });
managerNotificationSchema.index({ type: 1, createdAt: -1 });

const ManagerNotification = mongoose.model('ManagerNotification', managerNotificationSchema);

module.exports = ManagerNotification;

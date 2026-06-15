const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    projectCode: {
      type: String,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
    },
    chatThread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    members: [
      {
        employee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          trim: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification',
      },
    ],
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ manager: 1, createdAt: -1 });
teamSchema.index({ name: 1, manager: 1 });

module.exports = mongoose.models.Team || mongoose.model('Team', teamSchema);

const mongoose = require('mongoose');

const projectTeamSchema = new mongoose.Schema(
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
      ref: 'ChatThread',
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
        ref: 'Notice',
      },
    ],
  },
  {
    timestamps: true,
  }
);

projectTeamSchema.index({ manager: 1, createdAt: -1 });
projectTeamSchema.index({ name: 1, manager: 1 });

const ProjectTeam = mongoose.model('ProjectTeam', projectTeamSchema);

module.exports = ProjectTeam;

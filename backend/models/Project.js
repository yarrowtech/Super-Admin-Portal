// backend/models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    projectCode: {
      type: String,
      unique: true,
      trim: true
    },
    client: {
      name: String,
      email: String,
      phone: String,
      company: String
    },
    status: {
      type: String,
      enum: ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'],
      default: 'planning'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date
    },
    deadline: {
      type: Date
    },
    budget: {
      estimated: {
        type: Number,
        min: 0
      },
      actual: {
        type: Number,
        min: 0
      }
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project manager is required']
    },
    teamMembers: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: String,
      assignedDate: {
        type: Date,
        default: Date.now
      }
    }],
    technologies: [{
      type: String,
      trim: true
    }],
    milestones: [{
      title: String,
      description: String,
      deadline: Date,
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'delayed'],
        default: 'pending'
      },
      completedDate: Date
    }],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Auto-generate project code if not provided
projectSchema.pre('save', function (next) {
  if (!this.projectCode) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.projectCode = `PRJ${year}${month}${random}`;
  }
  next();
});

// Indexes for better query performance
projectSchema.index({ projectCode: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ projectManager: 1 });
projectSchema.index({ startDate: -1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;

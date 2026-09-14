const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    normalizedName: {
      type: String,
      trim: true,
      lowercase: true,
      select: false
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    projectCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    logo: {
      url: String,
      storageKey: String,
      storageProvider: String
    },
    themeColor: {
      type: String,
      trim: true,
      match: [/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'themeColor must be a hex color like #0f766e']
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
    },
    archivedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const normalizeProjectName = (value) => String(value || '').trim().toLocaleLowerCase('en-US');

projectSchema.pre('validate', function (next) {
  this.name = String(this.name || '').trim();
  this.normalizedName = normalizeProjectName(this.name);
  if (this.projectCode) this.projectCode = String(this.projectCode).trim().toUpperCase();
  if (!this.projectCode) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.projectCode = `PRJ${year}${month}${random}`;
  }
  next();
});

projectSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate() || {};
  const target = update.$set || update;
  if (target.name !== undefined) {
    target.name = String(target.name || '').trim();
    target.normalizedName = normalizeProjectName(target.name);
  }
  if (target.projectCode !== undefined) target.projectCode = String(target.projectCode || '').trim().toUpperCase();
  next();
});

// Kept non-unique until scripts/auditProjectIntegrity.js confirms existing data is clean.
projectSchema.index({ normalizedName: 1 });
projectSchema.index({ projectCode: 1 }, { unique: true, partialFilterExpression: { projectCode: { $type: 'string' } } });
projectSchema.index({ status: 1 });
projectSchema.index({ projectManager: 1 });
projectSchema.index({ startDate: -1 });

projectSchema.statics.normalizeName = normalizeProjectName;

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);

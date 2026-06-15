const mongoose = require('mongoose');

const appraisalCycleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cycleType: {
      type: String,
      enum: ['monthly', 'quarterly', 'half-yearly', 'yearly', 'custom'],
      default: 'quarterly',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reviewDeadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'archived'],
      default: 'draft',
      index: true,
    },
    eligibleDepartments: [{
      type: String,
      trim: true,
    }],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

appraisalCycleSchema.index({ startDate: 1, endDate: 1 });

module.exports =
  mongoose.models.PerformanceSystemAppraisalCycle ||
  mongoose.model('PerformanceSystemAppraisalCycle', appraisalCycleSchema);

// backend/models/AppraisalCycle.js
const mongoose = require('mongoose');

const appraisalCycleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cycle name is required'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    status: {
      type: String,
      enum: ['planned', 'active', 'closed'],
      default: 'planned'
    }
  },
  { timestamps: true }
);

appraisalCycleSchema.index({ status: 1 });
appraisalCycleSchema.index({ startDate: -1 });

const AppraisalCycle = mongoose.model('AppraisalCycle', appraisalCycleSchema);

module.exports = AppraisalCycle;

// backend/models/Interview.js
const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Applicant',
      required: [true, 'Applicant is required']
    },
    stage: {
      type: String,
      required: [true, 'Interview stage is required'],
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Interview date is required']
    },
    mode: {
      type: String,
      enum: ['in-person', 'virtual', 'phone'],
      default: 'in-person'
    },
    panel: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

interviewSchema.index({ applicant: 1 });
interviewSchema.index({ scheduledAt: -1 });
interviewSchema.index({ status: 1 });

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;

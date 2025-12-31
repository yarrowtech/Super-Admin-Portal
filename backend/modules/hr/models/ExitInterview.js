// backend/models/ExitInterview.js
const mongoose = require('mongoose');

const exitInterviewSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    interviewDate: {
      type: Date,
      required: [true, 'Interview date is required']
    },
    reasonForLeaving: {
      type: String,
      trim: true
    },
    feedback: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    }
  },
  { timestamps: true }
);

exitInterviewSchema.index({ employee: 1 });
exitInterviewSchema.index({ interviewDate: -1 });
exitInterviewSchema.index({ status: 1 });

const ExitInterview = mongoose.model('ExitInterview', exitInterviewSchema);

module.exports = ExitInterview;

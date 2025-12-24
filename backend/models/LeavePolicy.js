// backend/models/LeavePolicy.js
const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      trim: true
    },
    leaveType: {
      type: String,
      required: [true, 'Leave type is required'],
      trim: true
    },
    daysPerYear: {
      type: Number,
      required: [true, 'Days per year is required'],
      min: 0
    },
    carryForward: {
      type: Boolean,
      default: false
    },
    maxCarryForward: {
      type: Number,
      min: 0,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

leavePolicySchema.index({ leaveType: 1 });
leavePolicySchema.index({ isActive: 1 });

const LeavePolicy = mongoose.model('LeavePolicy', leavePolicySchema);

module.exports = LeavePolicy;

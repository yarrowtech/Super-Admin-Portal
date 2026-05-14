const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    clDays: {
      type: Number,
      default: 12,
      min: 0,
    },
    plDays: {
      type: Number,
      default: 12,
      min: 0,
    },
    sickDays: {
      type: Number,
      default: 6,
      min: 0,
    },
    yearlyPaidLeaveLimit: {
      type: Number,
      default: 30,
      min: 0,
    },
    plCarryForwardLimit: {
      type: Number,
      default: 12,
      min: 0,
    },
    excludeWeekends: {
      type: Boolean,
      default: true,
    },
    excludeHolidays: {
      type: Boolean,
      default: false,
    },
    sandwichRuleEnabled: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema);

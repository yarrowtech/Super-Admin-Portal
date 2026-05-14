const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    yearlyLeaveQuota: {
      type: Number,
      default: 30,
      min: 0,
    },
    totalApprovedLeaves: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingLeaveBalance: {
      type: Number,
      default: 30,
      min: 0,
    },
    leaveTypeWiseBalance: {
      casual: {
        allocated: { type: Number, default: 12 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 12 },
      },
      annual: {
        allocated: { type: Number, default: 12 },
        carriedForward: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 12 },
      },
      sick: {
        allocated: { type: Number, default: 6 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 6 },
      },
      emergency: {
        allocated: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
      },
      half_day: {
        allocated: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
      },
      unpaid: {
        allocated: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
      },
      work_from_home: {
        allocated: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
      },
    },
    leaveUsageHistory: [
      {
        leave: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Leave',
        },
        leaveType: String,
        days: Number,
        action: {
          type: String,
          enum: ['approved', 'cancelled', 'reverted'],
        },
        recordedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

module.exports = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);

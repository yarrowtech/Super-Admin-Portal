const mongoose = require('mongoose');

const leaveApprovalLogSchema = new mongoose.Schema(
  {
    leave: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      enum: ['applied', 'manager-approved', 'manager-rejected', 'hr-approved', 'hr-rejected', 'cancelled'],
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.LeaveApprovalLog || mongoose.model('LeaveApprovalLog', leaveApprovalLogSchema);

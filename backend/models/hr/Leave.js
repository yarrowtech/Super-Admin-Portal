const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    leaveType: {
      type: String,
      enum: ['sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other', 'half_day', 'emergency', 'work_from_home'],
      required: [true, 'Leave type is required']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5
    },
    deductedDays: {
      type: Number,
      default: 0,
      min: 0
    },
    year: {
      type: Number,
      index: true
    },
    isHalfDay: {
      type: Boolean,
      default: false
    },
    halfDaySession: {
      type: String,
      enum: ['first_half', 'second_half', null],
      default: null
    },
    isPaidLeave: {
      type: Boolean,
      default: true
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'manager-approved', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    managerApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'bypassed'],
      default: 'pending'
    },
    managerApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    managerApprovedDate: {
      type: Date
    },
    managerRejectionReason: {
      type: String,
      trim: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedDate: {
      type: Date
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    handoverNotes: {
      type: String,
      trim: true
    },
    emergencyContact: {
      name: String,
      phone: String
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    attendanceSyncStatus: {
      type: String,
      enum: ['pending', 'synced', 'skipped', 'reverted'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

leaveSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

leaveSchema.index({ employee: 1, startDate: -1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ managerApprovalStatus: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);

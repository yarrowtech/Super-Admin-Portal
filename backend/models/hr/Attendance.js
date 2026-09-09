const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in time is required']
    },
    checkOut: {
      type: Date
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
      default: 'present'
    },
    workHours: {
      type: Number,
      default: 0,
      min: 0
    },
    location: {
      type: String,
      enum: ['office', 'remote', 'field'],
      default: 'office'
    },
    notes: {
      type: String,
      trim: true
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

attendanceSchema.pre('validate', function (next) {
  if (this.date && !Number.isNaN(this.date.getTime())) this.date.setHours(0, 0, 0, 0);
  if (this.checkIn && this.checkOut && this.checkOut < this.checkIn) {
    this.invalidate('checkOut', 'Check-out must be on or after check-in');
  }
  this.workHours = this.checkIn && this.checkOut
    ? Math.max(0, Math.round((this.checkOut - this.checkIn) / 3600000 * 100) / 100)
    : 0;
  next();
});

attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

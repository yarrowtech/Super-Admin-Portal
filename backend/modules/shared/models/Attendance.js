// backend/models/Attendance.js
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
    timestamps: true
  }
);

// Calculate work hours before saving
attendanceSchema.pre('save', function (next) {
  if (this.checkIn && this.checkOut) {
    const hours = (this.checkOut - this.checkIn) / (1000 * 60 * 60);
    if (!this.isModified('workHours')) {
      this.workHours = Math.round(hours * 100) / 100;
    }
  }
  next();
});

// Indexes for better query performance
attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ date: -1 });

// Compound unique index to prevent duplicate attendance records
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
